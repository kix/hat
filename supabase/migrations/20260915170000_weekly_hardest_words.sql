-- =====================================================================
-- 11. WEEKLY HARDEST WORDS DIGEST IN TELEGRAM BOT
-- =====================================================================
-- Automatically sends the top most difficult words (with definitions & timings)
-- to subscribed Telegram players once a week via pg_cron.
-- Also adds support for the /hardest command in the bot.

-- 1. Table for word definitions
create table if not exists public.word_definitions (
    word text primary key,
    definition text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.word_definitions enable row level security;

drop policy if exists "Allow everyone to read word_definitions" on public.word_definitions;
create policy "Allow everyone to read word_definitions"
on public.word_definitions
for select
to anon, authenticated
using (true);

drop policy if exists "Allow authenticated to manage word_definitions" on public.word_definitions;
create policy "Allow authenticated to manage word_definitions"
on public.word_definitions
for all
to authenticated
using (true)
with check (true);

grant select, insert, update on public.word_definitions to anon, authenticated, service_role;

-- Pre-populate definitions for known complex and popular words
insert into public.word_definitions (word, definition) values
    ('иная', 'Не такая, отличающаяся от данной; другая.'),
    ('гидротехника', 'Отрасль науки и техники об использовании водных ресурсов и возведении плотин, дамб, ГЭС.'),
    ('унтер', 'Разговорное сокращение от «унтер-офицер», звание младшего комсостава.'),
    ('эндогамия', 'Обычай или норма, предписывающая брак строго внутри своей социальной группы/касты.'),
    ('агама', 'Род дневных ящериц засушливых и скалистых районов Африки и Азии.'),
    ('схематизация', 'Представление чего-либо в упрощенном, схематичном виде без второстепенных деталей.'),
    ('патриций', 'Представитель родовой знати в Древнем Риме; аристократ.'),
    ('кадило', 'Металлический богослужебный сосуд на цепочках для сжигания ладана.'),
    ('этика', 'Философская наука о морали, нравственности и правилах поведения в обществе.'),
    ('компонент', 'Составная часть или элемент сложного целого (системы, программы, смеси).'),
    ('усердие', 'Большое старание, добросовестность и рвение при выполнении дела.'),
    ('кюри', 'Внесистемная единица измерения активности радиоактивного источника.'),
    ('лютик', 'Травянистое растение с едким соком и яркими желтыми цветками.'),
    ('местная', 'Коренная жительница определенной местности или края.'),
    ('лот', 'Прибор для измерения глубины водоема; единица товара на аукционе.'),
    ('алтарь', 'Главная восточная часть храма с престолом; жертвенник в древности.'),
    ('шквал', 'Внезапный резкий порыв сильного бурного ветра, шторм.'),
    ('крепость', 'Оборонительное укрепление; мера прочности материала или крепости напитка.'),
    ('шуст', 'Слесарный инструмент/сверло для расточки и чистовой обработки отверстий.'),
    ('этнолог', 'Ученый, исследующий культуру, быт и происхождение народов мира.'),
    ('стокер', 'Механическая топка котла; в литературе — автор готических историй.'),
    ('риза', 'Верхнее парадное облачение священнослужителя; металлический оклад иконы.'),
    ('хаджи', 'Мусульманин, совершивший паломничество (хадж) в Мекку.'),
    ('лексикология', 'Раздел языкознания, изучающий словарный состав языка.'),
    ('ощущение', 'Психический процесс отражения отдельных свойств предметов при воздействии на органы чувств.')
on conflict (word) do update
set definition = excluded.definition,
    updated_at = now();

-- 2. Helper function to format seconds into readable Russian time (e.g. "2 мин 15 с" or "45 с")
create or replace function public.format_duration_ru(p_seconds numeric)
returns text
language plpgsql
immutable
as $$
declare
    v_sec integer;
    v_mins integer;
    v_rem_sec integer;
begin
    v_sec := round(p_seconds)::integer;
    if v_sec < 60 then
        return v_sec || ' с';
    else
        v_mins := v_sec / 60;
        v_rem_sec := v_sec % 60;
        if v_rem_sec = 0 then
            return v_mins || ' мин';
        else
            return v_mins || ' мин ' || lpad(v_rem_sec::text, 2, '0') || ' с';
        end if;
    end if;
end;
$$;

grant execute on function public.format_duration_ru(numeric) to anon, authenticated, service_role;

-- 3. Function to compute and build the hardest words digest message
create or replace function public.build_hardest_words_digest(
    p_limit integer default 10,
    p_days integer default 7
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_app_url     text;
    v_msg         text;
    v_count       integer := 0;
    v_is_period   boolean := true;
    v_total_found integer;
    r             record;
begin
    select coalesce(value, 'https://kix.github.io/hat/') into v_app_url
    from public.app_settings
    where key = 'app_base_url';
    v_app_url := coalesce(v_app_url, 'https://kix.github.io/hat/');

    -- Check if we have enough data in the last p_days
    select count(*) into v_total_found
    from public.word_solution_times
    where created_at >= (now() - (p_days || ' days')::interval);

    if v_total_found < 3 then
        v_is_period := false;
    end if;

    if v_is_period then
        v_msg := '🧠 <b>Сложнейшие слова недели в «Шляпе»!</b> 🎩' || E'\n\n'
              || 'Слова, над отгадыванием которых игроки думали дольше всего за последние 7 дней:' || E'\n\n';
    else
        v_msg := '🧠 <b>Топ самых сложных слов в «Шляпе»!</b> 🎩' || E'\n\n'
              || 'Слова, на отгадывание которых игроки потратили больше всего времени за всё время:' || E'\n\n';
    end if;

    for r in (
        with combined_stats as (
            select
                lower(trim(w.word)) as word,
                avg(w.time_ms / 1000.0) as avg_sec,
                max(w.time_ms / 1000.0) as max_sec,
                count(*) as attempts
            from public.word_solution_times w
            where (not v_is_period or w.created_at >= (now() - (p_days || ' days')::interval))
            group by lower(trim(w.word))
        )
        select
            cs.word,
            cs.avg_sec,
            cs.max_sec,
            cs.attempts,
            coalesce(wd.definition, '') as definition
        from combined_stats cs
        left join public.word_definitions wd on wd.word = cs.word
        order by cs.avg_sec desc
        limit p_limit
    )
    loop
        v_count := v_count + 1;
        v_msg := v_msg || v_count || '. <b>' || initcap(r.word) || '</b>'
              || ' (⏱ ' || public.format_duration_ru(r.avg_sec) || ')';

        if r.definition is not null and r.definition != '' then
            v_msg := v_msg || ' — ' || r.definition;
        end if;

        v_msg := v_msg || E'\n';
    end loop;

    if v_count = 0 then
        v_msg := v_msg || 'Пока нет данных по разгаданным словам за выбранный период.' || E'\n';
    end if;

    v_msg := v_msg || E'\n' || '🎮 <b>Проверить свою эрудицию в «Шляпе»:</b> ' || v_app_url;

    return v_msg;
end;
$$;

grant execute on function public.build_hardest_words_digest(integer, integer) to anon, authenticated, service_role;

-- 4. Function to broadcast weekly hardest words to all subscribed users
create or replace function public.send_weekly_hardest_words(
    p_limit integer default 10,
    p_days integer default 7
)
returns table(sent_count integer, total_count integer)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_token      text;
    v_app_url    text;
    v_msg        text;
    v_sent       integer := 0;
    v_total      integer := 0;
    v_status     integer;
    v_content    text;
    v_keyboard   jsonb;
    r            record;
begin
    -- Token from Vault
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_token is null then
        raise notice 'send_weekly_hardest_words: no telegram_bot_token in Vault; nothing sent';
        return query select 0, 0;
        return;
    end if;

    select coalesce(value, 'https://kix.github.io/hat/') into v_app_url
    from public.app_settings
    where key = 'app_base_url';
    v_app_url := coalesce(v_app_url, 'https://kix.github.io/hat/');

    -- Build the hardest words message
    v_msg := public.build_hardest_words_digest(p_limit, p_days);

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
                    'text', '🏆 Таблица лидеров',
                    'url', v_app_url
                )
            )
        )
    );

    for r in
        select distinct telegram_id, user_id
        from public.telegram_notifications
        where enabled = true and telegram_id is not null and telegram_id != ''
    loop
        v_total := v_total + 1;
        begin
            select status, content into v_status, v_content
            from http_post(
                'https://api.telegram.org/bot' || v_token || '/sendMessage',
                jsonb_build_object(
                    'chat_id', r.telegram_id,
                    'text', v_msg,
                    'parse_mode', 'HTML',
                    'reply_markup', v_keyboard,
                    'disable_web_page_preview', false
                )::text,
                'application/json'
            );

            if v_status between 200 and 299 then
                v_sent := v_sent + 1;
                update public.telegram_notifications
                set last_status = 'weekly_digest_ok',
                    last_sent_at = now(),
                    updated_at = now()
                where telegram_id = r.telegram_id;
            else
                update public.telegram_notifications
                set last_status = 'http ' || coalesce(v_status::text, '?'),
                    updated_at = now()
                where telegram_id = r.telegram_id;
            end if;
        exception when others then
            update public.telegram_notifications
            set last_status = 'error: ' || sqlerrm,
                updated_at = now()
            where telegram_id = r.telegram_id;
        end;
    end loop;

    return query select v_sent, v_total;
end;
$$;

grant execute on function public.send_weekly_hardest_words(integer, integer) to anon, authenticated, service_role;

-- 5. Update webhook handler to support /hardest and /hardest_words
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

    if v_user_tg_id is not null then
        update public.telegram_notifications
        set last_status = 'bot_active',
            updated_at = now()
        where telegram_id = v_user_tg_id;
    end if;

    -- Command /start
    if v_text like '/start%' then
        v_reply_text := '🎩 <b>Привет, ' || replace(replace(replace(v_first_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '! Добро пожаловать в игру «Шляпа»!</b>' || E'\n\n'
            || 'Классическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!' || E'\n\n'
            || '✨ <b>Возможности:</b>' || E'\n'
            || '• Играйте локально на одном устройстве или онлайн с друзьями' || E'\n'
            || '• Огромные словари (русский и английский)' || E'\n'
            || '• Личная статистика, прокачка уровней и таблица лидеров 🏆' || E'\n'
            || '• Еженедельный дайджест самых сложных слов (/hardest)' || E'\n\n'
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

    -- Command /hardest or /hardest_words
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

-- 6. Update setup_telegram_bot_menu to include /hardest
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

    -- 2. Commands list
    select status, content into v_cmd_res
    from http_post(
        'https://api.telegram.org/bot' || v_token || '/setMyCommands',
        jsonb_build_object(
            'commands', jsonb_build_array(
                jsonb_build_object('command', 'start', 'description', '🎮 Запустить игру «Шляпа»'),
                jsonb_build_object('command', 'hardest', 'description', '🧠 Топ сложных слов с определениями'),
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

-- 7. Schedule weekly digest via pg_cron (Every Monday at 07:00 UTC / 10:00 MSK)
-- To enable in Supabase Dashboard SQL editor:
-- select cron.schedule(
--     'hat-weekly-hardest-words',
--     '0 7 * * 1',
--     $cron$ select public.send_weekly_hardest_words(); $cron$
-- );
