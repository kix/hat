-- =====================================================================
-- 14. SYNC EXISTING TELEGRAM USERS & AUTOMATIC WEBHOOK SETUP
-- =====================================================================

-- 1. Function to set Telegram Webhook automatically
create or replace function public.setup_telegram_webhook(p_webhook_url text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_token   text;
    v_target  text;
    v_http_res record;
begin
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_token is null then
        return jsonb_build_object('ok', false, 'error', 'No bot token in Vault');
    end if;

    v_target := coalesce(p_webhook_url, 'https://kioqswvdyarkbqdgtldx.supabase.co/functions/v1/telegram-bot');

    select status, content into v_http_res
    from http_post(
        'https://api.telegram.org/bot' || v_token || '/setWebhook',
        jsonb_build_object(
            'url', v_target,
            'allowed_updates', jsonb_build_array('message', 'callback_query')
        )::text,
        'application/json'
    );

    return jsonb_build_object('ok', true, 'status', v_http_res.status, 'content', v_http_res.content);
end;
$$;

grant execute on function public.setup_telegram_webhook(text) to anon, authenticated, service_role;

-- Automatically run webhook setup now
select public.setup_telegram_webhook();

-- 2. Update link_telegram_user to accept username and keep telegram_users updated
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

  -- 1. Find existing user with same telegram_id
  select id into v_old_user_id 
  from auth.users 
  where raw_user_meta_data->>'telegram_id' = p_telegram_id
    and id != p_new_user_id;
    
  if v_old_user_id is not null then
    update public.game_participants set user_id = p_new_user_id where user_id = v_old_user_id;
    update public.game_summaries set user_id = p_new_user_id where user_id = v_old_user_id;
    update public.word_solution_times set user_id = p_new_user_id where user_id = v_old_user_id;
    update public.rooms set host_id = p_new_user_id where host_id = v_old_user_id;
    
    delete from public.telegram_notifications where user_id = p_new_user_id;
    update public.telegram_notifications set user_id = p_new_user_id where user_id = v_old_user_id;
    
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

  -- 3. Notifications
  insert into public.telegram_notifications (user_id, telegram_id, enabled)
  values (p_new_user_id, p_telegram_id, true)
  on conflict (user_id) 
  do update set telegram_id = excluded.telegram_id;

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

-- 3. Backfill telegram_users from auth.users & telegram_notifications
insert into public.telegram_users (telegram_id, username, full_name, avatar_url, user_id, updated_at)
select distinct on (coalesce(u.raw_user_meta_data->>'telegram_id', n.telegram_id))
    coalesce(u.raw_user_meta_data->>'telegram_id', n.telegram_id) as telegram_id,
    lower(coalesce(u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'user_name', u.raw_user_meta_data->>'preferred_username')),
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Игрок'),
    coalesce(u.raw_user_meta_data->>'avatar_url', ''),
    u.id as user_id,
    now()
from auth.users u
left join public.telegram_notifications n on n.user_id = u.id
where (u.raw_user_meta_data->>'telegram_id' is not null and u.raw_user_meta_data->>'telegram_id' != '')
   or (n.telegram_id is not null and n.telegram_id != '')
order by coalesce(u.raw_user_meta_data->>'telegram_id', n.telegram_id), u.created_at desc
on conflict (telegram_id) do update set
    username = coalesce(excluded.username, public.telegram_users.username),
    full_name = coalesce(excluded.full_name, public.telegram_users.full_name),
    user_id = coalesce(excluded.user_id, public.telegram_users.user_id),
    updated_at = now();

-- 4. Smarter request_telegram_player_verification with auth.users fallback
create or replace function public.request_telegram_player_verification(
    p_username text,
    p_host_name text default 'Игрок'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_clean_username text;
    v_token          text;
    v_verification_id uuid;
    v_tg_user        record;
    v_keyboard       jsonb;
    v_message_text   text;
    v_http_res       record;
    v_name_option1   text;
    v_name_option2   text;
    v_target_tg_id   text;
    v_target_uid     uuid;
    v_full_name      text;
begin
    v_clean_username := lower(trim(replace(p_username, '@', '')));
    if v_clean_username = '' then
        return jsonb_build_object('ok', false, 'error', 'Invalid username');
    end if;

    -- 1. Try telegram_users
    select telegram_id, user_id, full_name into v_target_tg_id, v_target_uid, v_full_name
    from public.telegram_users
    where lower(username) = v_clean_username
    limit 1;

    -- 2. Fallback to auth.users if not found in telegram_users
    if v_target_tg_id is null then
        select 
            raw_user_meta_data->>'telegram_id',
            id,
            raw_user_meta_data->>'full_name'
        into v_target_tg_id, v_target_uid, v_full_name
        from auth.users
        where lower(raw_user_meta_data->>'username') = v_clean_username
           or lower(raw_user_meta_data->>'user_name') = v_clean_username
        limit 1;
    end if;

    -- 3. Create verification row
    insert into public.local_player_verifications (
        host_user_id,
        host_name,
        target_username,
        target_telegram_id,
        target_user_id,
        status
    )
    values (
        auth.uid(),
        coalesce(p_host_name, 'Игрок'),
        v_clean_username,
        v_target_tg_id,
        v_target_uid,
        'pending'
    )
    returning id into v_verification_id;

    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_target_tg_id is not null and v_token is not null then
        v_name_option1 := coalesce(v_full_name, 'Игрок');
        v_name_option2 := '@' || v_clean_username;

        v_message_text := '🎩 <b>Приглашение в игру «Шляпа»!</b>' || E'\n\n'
            || 'Игрок <b>' || replace(replace(replace(coalesce(p_host_name, 'Хост'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b> добавляет вас в команду локальной партии.' || E'\n\n'
            || 'Подтвердите участие и выберите имя для игры:';

        v_keyboard := jsonb_build_object(
            'inline_keyboard', jsonb_build_array(
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '✨ Имя: ' || v_name_option1,
                        'callback_data', 'pv_c:' || v_verification_id || ':name'
                    )
                ),
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '👤 Юзернейм: ' || v_name_option2,
                        'callback_data', 'pv_c:' || v_verification_id || ':user'
                    )
                ),
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '❌ Отклонить',
                        'callback_data', 'pv_r:' || v_verification_id
                    )
                )
            )
        );

        select status, content into v_http_res
        from http_post(
            'https://api.telegram.org/bot' || v_token || '/sendMessage',
            jsonb_build_object(
                'chat_id', v_target_tg_id,
                'text', v_message_text,
                'parse_mode', 'HTML',
                'reply_markup', v_keyboard,
                'disable_web_page_preview', true
            )::text,
            'application/json'
        );

        return jsonb_build_object(
            'ok', true,
            'verification_id', v_verification_id,
            'target_found', true,
            'status', 'pending',
            'username', v_clean_username
        );
    else
        return jsonb_build_object(
            'ok', true,
            'verification_id', v_verification_id,
            'target_found', false,
            'status', 'pending',
            'username', v_clean_username
        );
    end if;
end;
$$;

-- 5. Smarter request_telegram_account_link
create or replace function public.request_telegram_account_link(
    p_username text,
    p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_clean_username text;
    v_token          text;
    v_user_id        uuid;
    v_target_tg_id   text;
    v_keyboard       jsonb;
    v_message_text   text;
    v_http_res       record;
begin
    v_user_id := coalesce(p_user_id, auth.uid());
    if v_user_id is null then
        return jsonb_build_object('ok', false, 'error', 'User ID is required');
    end if;

    v_clean_username := lower(trim(replace(p_username, '@', '')));
    if v_clean_username = '' then
        return jsonb_build_object('ok', false, 'error', 'Invalid username');
    end if;

    -- 1. Try telegram_users
    select telegram_id into v_target_tg_id
    from public.telegram_users
    where lower(username) = v_clean_username
    limit 1;

    -- 2. Try auth.users
    if v_target_tg_id is null then
        select raw_user_meta_data->>'telegram_id' into v_target_tg_id
        from auth.users
        where lower(raw_user_meta_data->>'username') = v_clean_username
           or lower(raw_user_meta_data->>'user_name') = v_clean_username
        limit 1;
    end if;

    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_target_tg_id is not null and v_token is not null then
        v_message_text := '🎩 <b>Привязка Telegram к профилю «Шляпы»</b>' || E'\n\n'
            || 'Вы запросили привязку этого Telegram-аккаунта к профилю на компьютере/веб-версии.' || E'\n\n'
            || 'Подтвердите привязку аккаунта:';

        v_keyboard := jsonb_build_object(
            'inline_keyboard', jsonb_build_array(
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '✅ Подтвердить привязку',
                        'callback_data', 'pl_c:' || v_user_id
                    )
                ),
                jsonb_build_array(
                    jsonb_build_object(
                        'text', '❌ Отклонить',
                        'callback_data', 'pl_r:' || v_user_id
                    )
                )
            )
        );

        select status, content into v_http_res
        from http_post(
            'https://api.telegram.org/bot' || v_token || '/sendMessage',
            jsonb_build_object(
                'chat_id', v_target_tg_id,
                'text', v_message_text,
                'parse_mode', 'HTML',
                'reply_markup', v_keyboard,
                'disable_web_page_preview', true
            )::text,
            'application/json'
        );

        return jsonb_build_object(
            'ok', true,
            'target_found', true,
            'user_id', v_user_id,
            'username', v_clean_username
        );
    else
        return jsonb_build_object(
            'ok', true,
            'target_found', false,
            'user_id', v_user_id,
            'username', v_clean_username
        );
    end if;
end;
$$;
