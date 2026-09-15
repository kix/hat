-- =====================================================================
-- 13. DESKTOP TELEGRAM ACCOUNT LINKING & WEBHOOK HANDLER
-- =====================================================================
-- Enables desktop/web users to link their Telegram profile to their web account
-- via deep link (/start link_<uuid>) or by requesting confirmation by @username.

-- 1. Function to request linking an account by Telegram username
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
    v_tg_user        record;
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

    -- Find in telegram_users
    select * into v_tg_user
    from public.telegram_users
    where lower(username) = v_clean_username
    limit 1;

    -- Get bot token from Vault
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_tg_user.telegram_id is not null and v_token is not null then
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
                'chat_id', v_tg_user.telegram_id,
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

grant execute on function public.request_telegram_account_link(text, uuid) to anon, authenticated, service_role;

-- 2. Enhanced handle_telegram_webhook to handle /start link_<uuid> and pl_c:<uuid>
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
                    ''
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
                             || (case when v_username is not null then 'Юзернейм: <b>@' || v_username || '</b>' || E'\n' else '' end)
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
                ''
            );

            update public.telegram_users
            set user_id = v_target_user_id, updated_at = now()
            where telegram_id = v_user_tg_id;

            v_reply_text := '🎩 <b>Ваш Telegram успешно привязан к профилю «Шляпы»!</b>' || E'\n\n'
                || 'Имя: <b>' || v_full_name || '</b>' || E'\n'
                || (case when v_username is not null then 'Юзернейм: <b>@' || v_username || '</b>' || E'\n' else '' end)
                || 'Теперь все ваши партии, опыт (XP) и рейтинг в таблице лидеров синхронизированы!';

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

            return jsonb_build_object('ok', true, 'status', v_http_res.status, 'action', 'account_linked');
        end if;
    end if;

    -- Deep-link 2: /start join_<verification_id> (Local player verification)
    if v_text ~* '^/start\s+join_[a-f0-9\-]+' then
        v_verif_id := replace(substring(v_text from '^/start\s+join_([a-f0-9\-]+)'), 'join_', '')::uuid;

        select * into v_v_rec
        from public.local_player_verifications
        where id = v_verif_id;

        if v_v_rec.id is not null then
            v_reply_text := '🎩 <b>Приглашение в игру «Шляпа»!</b>' || E'\n\n'
                || 'Игрок <b>' || replace(replace(replace(v_v_rec.host_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b> добавляет вас в команду локальной партии.' || E'\n\n'
                || 'Подтвердите участие и выберите имя для отображения:';

            v_keyboard := jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object(
                            'text', '✨ Имя: ' || v_full_name,
                            'callback_data', 'pv_c:' || v_verif_id || ':name'
                        )
                    ),
                    jsonb_build_array(
                        jsonb_build_object(
                            'text', '👤 Юзернейм: @' || coalesce(v_username, 'игрок'),
                            'callback_data', 'pv_c:' || v_verif_id || ':user'
                        )
                    ),
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

            return jsonb_build_object('ok', true, 'status', v_http_res.status, 'action', 'verification_invite_sent');
        end if;
    end if;

    -- Standard /start command
    if v_text like '/start%' then
        v_reply_text := '🎩 <b>Привет, ' || replace(replace(replace(v_full_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '! Добро пожаловать в игру «Шляпа»!</b>' || E'\n\n'
            || 'Классическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!' || E'\n\n'
            || '✨ <b>Возможности:</b>' || E'\n'
            || '• Играйте локально на одном устройстве или онлайн с друзьями' || E'\n'
            || '• Авторизация участников по Telegram-юзернеймам' || E'\n'
            || '• Личная статистика, прокачка уровней и таблица лидеров 🏆' || E'\n'
            || '• Еженедельный дайджест сложных слов (/hardest)' || E'\n\n'
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

        return jsonb_build_object('ok', true, 'status', v_http_res.status, 'action', 'start_sent');

    -- Command /hardest
    elsif v_text like '/hardest%' then
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

        return jsonb_build_object('ok', true, 'status', v_http_res.status, 'action', 'hardest_sent');

    -- Command /help
    elsif v_text like '/help%' then
        v_reply_text := '🎩 <b>Как играть в «Шляпу»?</b>' || E'\n\n'
            || '1. Игроки делятся на команды по 2 человека.' || E'\n'
            || '2. В каждом раунде один игрок объясняет слова из «шляпы», а напарник угадывает за ограниченное время.' || E'\n'
            || '3. Побеждает команда, набравшая больше всего очков!' || E'\n\n'
            || '<b>Команды бота:</b>' || E'\n'
            || '• /start — Запустить игру' || E'\n'
            || '• /hardest — Самые сложные слова недели с определениями' || E'\n'
            || '• /help — Правила и справка' || E'\n\n'
            || '👇 Нажмите кнопку, чтобы запустить приложение:';

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

        return jsonb_build_object('ok', true, 'status', v_http_res.status, 'action', 'help_sent');
    end if;

    return jsonb_build_object('ok', true, 'action', 'ignored');
end;
$$;
