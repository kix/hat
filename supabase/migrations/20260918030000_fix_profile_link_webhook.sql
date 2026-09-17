-- =====================================================================
-- 15. FIX PROFILE LINKING WEBHOOK, REALTIME & TELEGRAM UNIQUE CONFLICT
-- =====================================================================

-- 1. Ensure telegram_users and telegram_notifications are in supabase_realtime publication
do $$
begin
    alter publication supabase_realtime add table public.telegram_users;
exception when others then
    -- ignore if already added or publication does not exist
end;
$$;

do $$
begin
    alter publication supabase_realtime add table public.telegram_notifications;
exception when others then
    -- ignore if already added or publication does not exist
end;
$$;

-- 2. Enhanced link_telegram_user with multi-source old user lookup and safe notification insertion
create or replace function public.link_telegram_user(
  p_new_user_id uuid,
  p_telegram_id text,
  p_full_name text,
  p_avatar_url text,
  p_username text default null
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old_user_id uuid;
  v_clean_user  text;
begin
  v_clean_user := lower(trim(replace(coalesce(p_username, ''), '@', '')));

  -- 1. Find existing user with same telegram_id across auth.users, telegram_users, telegram_notifications
  select id into v_old_user_id 
  from auth.users 
  where raw_user_meta_data->>'telegram_id' = p_telegram_id
    and id != p_new_user_id
  limit 1;

  if v_old_user_id is null then
    select user_id into v_old_user_id
    from public.telegram_users
    where telegram_id = p_telegram_id
      and user_id is not null
      and user_id != p_new_user_id
    limit 1;
  end if;

  if v_old_user_id is null then
    select user_id into v_old_user_id
    from public.telegram_notifications
    where telegram_id = p_telegram_id
      and user_id != p_new_user_id
    limit 1;
  end if;
    
  if v_old_user_id is not null then
    update public.game_participants set user_id = p_new_user_id where user_id = v_old_user_id;
    update public.game_summaries set user_id = p_new_user_id where user_id = v_old_user_id;
    update public.word_solution_times set user_id = p_new_user_id where user_id = v_old_user_id;
    update public.rooms set host_id = p_new_user_id where host_id = v_old_user_id;
    
    delete from public.user_states where user_id = p_new_user_id;
    update public.user_states set user_id = p_new_user_id where user_id = v_old_user_id;
    
    update public.games g
    set history_data = (
      select jsonb_agg(
        case
          when elem->>'describerId' = v_old_user_id::text and elem->>'guesserId' = v_old_user_id::text
            then elem || jsonb_build_object('describerId', p_new_user_id::text, 'guesserId', p_new_user_id::text)
          when elem->>'describerId' = v_old_user_id::text
            then elem || jsonb_build_object('describerId', p_new_user_id::text)
          when elem->>'guesserId' = v_old_user_id::text
            then elem || jsonb_build_object('guesserId', p_new_user_id::text)
          else elem
        end
      )
      from jsonb_array_elements(g.history_data) as elem
    )
    where g.id in (
      select game_id from public.game_participants where user_id = p_new_user_id
    );

    delete from auth.identities where user_id = v_old_user_id;
    delete from auth.users where id = v_old_user_id;
  end if;

  -- 2. Update user metadata
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'full_name', p_full_name,
        'avatar_url', p_avatar_url,
        'telegram_id', p_telegram_id,
        'username', v_clean_user,
        'provider', 'telegram'
      ),
      updated_at = now()
  where id = p_new_user_id;

  -- 3. Notifications (clean up any conflicting rows first to avoid unique key violation)
  delete from public.telegram_notifications 
  where user_id = p_new_user_id or telegram_id = p_telegram_id;

  insert into public.telegram_notifications (user_id, telegram_id, enabled)
  values (p_new_user_id, p_telegram_id, true);

  -- 4. Sync telegram_users
  insert into public.telegram_users (telegram_id, username, full_name, avatar_url, user_id, updated_at)
  values (p_telegram_id, v_clean_user, p_full_name, p_avatar_url, p_new_user_id, now())
  on conflict (telegram_id)
  do update set
    username = case when v_clean_user is not null and v_clean_user != '' then v_clean_user else public.telegram_users.username end,
    full_name = coalesce(excluded.full_name, public.telegram_users.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.telegram_users.avatar_url),
    user_id = excluded.user_id,
    updated_at = now();
end;
$$;

grant execute on function public.link_telegram_user(uuid, text, text, text, text) to anon, authenticated, service_role;

-- 3. Update handle_telegram_webhook to pass v_username to link_telegram_user
create or replace function public.handle_telegram_webhook(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_token          text;
    v_app_url        text;
    v_msg            jsonb;
    v_cb             jsonb;
    v_chat_id        text;
    v_user_tg_id     text;
    v_first_name     text;
    v_last_name      text;
    v_username       text;
    v_full_name      text;
    v_text           text;
    v_reply_text     text;
    v_keyboard       jsonb;
    v_http_res       record;
    v_cb_data        text;
    v_cb_id          text;
    v_verif_id       uuid;
    v_action_type    text;
    v_name_choice    text;
    v_chosen_name    text;
    v_tg_user_id     uuid;
    v_target_user_id uuid;
    v_v_rec          record;
begin
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_token is null then
        return jsonb_build_object('ok', false, 'error', 'telegram_bot_token not configured in Vault');
    end if;

    select coalesce(value, 'https://kix.github.io/hat/') into v_app_url
    from public.app_settings
    where key = 'app_base_url';
    v_app_url := coalesce(v_app_url, 'https://kix.github.io/hat/');

    -- Handle Callback Query
    v_cb := p_payload->'callback_query';
    if v_cb is not null then
        v_cb_id      := v_cb->>'id';
        v_cb_data    := v_cb->>'data';
        v_chat_id    := v_cb->'message'->'chat'->>'id';
        v_user_tg_id := v_cb->'from'->>'id';
        v_first_name := coalesce(v_cb->'from'->>'first_name', '');
        v_last_name  := coalesce(v_cb->'from'->>'last_name', '');
        v_username   := v_cb->'from'->>'username';
        v_full_name  := trim(v_first_name || ' ' || v_last_name);
        if v_full_name = '' then v_full_name := coalesce(v_username, 'Игрок'); end if;

        if v_user_tg_id is not null then
            insert into public.telegram_users (telegram_id, username, first_name, last_name, full_name, updated_at)
            values (v_user_tg_id, lower(v_username), v_first_name, v_last_name, v_full_name, now())
            on conflict (telegram_id)
            do update set
                username = coalesce(excluded.username, public.telegram_users.username),
                first_name = coalesce(excluded.first_name, public.telegram_users.first_name),
                last_name = coalesce(excluded.last_name, public.telegram_users.last_name),
                full_name = coalesce(excluded.full_name, public.telegram_users.full_name),
                updated_at = now();
        end if;

        -- Player verification callback (pv_c / pv_r)
        if v_cb_data like 'pv_c:%' or v_cb_data like 'pv_r:%' then
            v_action_type := split_part(v_cb_data, ':', 1);
            v_verif_id    := split_part(v_cb_data, ':', 2)::uuid;
            v_name_choice := split_part(v_cb_data, ':', 3);

            select user_id into v_tg_user_id
            from public.telegram_users
            where telegram_id = v_user_tg_id;

            if v_action_type = 'pv_c' then
                if v_name_choice = 'user' and v_username is not null and v_username != '' then
                    v_chosen_name := '@' || v_username;
                else
                    v_chosen_name := v_full_name;
                end if;

                update public.local_player_verifications
                set status = 'confirmed',
                    chosen_name = v_chosen_name,
                    target_telegram_id = v_user_tg_id,
                    target_user_id = coalesce(v_tg_user_id, target_user_id),
                    updated_at = now()
                where id = v_verif_id;

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/answerCallbackQuery',
                    jsonb_build_object('callback_query_id', v_cb_id, 'text', '✅ Участие подтверждено: ' || v_chosen_name)::text,
                    'application/json'
                );

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/editMessageText',
                    jsonb_build_object(
                        'chat_id', v_chat_id,
                        'message_id', (v_cb->'message'->>'message_id')::bigint,
                        'text', '🎩 <b>Участие в игре «Шляпа» подтверждено!</b>' || E'\n\n'
                             || 'Ваше имя в игре: <b>' || v_chosen_name || '</b>' || E'\n'
                             || 'Все набранные очки и опыт пойдут в ваш профиль.',
                        'parse_mode', 'HTML'
                    )::text,
                    'application/json'
                );
            else
                update public.local_player_verifications
                set status = 'rejected',
                    updated_at = now()
                where id = v_verif_id;

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/answerCallbackQuery',
                    jsonb_build_object('callback_query_id', v_cb_id, 'text', '❌ Приглашение отклонено')::text,
                    'application/json'
                );

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/editMessageText',
                    jsonb_build_object(
                        'chat_id', v_chat_id,
                        'message_id', (v_cb->'message'->>'message_id')::bigint,
                        'text', '❌ <b>Приглашение в игру отклонено.</b>',
                        'parse_mode', 'HTML'
                    )::text,
                    'application/json'
                );
            end if;

            return jsonb_build_object('ok', true, 'action', 'callback_processed');

        -- Profile linking callback (pl_c / pl_r)
        elsif v_cb_data like 'pl_c:%' or v_cb_data like 'pl_r:%' then
            v_action_type := split_part(v_cb_data, ':', 1);
            v_target_user_id := split_part(v_cb_data, ':', 2)::uuid;

            if v_action_type = 'pl_c' and v_target_user_id is not null then
                perform public.link_telegram_user(
                    v_target_user_id,
                    v_user_tg_id,
                    v_full_name,
                    '',
                    v_username
                );

                update public.telegram_users
                set user_id = v_target_user_id, updated_at = now()
                where telegram_id = v_user_tg_id;

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/answerCallbackQuery',
                    jsonb_build_object('callback_query_id', v_cb_id, 'text', '✅ Профиль Telegram успешно привязан!')::text,
                    'application/json'
                );

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/editMessageText',
                    jsonb_build_object(
                        'chat_id', v_chat_id,
                        'message_id', (v_cb->'message'->>'message_id')::bigint,
                        'text', '🎩 <b>Telegram-профиль успешно привязан!</b>' || E'\n\n'
                             || 'Имя: <b>' || v_full_name || '</b>' || E'\n'
                             || (case when v_username is not null and v_username != '' then 'Юзернейм: <b>@' || v_username || '</b>' || E'\n' else '' end)
                             || 'Теперь статистика и лидерборд синхронизированы с вашим браузером на компьютере.',
                        'parse_mode', 'HTML'
                    )::text,
                    'application/json'
                );
            else
                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/answerCallbackQuery',
                    jsonb_build_object('callback_query_id', v_cb_id, 'text', '❌ Привязка отклонена')::text,
                    'application/json'
                );

                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/editMessageText',
                    jsonb_build_object(
                        'chat_id', v_chat_id,
                        'message_id', (v_cb->'message'->>'message_id')::bigint,
                        'text', '❌ <b>Привязка профиля отклонена.</b>',
                        'parse_mode', 'HTML'
                    )::text,
                    'application/json'
                );
            end if;

            return jsonb_build_object('ok', true, 'action', 'profile_link_callback_processed');
        end if;

        return jsonb_build_object('ok', true, 'action', 'cb_ignored');
    end if;

    -- Handle standard Message
    v_msg := p_payload->'message';
    if v_msg is null then
        return jsonb_build_object('ok', true, 'info', 'No message in update');
    end if;

    v_chat_id    := v_msg->'chat'->>'id';
    v_user_tg_id := v_msg->'from'->>'id';
    v_first_name := coalesce(v_msg->'from'->>'first_name', '');
    v_last_name  := coalesce(v_msg->'from'->>'last_name', '');
    v_username   := v_msg->'from'->>'username';
    v_full_name  := trim(v_first_name || ' ' || v_last_name);
    if v_full_name = '' then v_full_name := coalesce(v_username, 'друг'); end if;
    v_text       := trim(coalesce(v_msg->>'text', ''));

    if v_chat_id is null then
        return jsonb_build_object('ok', true, 'info', 'No chat_id');
    end if;

    -- Track user in telegram_users
    if v_user_tg_id is not null then
        insert into public.telegram_users (telegram_id, username, first_name, last_name, full_name, updated_at)
        values (v_user_tg_id, lower(v_username), v_first_name, v_last_name, v_full_name, now())
        on conflict (telegram_id)
        do update set
            username = coalesce(excluded.username, public.telegram_users.username),
            first_name = coalesce(excluded.first_name, public.telegram_users.first_name),
            last_name = coalesce(excluded.last_name, public.telegram_users.last_name),
            full_name = coalesce(excluded.full_name, public.telegram_users.full_name),
            updated_at = now();

        update public.telegram_notifications
        set last_status = 'bot_active',
            updated_at = now()
        where telegram_id = v_user_tg_id;
    end if;

    -- Deep-link 1: /start link_<uuid> (Desktop account linking)
    if v_text ~* '^/start\s+link_[a-f0-9\-]+' then
        v_target_user_id := replace(substring(v_text from '^/start\s+link_([a-f0-9\-]+)'), 'link_', '')::uuid;
        if v_target_user_id is not null then
            perform public.link_telegram_user(
                v_target_user_id,
                v_user_tg_id,
                v_full_name,
                '',
                v_username
            );

            update public.telegram_users
            set user_id = v_target_user_id, updated_at = now()
            where telegram_id = v_user_tg_id;

            v_reply_text := '🎩 <b>Ваш Telegram успешно привязан к профилю «Шляпы»!</b>' || E'\n\n'
                || 'Имя: <b>' || v_full_name || '</b>' || E'\n'
                || (case when v_username is not null and v_username != '' then 'Юзернейм: <b>@' || v_username || '</b>' || E'\n' else '' end)
                || 'Теперь все ваши партии, опыт (XP) и рейтинг в таблице лидеров синхронизированы!';

            v_keyboard := jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', v_app_url))
                    )
                )
            );

            select status, content into v_http_res
            from http_post(
                'https://api.telegram.org/bot' || v_token || '/sendMessage',
                jsonb_build_object(
                    'chat_id', v_chat_id,
                    'text', v_reply_text,
                    'parse_mode', 'HTML',
                    'reply_markup', v_keyboard,
                    'disable_web_page_preview', false
                )::text,
                'application/json'
            );

            return jsonb_build_object('ok', true, 'action', 'account_linked', 'user_id', v_target_user_id);
        end if;
    end if;

    -- Deep-link 2: /start join_<uuid> (Local player verification)
    if v_text ~* '^/start\s+join_[a-f0-9\-]+' then
        v_verif_id := replace(substring(v_text from '^/start\s+join_([a-f0-9\-]+)'), 'join_', '')::uuid;

        select * into v_v_rec
        from public.local_player_verifications
        where id = v_verif_id;

        if v_v_rec.id is not null and v_v_rec.status = 'pending' then
            v_reply_text := '🎩 <b>Приглашение в игру «Шляпа»!</b>' || E'\n\n'
                || 'Игрок <b>' || replace(replace(replace(coalesce(v_v_rec.host_name, 'Хост'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b> добавляет вас в команду локальной партии.' || E'\n\n'
                || 'Подтвердите участие и выберите имя для игры:';

            v_keyboard := jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object(
                            'text', '✨ Имя: ' || v_full_name,
                            'callback_data', 'pv_c:' || v_verif_id || ':name'
                        )
                    ),
                    case when v_username is not null and v_username != '' then
                        jsonb_build_array(
                            jsonb_build_object(
                                'text', '👤 Юзернейм: @' || v_username,
                                'callback_data', 'pv_c:' || v_verif_id || ':user'
                            )
                        )
                    else
                        jsonb_build_array(
                            jsonb_build_object(
                                'text', '✨ Подтвердить',
                                'callback_data', 'pv_c:' || v_verif_id || ':name'
                            )
                        )
                    end,
                    jsonb_build_array(
                        jsonb_build_object(
                            'text', '❌ Отклонить',
                            'callback_data', 'pv_r:' || v_verif_id
                        )
                    )
                )
            );

            select status, content into v_http_res
            from http_post(
                'https://api.telegram.org/bot' || v_token || '/sendMessage',
                jsonb_build_object(
                    'chat_id', v_chat_id,
                    'text', v_reply_text,
                    'parse_mode', 'HTML',
                    'reply_markup', v_keyboard,
                    'disable_web_page_preview', true
                )::text,
                'application/json'
            );

            return jsonb_build_object('ok', true, 'action', 'verification_prompt_sent', 'verification_id', v_verif_id);
        end if;
    end if;

    -- Standard /start command
    if v_text = '/start' or v_text ~* '^/start\s*' then
        v_reply_text := '🎩 <b>Привет, ' || replace(replace(replace(v_full_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '! Добро пожаловать в игру «Шляпа»!</b>' || E'\n\n'
            || 'Классическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!' || E'\n\n'
            || '👇 Нажмите кнопку ниже, чтобы запустить игру прямо сейчас:';

        v_keyboard := jsonb_build_object(
            'inline_keyboard', jsonb_build_array(
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '🎮 Играть в «Шляпу»',
                        'web_app', jsonb_build_object('url', v_app_url)
                    )
                ),
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '🌐 Открыть в браузере',
                        'url', v_app_url
                    )
                )
            )
        );

        select status, content into v_http_res
        from http_post(
            'https://api.telegram.org/bot' || v_token || '/sendMessage',
            jsonb_build_object(
                'chat_id', v_chat_id,
                'text', v_reply_text,
                'parse_mode', 'HTML',
                'reply_markup', v_keyboard,
                'disable_web_page_preview', false
            )::text,
            'application/json'
        );

        return jsonb_build_object('ok', true, 'action', 'start_welcome_sent');
    end if;

    -- /hardest command
    if v_text = '/hardest' or v_text ~* '^/hardest\s*' then
        v_reply_text := public.build_hardest_words_digest(10, 7);

        v_keyboard := jsonb_build_object(
            'inline_keyboard', jsonb_build_array(
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '🎮 Играть в «Шляпу»',
                        'web_app', jsonb_build_object('url', v_app_url)
                    )
                )
            )
        );

        select status, content into v_http_res
        from http_post(
            'https://api.telegram.org/bot' || v_token || '/sendMessage',
            jsonb_build_object(
                'chat_id', v_chat_id,
                'text', v_reply_text,
                'parse_mode', 'HTML',
                'reply_markup', v_keyboard,
                'disable_web_page_preview', false
            )::text,
            'application/json'
        );

        return jsonb_build_object('ok', true, 'action', 'hardest_digest_sent');
    end if;

    return jsonb_build_object('ok', true, 'action', 'message_ignored');
end;
$$;

grant execute on function public.handle_telegram_webhook(jsonb) to anon, authenticated, service_role;
