-- =====================================================================
-- EXPAND TELEGRAM BOT FUNCTIONALITY:
-- 1. /stats (/me, /profile) - Personal player profile, XP, Level, Winrate
-- 2. /top (/leaderboard) - Top players rankings
-- 3. /rules (/help) - Complete game rules for all 3 rounds and tips
-- 4. /word (/quiz, /daily) - Random training word with definition and round tips
-- 5. /hardest - Weekly hardest words digest
-- 6. Interactive inline buttons for all sections and smooth navigation
-- =====================================================================

-- 1. Helper to format personal player stats
create or replace function public.build_player_stats_message(
    p_telegram_id text,
    p_full_name text default null,
    p_username text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_user_id     uuid;
    v_name        text;
    v_uname       text;
    v_stats_found boolean := false;
    v_rank_num    bigint := 0;
    v_total_users bigint := 0;
    v_rec         record;
    v_msg         text;
begin
    -- 1. Resolve user_id from telegram_users
    select user_id, coalesce(full_name, p_full_name), coalesce(username, p_username)
    into v_user_id, v_name, v_uname
    from public.telegram_users
    where telegram_id = p_telegram_id
    limit 1;

    if v_name is null or v_name = '' then
        v_name := coalesce(p_full_name, coalesce(p_username, 'Игрок'));
    end if;

    if v_uname is null or v_uname = '' then
        v_uname := p_username;
    end if;

    -- 2. Count total players in leaderboard
    select count(*) into v_total_users
    from public.get_leaderboard(1000);

    -- 3. Find stats in leaderboard by user_id
    if v_user_id is not null then
        select * into v_rec
        from (
            select
                row_number() over (order by l.total_xp desc, l.wins_count desc, l.games_count desc) as r_num,
                l.*
            from public.get_leaderboard(1000) l
        ) ranked
        where ranked.user_id = v_user_id
        limit 1;

        if v_rec.user_id is not null then
            v_stats_found := true;
            v_rank_num := v_rec.r_num;
        end if;
    end if;

    -- If not found by user_id, try matching by player_name
    if not v_stats_found and v_name is not null then
        select * into v_rec
        from (
            select
                row_number() over (order by l.total_xp desc, l.wins_count desc, l.games_count desc) as r_num,
                l.*
            from public.get_leaderboard(1000) l
        ) ranked
        where lower(ranked.player_name) = lower(v_name)
           or (v_uname is not null and lower(ranked.player_name) = lower('@' || v_uname))
        limit 1;

        if v_rec.player_name is not null then
            v_stats_found := true;
            v_rank_num := v_rec.r_num;
        end if;
    end if;

    -- 4. Build output message
    v_msg := '📊 <b>Профиль игрока: ' || replace(replace(replace(v_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n';
    if v_uname is not null and v_uname != '' then
        v_msg := v_msg || '👤 Юзернейм: <b>@' || replace(replace(replace(v_uname, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n';
    end if;
    v_msg := v_msg || E'\n';

    if v_stats_found then
        v_msg := v_msg || '🎖 <b>Звание:</b> ' || v_rec.rank_title || ' (' || v_rec.level || ' ур.)' || E'\n'
              || '⭐️ <b>Опыт:</b> ' || v_rec.total_xp || ' XP' || E'\n'
              || '🏆 <b>Место в рейтинге:</b> #' || v_rank_num || (case when v_total_users > 0 then ' из ' || v_total_users else '' end) || E'\n\n'
              || '🎮 <b>Сыграно игр:</b> ' || v_rec.games_count || E'\n'
              || '🥇 <b>Побед:</b> ' || v_rec.wins_count || ' (' || v_rec.win_rate || '%)' || E'\n'
              || '💬 <b>Угадано слов:</b> ' || v_rec.words_count || E'\n'
              || '⚡️ <b>Быстрых слов (&lt;3с):</b> ' || v_rec.fast_words_count || E'\n'
              || '✨ <b>Игр без нарушений:</b> ' || v_rec.clean_games_count || E'\n\n'
              || '<i>Играйте в «Шляпу» чаще, чтобы повышать свой уровень и открывать новые звания!</i>';
    else
        v_msg := v_msg || '🎖 <b>Звание:</b> Новичок (1 ур.)' || E'\n'
              || '⭐️ <b>Опыт:</b> 0 XP' || E'\n\n'
              || '🎮 <b>Сыграно игр:</b> 0' || E'\n'
              || '🏆 <b>Побед:</b> 0 (0%)' || E'\n'
              || '💬 <b>Угадано слов:</b> 0' || E'\n\n'
              || '💡 <i>Вы пока не сыграли ни одной партии со своим Telegram-аккаунтом. Нажмите кнопку ниже, чтобы начать игру и заработать первые очки!</i>';
    end if;

    return v_msg;
end;
$$;

grant execute on function public.build_player_stats_message(text, text, text) to anon, authenticated, service_role;


-- 2. Helper to format top leaderboard digest
create or replace function public.build_leaderboard_digest(
    p_current_tg_id text default null,
    p_limit int default 10
)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_msg        text;
    v_pos        int := 0;
    v_medal      text;
    v_rec        record;
    v_user_id    uuid;
    v_my_rank    bigint := 0;
    v_my_rec     record;
begin
    v_msg := '🏆 <b>Таблица лидеров «Шляпы»</b> 🎩' || E'\n\n'
          || 'Лучшие игроки по набранному опыту (XP) и победам:' || E'\n\n';

    for v_rec in (
        select * from public.get_leaderboard(p_limit)
    )
    loop
        v_pos := v_pos + 1;
        case v_pos
            when 1 then v_medal := '🥇 ';
            when 2 then v_medal := '🥈 ';
            when 3 then v_medal := '🥉 ';
            when 4 then v_medal := '4️⃣ ';
            when 5 then v_medal := '5️⃣ ';
            when 6 then v_medal := '6️⃣ ';
            when 7 then v_medal := '7️⃣ ';
            when 8 then v_medal := '8️⃣ ';
            when 9 then v_medal := '9️⃣ ';
            when 10 then v_medal := '🔟 ';
            else v_medal := v_pos || '. ';
        end case;

        v_msg := v_msg || v_medal || '<b>' || replace(replace(replace(v_rec.player_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>'
              || ' — <b>' || v_rec.total_xp || ' XP</b> (' || v_rec.level || ' ур.)' || E'\n'
              || '     └ 🎮 ' || v_rec.games_count || ' игр | 🏆 ' || v_rec.wins_count || ' побед (' || v_rec.win_rate || '%) | 💬 ' || v_rec.words_count || ' слов' || E'\n\n';
    end loop;

    if v_pos = 0 then
        v_msg := v_msg || 'Пока нет завершённых игр в таблице лидеров. Будьте первым!' || E'\n\n';
    end if;

    -- Check if current user is linked and show their position
    if p_current_tg_id is not null then
        select user_id into v_user_id
        from public.telegram_users
        where telegram_id = p_current_tg_id;

        if v_user_id is not null then
            select ranked.r_num, ranked.total_xp, ranked.level, ranked.rank_title into v_my_rec
            from (
                select row_number() over (order by l.total_xp desc, l.wins_count desc, l.games_count desc) as r_num, l.*
                from public.get_leaderboard(1000) l
            ) ranked
            where ranked.user_id = v_user_id
            limit 1;

            if v_my_rec.r_num is not null then
                v_msg := v_msg || '───────────────' || E'\n'
                      || '📍 <b>Ваша позиция:</b> #' || v_my_rec.r_num || ' (' || v_my_rec.total_xp || ' XP, ' || v_my_rec.rank_title || ')' || E'\n';
            end if;
        end if;
    end if;

    return v_msg;
end;
$$;

grant execute on function public.build_leaderboard_digest(text, int) to anon, authenticated, service_role;


-- 3. Helper to build random training word message
create or replace function public.build_random_training_word_message()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_rec record;
    v_msg text;
begin
    -- Pick a random word with definition from word_definitions table
    select word, definition
    into v_rec
    from public.word_definitions
    where definition is not null and length(trim(definition)) > 5
    order by random()
    limit 1;

    if v_rec.word is null then
        v_rec.word := 'шляпа';
        v_rec.definition := 'Головной убор с полями и тульей, а также название нашей любимой салонной игры!';
    end if;

    v_msg := '💡 <b>Тренировка для «Шляпы»</b>' || E'\n\n'
          || 'Загаданное слово: <b>' || upper(v_rec.word) || '</b>' || E'\n\n'
          || '📖 <b>Значение:</b> ' || v_rec.definition || E'\n\n'
          || '🎩 <b>Как объяснять в раундах:</b>' || E'\n'
          || '1️⃣ <b>Раунд 1 (Словами):</b> Опишите суть, свойства, назначение или контекст, избегая однокоренных слов.' || E'\n'
          || '2️⃣ <b>Раунд 2 (Жестами):</b> Покажите действие, форму или применение только жестами и мимикой без звуков.' || E'\n'
          || '3️⃣ <b>Раунд 3 (Одно слово):</b> Назовите самую яркую ассоциацию, которая сразу напомнит команде это слово!' || E'\n\n'
          || '<i>Нажмите «🎲 Другое слово», чтобы потренировать следующее!</i>';

    return v_msg;
end;
$$;

grant execute on function public.build_random_training_word_message() to anon, authenticated, service_role;


-- 4. Helper to build rules message
create or replace function public.build_rules_message()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    return '📖 <b>Правила игры «Шляпа»</b> 🎩' || E'\n\n'
        || '«Шляпа» — это командная салонная игра на эрудицию, скорость и взаимопонимание. Игроки по очереди объясняют слова своей команде за ограниченное время (20–60 сек).' || E'\n\n'
        || 'Игра состоит из 3 увлекательных раундов с одними и теми же словами:' || E'\n\n'
        || '1️⃣ <b>Раунд 1 — Словами:</b>' || E'\n'
        || 'Объясняйте загаданное слово любыми фразами, синонимами и описаниями.' || E'\n'
        || '❌ <i>Запрещено:</i> называть однокоренные слова, созвучия и прямые переводы на иностранные языки.' || E'\n\n'
        || '2️⃣ <b>Раунд 2 — Жестами (Крокодил):</b>' || E'\n'
        || 'Используйте только мимику, позы и жесты.' || E'\n'
        || '❌ <i>Запрещено:</i> произносить любые звуки, указывать на предметы вокруг или писать буквы в воздухе.' || E'\n\n'
        || '3️⃣ <b>Раунд 3 — Одно слово:</b>' || E'\n'
        || 'Ведущий может сказать <b>ровно одно слово</b> — ассоциацию к загаданному!' || E'\n'
        || '❌ <i>Запрещено:</i> использовать жесты, говорить более одного слова или называть однокоренные.' || E'\n\n'
        || '⚠️ <b>Нарушения:</b> При нарушении правил ведущий нажимает «Нарушение» — слово уходит со штрафом.' || E'\n\n'
        || '⚡️ <b>Быстрые команды бота:</b>' || E'\n'
        || '• /start — Главное меню игры' || E'\n'
        || '• /stats — Ваш профиль, уровень и очки' || E'\n'
        || '• /top — Таблица лидеров' || E'\n'
        || '• /word — Слово для тренировки' || E'\n'
        || '• /hardest — Сложнейшие слова недели' || E'\n'
        || '• /rules — Правила игры';
end;
$$;

grant execute on function public.build_rules_message() to anon, authenticated, service_role;


-- 5. Helper to generate standard inline keyboards
create or replace function public.build_bot_keyboard(p_type text, p_app_url text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    case p_type
        when 'main' then
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '📊 Мой профиль', 'callback_data', 'menu_stats'),
                        jsonb_build_object('text', '🏆 Лидерборд', 'callback_data', 'menu_top')
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '📖 Правила', 'callback_data', 'menu_rules'),
                        jsonb_build_object('text', '💡 Тренировка', 'callback_data', 'menu_word')
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '🧠 Сложнейшие слова', 'callback_data', 'menu_hardest'),
                        jsonb_build_object('text', '🌐 Открыть в браузере', 'url', p_app_url)
                    )
                )
            );
        when 'stats' then
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '🏆 Таблица лидеров', 'callback_data', 'menu_top'),
                        jsonb_build_object('text', '🔄 Обновить', 'callback_data', 'menu_stats')
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '◀️ Главное меню', 'callback_data', 'menu_main')
                    )
                )
            );
        when 'top' then
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '📊 Мой профиль', 'callback_data', 'menu_stats'),
                        jsonb_build_object('text', '🔄 Обновить', 'callback_data', 'menu_top')
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '◀️ Главное меню', 'callback_data', 'menu_main')
                    )
                )
            );
        when 'word' then
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎲 Другое слово', 'callback_data', 'word_next'),
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '📖 Правила', 'callback_data', 'menu_rules'),
                        jsonb_build_object('text', '◀️ Главное меню', 'callback_data', 'menu_main')
                    )
                )
            );
        when 'rules' then
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '💡 Тренировка слов', 'callback_data', 'menu_word'),
                        jsonb_build_object('text', '🏆 Лидерборд', 'callback_data', 'menu_top')
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '◀️ Главное меню', 'callback_data', 'menu_main')
                    )
                )
            );
        when 'hardest' then
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '💡 Тренировка слов', 'callback_data', 'menu_word'),
                        jsonb_build_object('text', '📊 Мой профиль', 'callback_data', 'menu_stats')
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '◀️ Главное меню', 'callback_data', 'menu_main')
                    )
                )
            );
        else
            return jsonb_build_object(
                'inline_keyboard', jsonb_build_array(
                    jsonb_build_array(
                        jsonb_build_object('text', '🎮 Играть в «Шляпу»', 'web_app', jsonb_build_object('url', p_app_url))
                    ),
                    jsonb_build_array(
                        jsonb_build_object('text', '◀️ Главное меню', 'callback_data', 'menu_main')
                    )
                )
            );
    end case;
end;
$$;

grant execute on function public.build_bot_keyboard(text, text) to anon, authenticated, service_role;


-- 6. Setup / Update Telegram bot commands and menu button
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

    -- 1. Chat Menu Button
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

    -- 2. Commands list (Extended)
    select status, content into v_cmd_res
    from http_post(
        'https://api.telegram.org/bot' || v_token || '/setMyCommands',
        jsonb_build_object(
            'commands', jsonb_build_array(
                jsonb_build_object('command', 'start', 'description', '🎮 Главное меню игры'),
                jsonb_build_object('command', 'stats', 'description', '📊 Мой профиль и статистика'),
                jsonb_build_object('command', 'top', 'description', '🏆 Таблица лидеров'),
                jsonb_build_object('command', 'word', 'description', '💡 Слово для тренировки'),
                jsonb_build_object('command', 'hardest', 'description', '🧠 Сложнейшие слова недели'),
                jsonb_build_object('command', 'rules', 'description', '📖 Правила игры'),
                jsonb_build_object('command', 'help', 'description', 'ℹ️ Помощь и команды')
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

grant execute on function public.setup_telegram_bot_menu(text) to anon, authenticated, service_role;


-- 7. Master Webhook Handler with comprehensive feature support
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

    -- ==========================================================
    -- SECTION A: Handle Callback Query (Button click)
    -- ==========================================================
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

        -- Record/update user
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

        -- 1. Player verification callback (pv_c / pv_r)
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
                             || 'Ваше имя в игре: <b>' || replace(replace(replace(v_chosen_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n'
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

        -- 2. Profile linking callback (pl_c / pl_r)
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
                             || 'Имя: <b>' || replace(replace(replace(v_full_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n'
                             || (case when v_username is not null and v_username != '' then 'Юзернейм: <b>@' || replace(replace(replace(v_username, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n' else '' end)
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

        -- 3. Navigation Callbacks: menu_stats, menu_top, menu_rules, menu_word, word_next, menu_hardest, menu_main
        elsif v_cb_data in ('menu_main', 'menu_stats', 'menu_top', 'menu_rules', 'menu_word', 'word_next', 'menu_hardest') then
            if v_cb_data = 'menu_main' then
                v_reply_text := '🎩 <b>Привет, ' || replace(replace(replace(v_full_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '! Добро пожаловать в «Шляпу»!</b>' || E'\n\n'
                    || 'Классическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!' || E'\n\n'
                    || '👇 Выберите действие:';
                v_keyboard := public.build_bot_keyboard('main', v_app_url);

            elsif v_cb_data = 'menu_stats' then
                v_reply_text := public.build_player_stats_message(v_user_tg_id, v_full_name, v_username);
                v_keyboard := public.build_bot_keyboard('stats', v_app_url);

            elsif v_cb_data = 'menu_top' then
                v_reply_text := public.build_leaderboard_digest(v_user_tg_id, 10);
                v_keyboard := public.build_bot_keyboard('top', v_app_url);

            elsif v_cb_data = 'menu_rules' then
                v_reply_text := public.build_rules_message();
                v_keyboard := public.build_bot_keyboard('rules', v_app_url);

            elsif v_cb_data in ('menu_word', 'word_next') then
                v_reply_text := public.build_random_training_word_message();
                v_keyboard := public.build_bot_keyboard('word', v_app_url);

            elsif v_cb_data = 'menu_hardest' then
                v_reply_text := public.build_hardest_words_digest(10, 7);
                v_keyboard := public.build_bot_keyboard('hardest', v_app_url);
            end if;

            perform http_post(
                'https://api.telegram.org/bot' || v_token || '/answerCallbackQuery',
                jsonb_build_object('callback_query_id', v_cb_id)::text,
                'application/json'
            );

            perform http_post(
                'https://api.telegram.org/bot' || v_token || '/editMessageText',
                jsonb_build_object(
                    'chat_id', v_chat_id,
                    'message_id', (v_cb->'message'->>'message_id')::bigint,
                    'text', v_reply_text,
                    'parse_mode', 'HTML',
                    'reply_markup', v_keyboard,
                    'disable_web_page_preview', true
                )::text,
                'application/json'
            );

            return jsonb_build_object('ok', true, 'action', 'menu_navigated', 'section', v_cb_data);
        end if;

        return jsonb_build_object('ok', true, 'action', 'cb_ignored');
    end if;

    -- ==========================================================
    -- SECTION B: Handle standard Message
    -- ==========================================================
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
                || 'Имя: <b>' || replace(replace(replace(v_full_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n'
                || (case when v_username is not null and v_username != '' then 'Юзернейм: <b>@' || replace(replace(replace(v_username, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</b>' || E'\n' else '' end)
                || 'Теперь все ваши партии, опыт (XP) и рейтинг в таблице лидеров синхронизированы!';

            v_keyboard := public.build_bot_keyboard('stats', v_app_url);

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

    -- Command: /stats, /me, /profile
    if v_text in ('/stats', '/me', '/profile') or v_text ~* '^/stats(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/me(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/profile(@[a-zA-Z0-9_]+)?\s*' then
        v_reply_text := public.build_player_stats_message(v_user_tg_id, v_full_name, v_username);
        v_keyboard := public.build_bot_keyboard('stats', v_app_url);

        perform http_post(
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

        return jsonb_build_object('ok', true, 'action', 'stats_sent');
    end if;

    -- Command: /top, /leaderboard
    if v_text in ('/top', '/leaderboard') or v_text ~* '^/top(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/leaderboard(@[a-zA-Z0-9_]+)?\s*' then
        v_reply_text := public.build_leaderboard_digest(v_user_tg_id, 10);
        v_keyboard := public.build_bot_keyboard('top', v_app_url);

        perform http_post(
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

        return jsonb_build_object('ok', true, 'action', 'leaderboard_sent');
    end if;

    -- Command: /rules, /help, /about
    if v_text in ('/rules', '/help', '/about') or v_text ~* '^/rules(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/help(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/about(@[a-zA-Z0-9_]+)?\s*' then
        v_reply_text := public.build_rules_message();
        v_keyboard := public.build_bot_keyboard('rules', v_app_url);

        perform http_post(
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

        return jsonb_build_object('ok', true, 'action', 'rules_sent');
    end if;

    -- Command: /word, /quiz, /daily
    if v_text in ('/word', '/quiz', '/daily') or v_text ~* '^/word(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/quiz(@[a-zA-Z0-9_]+)?\s*' or v_text ~* '^/daily(@[a-zA-Z0-9_]+)?\s*' then
        v_reply_text := public.build_random_training_word_message();
        v_keyboard := public.build_bot_keyboard('word', v_app_url);

        perform http_post(
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

        return jsonb_build_object('ok', true, 'action', 'training_word_sent');
    end if;

    -- Command: /hardest
    if v_text = '/hardest' or v_text ~* '^/hardest(@[a-zA-Z0-9_]+)?\s*' then
        v_reply_text := public.build_hardest_words_digest(10, 7);
        v_keyboard := public.build_bot_keyboard('hardest', v_app_url);

        perform http_post(
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

    -- Default /start command
    if v_text = '/start' or v_text ~* '^/start(@[a-zA-Z0-9_]+)?\s*' then
        v_reply_text := '🎩 <b>Привет, ' || replace(replace(replace(v_full_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '! Добро пожаловать в игру «Шляпа»!</b>' || E'\n\n'
            || 'Классическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!' || E'\n\n'
            || '👇 Выберите действие:';

        v_keyboard := public.build_bot_keyboard('main', v_app_url);

        perform http_post(
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

    return jsonb_build_object('ok', true, 'action', 'message_ignored');
end;
$$;

grant execute on function public.handle_telegram_webhook(jsonb) to anon, authenticated, service_role;
