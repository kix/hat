-- =====================================================================
-- SOCIAL FEATURE: daily Telegram game-summary digests + shareable pages
-- ---------------------------------------------------------------------
-- Once a day a pg_cron job runs build_and_send_daily_summaries(), which,
-- for every Telegram user who opted in AND played at least one game the
-- day before, groups those games into a public "summary" (a UUID) and
-- DMs them a link via the Telegram Bot API (through the `http` extension,
-- the same mechanism exchange_telegram_code already uses). Other players
-- who took part can open the same link and see their own stats.
--
-- Run this whole file once in the Supabase SQL editor. The pieces that
-- need YOUR input (bot token, extensions, app URL) are called out in
-- section 6 / supabase_setup.md — the feature is inert until those are set.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Snapshot the full team roster on each saved game
--    history_data only stores player *ids* inside each WordRecord, not the
--    team/player names, so a shareable summary page can't faithfully
--    rebuild the roster from it. Persist context.teams alongside it.
-- ---------------------------------------------------------------------
alter table public.games add column if not exists teams_data jsonb;

-- ---------------------------------------------------------------------
-- 2. Server-side settings (base URL for links, timezone for "the day
--    prior"). RLS is enabled with NO policies, so it is unreadable by the
--    anon/authenticated clients and only reachable from the SECURITY
--    DEFINER function below. Update the values to match your deployment.
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
    key   text primary key,
    value text
);
alter table public.app_settings enable row level security;

insert into public.app_settings (key, value) values
    -- IMPORTANT: point this at where the app is actually served. The link
    -- becomes <app_base_url>?summary=<uuid>. Keep the trailing slash.
    ('app_base_url', 'https://REPLACE_ME.example.com/hat/'),
    -- "The day prior" is computed in this timezone. The app audience is
    -- Russian-speaking, so Moscow is a sensible default; use 'UTC' if unsure.
    ('summary_tz', 'Europe/Moscow')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 3. Telegram notification opt-in. A user only gets messages if they have
--    a row here with enabled = true. Telegram forbids bots from cold-
--    messaging, so the app also deep-links them to press Start in the bot;
--    telegram_id (the OIDC `sub`) doubles as the private-chat chat_id.
-- ---------------------------------------------------------------------
create table if not exists public.telegram_notifications (
    user_id      uuid primary key references auth.users(id) on delete cascade,
    telegram_id  text not null,
    enabled      boolean not null default true,
    last_status  text,          -- outcome of the last send attempt
    last_sent_at timestamptz,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);
alter table public.telegram_notifications enable row level security;

-- Each user manages only their own opt-in row.
drop policy if exists "own telegram_notifications" on public.telegram_notifications;
create policy "own telegram_notifications"
on public.telegram_notifications
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Reuse the shared updated_at trigger (defined in supabase_setup.md §handle_updated_at).
drop trigger if exists trigger_update_telegram_notifications_time on public.telegram_notifications;
create trigger trigger_update_telegram_notifications_time
before update on public.telegram_notifications
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------
-- 4. Daily digests. One row per (user, day); its UUID is the shareable
--    link target. game_ids are the games that user played that day.
--    RLS is enabled with NO client policy — reads go through the
--    get_game_summary() RPC below (prevents enumerating every user's
--    activity timeline), writes happen only in the definer function.
-- ---------------------------------------------------------------------
create table if not exists public.game_summaries (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users(id) on delete cascade,
    summary_date date not null,
    game_ids     uuid[] not null default '{}',
    created_at   timestamptz not null default now(),
    sent_at      timestamptz,
    send_status  text,
    unique (user_id, summary_date)
);
alter table public.game_summaries enable row level security;

-- By-id lookup for the shareable page, callable without login. Returns a
-- single digest by its (unguessable) UUID; cannot list the whole table.
create or replace function public.get_game_summary(p_id uuid)
returns table (id uuid, user_id uuid, summary_date date, game_ids uuid[])
language sql
security definer
set search_path = public
as $$
    select s.id, s.user_id, s.summary_date, s.game_ids
    from public.game_summaries s
    where s.id = p_id;
$$;
grant execute on function public.get_game_summary(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. The digest builder + sender. SECURITY DEFINER so it can read the
--    bot token from Vault and write across RLS. Pass p_day to backfill a
--    specific date; defaults to "yesterday" in summary_tz. Idempotent:
--    re-running for the same day upserts the digest and re-sends.
-- ---------------------------------------------------------------------
create or replace function public.build_and_send_daily_summaries(p_day date default null)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_tz         text;
    v_base       text;
    v_token      text;
    v_day        date;
    v_start      timestamptz;
    v_end        timestamptz;
    r            record;
    v_summary_id uuid;
    v_game_ids   uuid[];
    v_num        integer;
    v_wins       integer;
    v_guessed    integer;
    v_msg        text;
    v_link       text;
    v_status     integer;
    v_content    text;
    v_sent       integer := 0;
begin
    select coalesce(value, 'UTC') into v_tz from public.app_settings where key = 'summary_tz';
    v_tz := coalesce(v_tz, 'UTC');
    select value into v_base from public.app_settings where key = 'app_base_url';

    -- Bot token lives in Supabase Vault (Dashboard → Project Settings →
    -- Vault), NEVER in the client bundle. See supabase_setup.md.
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token';

    if v_token is null then
        raise notice 'build_and_send_daily_summaries: no telegram_bot_token in Vault; nothing sent';
        return 0;
    end if;

    v_day   := coalesce(p_day, ((now() at time zone v_tz)::date - 1));
    v_start := (v_day::timestamp) at time zone v_tz;
    v_end   := ((v_day + 1)::timestamp) at time zone v_tz;

    for r in
        select n.user_id, n.telegram_id
        from public.telegram_notifications n
        where n.enabled = true
          and exists (
              select 1
              from public.game_participants gp
              join public.games g on g.id = gp.game_id
              where gp.user_id = n.user_id
                and g.created_at >= v_start
                and g.created_at <  v_end
          )
    loop
        select array_agg(distinct gp.game_id) into v_game_ids
        from public.game_participants gp
        join public.games g on g.id = gp.game_id
        where gp.user_id = r.user_id
          and g.created_at >= v_start
          and g.created_at <  v_end;

        v_num := coalesce(array_length(v_game_ids, 1), 0);
        if v_num = 0 then
            continue;
        end if;

        select count(*) into v_wins
        from public.game_participants gp
        where gp.user_id = r.user_id
          and gp.game_id = any(v_game_ids)
          and gp.is_winner;

        -- Words this user personally guessed across the day's games.
        select count(*) into v_guessed
        from public.games g
        cross join lateral jsonb_array_elements(g.history_data) as rec
        where g.id = any(v_game_ids)
          and rec->>'result' = 'guessed'
          and rec->>'guesserId' = r.user_id::text;

        insert into public.game_summaries (user_id, summary_date, game_ids)
        values (r.user_id, v_day, v_game_ids)
        on conflict (user_id, summary_date)
        do update set game_ids = excluded.game_ids
        returning id into v_summary_id;

        v_link := coalesce(v_base, '') || '?summary=' || v_summary_id::text;

        v_msg := '🎩 <b>Итоги вчерашней Шляпы</b> (' || to_char(v_day, 'DD.MM.YYYY') || ')' || E'\n\n'
              || 'Сыграно игр: <b>' || v_num || '</b>' || E'\n'
              || 'Побед: <b>' || v_wins || '</b>' || E'\n'
              || 'Вы угадали слов: <b>' || v_guessed || '</b>' || E'\n\n'
              || 'Полная статистика — и статистика других игроков — по ссылке:' || E'\n'
              || v_link;

        begin
            select status, content into v_status, v_content
            from http_post(
                'https://api.telegram.org/bot' || v_token || '/sendMessage',
                json_build_object(
                    'chat_id', r.telegram_id,
                    'text', v_msg,
                    'parse_mode', 'HTML',
                    'disable_web_page_preview', false
                )::text,
                'application/json'
            );

            update public.game_summaries
            set sent_at = now(),
                send_status = 'http ' || coalesce(v_status::text, '?')
            where id = v_summary_id;

            update public.telegram_notifications
            set last_status = 'http ' || coalesce(v_status::text, '?'),
                last_sent_at = now(),
                updated_at = now()
            where user_id = r.user_id;

            if v_status between 200 and 299 then
                v_sent := v_sent + 1;
            end if;
        exception when others then
            -- A 403 here almost always means the user never pressed Start
            -- in the bot; skip and keep going with the next user.
            update public.telegram_notifications
            set last_status = 'error: ' || sqlerrm, updated_at = now()
            where user_id = r.user_id;
            update public.game_summaries
            set send_status = 'error: ' || sqlerrm
            where id = v_summary_id;
        end;
    end loop;

    return v_sent;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Schedule it. Requires the pg_cron extension (Dashboard → Database →
--    Extensions → enable "pg_cron"). The cron expression is evaluated in
--    the cron.database's timezone (UTC on Supabase); 06:00 UTC ≈ 09:00
--    Moscow. Re-running with the same job name updates the schedule.
-- ---------------------------------------------------------------------
-- select cron.schedule(
--     'hat-daily-summaries',
--     '0 6 * * *',
--     $cron$ select public.build_and_send_daily_summaries(); $cron$
-- );
