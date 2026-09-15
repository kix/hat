-- =====================================================================
-- 12. TELEGRAM USERNAME AUTHENTICATION FOR LOCAL GAMES
-- =====================================================================
-- Allows adding and verifying players in a local game by entering their
-- Telegram @username. The bot asks the player to confirm their participation
-- and select their displayed name (real name or username).

-- 1. Table to track Telegram users by username and user_id
create table if not exists public.telegram_users (
    telegram_id text primary key,
    username text,
    first_name text,
    last_name text,
    full_name text,
    avatar_url text,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_telegram_users_username on public.telegram_users(lower(username));
create index if not exists idx_telegram_users_user_id on public.telegram_users(user_id);

alter table public.telegram_users enable row level security;

drop policy if exists "Allow read access to telegram_users" on public.telegram_users;
create policy "Allow read access to telegram_users"
on public.telegram_users
for select
to anon, authenticated
using (true);

drop policy if exists "Allow insert/update to telegram_users" on public.telegram_users;
create policy "Allow insert/update to telegram_users"
on public.telegram_users
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.telegram_users to anon, authenticated, service_role;

-- 2. Table for local player verifications
create table if not exists public.local_player_verifications (
    id uuid primary key default gen_random_uuid(),
    host_user_id uuid references auth.users(id) on delete set null,
    host_name text not null default 'Игрок',
    target_username text not null,
    target_telegram_id text,
    target_user_id uuid references auth.users(id) on delete set null,
    status text not null default 'pending', -- 'pending', 'confirmed', 'rejected', 'not_found'
    chosen_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_local_player_verifications_status on public.local_player_verifications(status);

alter table public.local_player_verifications enable row level security;

drop policy if exists "Allow read access to local_player_verifications" on public.local_player_verifications;
create policy "Allow read access to local_player_verifications"
on public.local_player_verifications
for select
to anon, authenticated
using (true);

drop policy if exists "Allow insert/update to local_player_verifications" on public.local_player_verifications;
create policy "Allow insert/update to local_player_verifications"
on public.local_player_verifications
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.local_player_verifications to anon, authenticated, service_role;

-- Try adding to realtime publication if available
do $$
begin
    alter publication supabase_realtime add table public.local_player_verifications;
exception when others then
    -- ignore if already added or publication does not exist
end;
$$;

-- 3. Update link_telegram_user to also sync telegram_users table
create or replace function public.link_telegram_user(
  p_new_user_id uuid,
  p_telegram_id text,
  p_full_name text,
  p_avatar_url text
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old_user_id uuid;
begin
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

  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'full_name', p_full_name,
        'avatar_url', p_avatar_url,
        'telegram_id', p_telegram_id,
        'provider', 'telegram'
      ),
      updated_at = now()
  where id = p_new_user_id;

  insert into public.telegram_notifications (user_id, telegram_id, enabled)
  values (p_new_user_id, p_telegram_id, true)
  on conflict (user_id) 
  do update set telegram_id = excluded.telegram_id;

  -- Sync into telegram_users
  insert into public.telegram_users (telegram_id, full_name, avatar_url, user_id, updated_at)
  values (p_telegram_id, p_full_name, p_avatar_url, p_new_user_id, now())
  on conflict (telegram_id)
  do update set
    full_name = coalesce(excluded.full_name, public.telegram_users.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.telegram_users.avatar_url),
    user_id = excluded.user_id,
    updated_at = now();
end;
$$;

-- 4. Function to initiate a player verification request by Telegram username
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
begin
    -- Clean username (remove leading @ and spaces)
    v_clean_username := lower(trim(replace(p_username, '@', '')));
    if v_clean_username = '' then
        return jsonb_build_object('ok', false, 'error', 'Invalid username');
    end if;

    -- Look up in telegram_users
    select * into v_tg_user
    from public.telegram_users
    where lower(username) = v_clean_username
    limit 1;

    -- Create pending verification record
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
        v_tg_user.telegram_id,
        v_tg_user.user_id,
        'pending'
    )
    returning id into v_verification_id;

    -- Get Telegram bot token from Vault
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    -- If user is found and has a telegram_id and bot token exists, send immediate notification
    if v_tg_user.telegram_id is not null and v_token is not null then
        v_name_option1 := coalesce(v_tg_user.full_name, v_tg_user.first_name, 'Игрок');
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
            'verification_id', v_verification_id,
            'target_found', true,
            'status', 'pending',
            'username', v_clean_username
        );
    else
        -- User not in telegram_users table yet: host can send deep link
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

grant execute on function public.request_telegram_player_verification(text, text) to anon, authenticated, service_role;

-- 5. Enhanced handle_telegram_webhook to handle callback queries and /start join_...
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

    -- Handle Callback Query (Button click in Telegram)
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

        -- Upsert telegram_users
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

        -- Process verification callback: pv_c:<uuid>:<name|user> or pv_r:<uuid>
        if v_cb_data like 'pv_c:%' or v_cb_data like 'pv_r:%' then
            v_action_type := split_part(v_cb_data, ':', 1);
            v_verif_id    := split_part(v_cb_data, ':', 2)::uuid;
            v_name_choice := split_part(v_cb_data, ':', 3);

            -- Find user_id if exists
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

                -- Answer callback
                perform http_post(
                    'https://api.telegram.org/bot' || v_token || '/answerCallbackQuery',
                    jsonb_build_object('callback_query_id', v_cb_id, 'text', '✅ Участие подтверждено: ' || v_chosen_name)::text,
                    'application/json'
                );

                -- Edit message to show confirmed state
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
                -- Rejected
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

    -- Handle /start with deep link: /start join_<verification_id>
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
