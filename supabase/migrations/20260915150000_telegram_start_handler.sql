-- =====================================================================
-- 10. TELEGRAM BOT: /start HANDLER WITH WEB APP BUTTON & MENU CONFIG
-- =====================================================================

-- Функция обработки входящего вебхука от Telegram Bot API
create or replace function public.handle_telegram_webhook(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_token      text;
    v_app_url    text;
    v_msg        jsonb;
    v_chat_id    text;
    v_user_tg_id text;
    v_first_name text;
    v_text       text;
    v_reply_text text;
    v_keyboard   jsonb;
    v_http_res   record;
begin
    -- Получаем токен бота из Supabase Vault
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_token is null then
        return jsonb_build_object('ok', false, 'error', 'telegram_bot_token not configured in Vault');
    end if;

    -- Получаем базовый URL приложения
    select coalesce(value, 'https://kix.github.io/hat/') into v_app_url
    from public.app_settings
    where key = 'app_base_url';

    v_app_url := coalesce(v_app_url, 'https://kix.github.io/hat/');

    -- Извлекаем сообщение из вебхука
    v_msg := p_payload->'message';
    if v_msg is null then
        return jsonb_build_object('ok', true, 'info', 'No message in update');
    end if;

    v_chat_id    := v_msg->'chat'->>'id';
    v_user_tg_id := v_msg->'from'->>'id';
    v_first_name := coalesce(v_msg->'from'->>'first_name', 'друг');
    v_text       := trim(coalesce(v_msg->>'text', ''));

    if v_chat_id is null then
        return jsonb_build_object('ok', true, 'info', 'No chat_id');
    end if;

    -- Обновляем статус в таблице уведомлений, если пользователь уже есть
    if v_user_tg_id is not null then
        update public.telegram_notifications
        set last_status = 'bot_started',
            updated_at = now()
        where telegram_id = v_user_tg_id;
    end if;

    -- Обработка команды /start
    if v_text like '/start%' then
        v_reply_text := '🎩 <b>Привет, ' || replace(replace(replace(v_first_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '! Добро пожаловать в игру «Шляпа»!</b>' || E'\n\n'
            || 'Классическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!' || E'\n\n'
            || '✨ <b>Возможности:</b>' || E'\n'
            || '• Играйте локально на одном устройстве или онлайн с друзьями' || E'\n'
            || '• Огромные словари (русский и английский)' || E'\n'
            || '• Личная статистика, рекорды и достижения' || E'\n'
            || '• Ежедневные сводки итогов игр' || E'\n\n'
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

    -- Обработка команды /help
    elsif v_text like '/help%' then
        v_reply_text := '🎩 <b>Как играть в «Шляпу»?</b>' || E'\n\n'
            || '1. Игроки делятся на команды по 2 человека.' || E'\n'
            || '2. В каждом раунде один игрок объясняет слова из «шляпы», а напарник угадывает за ограниченное время.' || E'\n'
            || '3. Побеждает команда, угадавшая больше всего слов!' || E'\n\n'
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

-- Предоставляем право на вызов вебхука для anon, authenticated и service_role
grant execute on function public.handle_telegram_webhook(jsonb) to anon, authenticated, service_role;

-- Функция для автоматической настройки меню и команд бота в Telegram
create or replace function public.setup_telegram_bot_menu(p_app_url text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_token    text;
    v_target   text;
    v_menu_res record;
    v_cmd_res  record;
begin
    -- Токен бота из Vault
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_token is null then
        return jsonb_build_object('ok', false, 'error', 'telegram_bot_token not found in Vault');
    end if;

    if p_app_url is not null and p_app_url != '' then
        v_target := p_app_url;
    else
        select coalesce(value, 'https://kix.github.io/hat/') into v_target
        from public.app_settings
        where key = 'app_base_url';
    end if;

    v_target := coalesce(v_target, 'https://kix.github.io/hat/');

    -- 1. Настраиваем Chat Menu Button (кнопка слева от поля ввода в чате бота)
    select status, content into v_menu_res
    from http_post(
        'https://api.telegram.org/bot' || v_token || '/setChatMenuButton',
        jsonb_build_object(
            'menu_button', jsonb_build_object(
                'type', 'web_app',
                'text', '🎮 Играть',
                'web_app', jsonb_build_object('url', v_target)
            )
        )::text,
        'application/json'
    );

    -- 2. Настраиваем список команд бота (/start, /help)
    select status, content into v_cmd_res
    from http_post(
        'https://api.telegram.org/bot' || v_token || '/setMyCommands',
        jsonb_build_object(
            'commands', jsonb_build_array(
                jsonb_build_object('command', 'start', 'description', '🎮 Запустить игру «Шляпа»'),
                jsonb_build_object('command', 'help', 'description', 'ℹ️ Как играть и правила')
            )
        )::text,
        'application/json'
    );

    return jsonb_build_object(
        'ok', true,
        'app_url', v_target,
        'menu_status', v_menu_res.status,
        'commands_status', v_cmd_res.status
    );
end;
$$;

grant execute on function public.setup_telegram_bot_menu(text) to authenticated, service_role;
