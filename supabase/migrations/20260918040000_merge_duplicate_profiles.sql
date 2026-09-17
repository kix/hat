-- =====================================================================
-- 16. MERGE DUPLICATE PROFILES FOR FARIT AND STEPAN
-- =====================================================================

do $$
declare
    -- Farit
    v_farit_target uuid := '673232c3-33d1-49a7-8246-bcde0f710941'::uuid;
    v_farit_sources uuid[] := array[
        '9a71a02a-49fe-49d3-8b30-c34eceb5cb41'::uuid,
        '9b7923f1-abf7-4f77-a7ad-2e41ab33375c'::uuid
    ];

    -- Stepan
    v_stepan_target uuid := '1c61dbe7-f81b-4d71-bd41-ca1f84a8f76a'::uuid;
    v_stepan_sources uuid[] := array[
        '59b70f4e-89d4-49b5-b1e1-b679ee7d5908'::uuid,
        'c2df2a5f-02f1-4d1a-a83c-80361dd73d8d'::uuid,
        '00aac045-285e-4aca-aa41-c590792e43d1'::uuid,
        '5a95f1aa-8652-4b79-94e8-7fa33af6696a'::uuid,
        'bc3af1a4-0e7b-463c-8849-0cb5a158d52e'::uuid,
        '4bd5022d-0351-461d-a90c-739be32b536a'::uuid,
        'ac990d90-88bc-4f3d-9cb7-59e85601872d'::uuid,
        '4c60bb34-9efa-4040-aaf6-cf6da831ad1b'::uuid,
        '16247ba8-67cf-46e5-9267-25acc7ac10b5'::uuid,
        'd5687902-adff-4d9c-824a-3cfb0c6b0c0b'::uuid,
        '96b6d209-8dc0-4d26-ac9e-0725e94db691'::uuid,
        '266d84b9-be68-4826-9688-1558426eb957'::uuid,
        '1780ba01-9101-4585-a1b9-9e24eede9ae4'::uuid,
        'f6f273bb-4734-4146-a6e5-6df064c4b95f'::uuid,
        'bb66eed4-b8dd-460c-a3b5-3f154f366996'::uuid
    ];
begin
    -- -------------------------------------------------------------
    -- 1. MERGE FARIT
    -- -------------------------------------------------------------
    -- Transfer game participants
    update public.game_participants
    set user_id = v_farit_target
    where user_id = any(v_farit_sources);

    -- Transfer game summaries with deduplication
    delete from public.game_summaries
    where id in (
        select id from (
            select id, row_number() over (partition by summary_date order by created_at desc) as rn
            from public.game_summaries
            where user_id = v_farit_target or user_id = any(v_farit_sources)
        ) dupes
        where rn > 1
    );

    update public.game_summaries
    set user_id = v_farit_target
    where user_id = any(v_farit_sources);

    -- Transfer word solution times
    update public.word_solution_times
    set user_id = v_farit_target
    where user_id = any(v_farit_sources);

    -- Transfer rooms
    update public.rooms
    set host_id = v_farit_target
    where host_id = any(v_farit_sources);

    -- Transfer verifications
    update public.local_player_verifications
    set host_user_id = v_farit_target
    where host_user_id = any(v_farit_sources);

    update public.local_player_verifications
    set target_user_id = v_farit_target
    where target_user_id = any(v_farit_sources);

    -- Merge user_states playerNames
    insert into public.user_states (user_id, preferences, created_at, updated_at)
    values (v_farit_target, '{"playerNames":[]}'::jsonb, now(), now())
    on conflict (user_id) do nothing;

    update public.user_states
    set preferences = jsonb_build_object(
        'playerNames',
        (
            select coalesce(jsonb_agg(distinct val), '[]'::jsonb)
            from (
                select jsonb_array_elements_text(coalesce(preferences->'playerNames', '[]'::jsonb)) as val
                from public.user_states
                where user_id = v_farit_target or user_id = any(v_farit_sources)
            ) sub
            where val is not null and val != ''
        )
    ),
    updated_at = now()
    where user_id = v_farit_target;

    delete from public.user_states where user_id = any(v_farit_sources);

    -- Update games history_data
    update public.games g
    set history_data = (
      select jsonb_agg(
        case
          when (elem->>'describerId') is not null and (elem->>'describerId')::uuid = any(v_farit_sources)
               and (elem->>'guesserId') is not null and (elem->>'guesserId')::uuid = any(v_farit_sources)
            then elem || jsonb_build_object('describerId', v_farit_target::text, 'guesserId', v_farit_target::text)
          when (elem->>'describerId') is not null and (elem->>'describerId')::uuid = any(v_farit_sources)
            then elem || jsonb_build_object('describerId', v_farit_target::text)
          when (elem->>'guesserId') is not null and (elem->>'guesserId')::uuid = any(v_farit_sources)
            then elem || jsonb_build_object('guesserId', v_farit_target::text)
          else elem
        end
      )
      from jsonb_array_elements(g.history_data) as elem
    )
    where g.history_data is not null;

    -- Ensure Telegram records
    delete from public.telegram_notifications where user_id = any(v_farit_sources);
    delete from public.telegram_notifications where telegram_id = '176055421' and user_id != v_farit_target;

    insert into public.telegram_notifications (user_id, telegram_id, enabled, updated_at)
    values (v_farit_target, '176055421', true, now())
    on conflict (user_id) do update
    set telegram_id = excluded.telegram_id, enabled = true, updated_at = now();

    insert into public.telegram_users (telegram_id, full_name, user_id, updated_at)
    values ('176055421', 'Farit Amirov', v_farit_target, now())
    on conflict (telegram_id) do update
    set user_id = excluded.user_id, full_name = coalesce(public.telegram_users.full_name, excluded.full_name), updated_at = now();

    -- Delete old user records from auth
    delete from auth.identities where user_id = any(v_farit_sources);
    delete from auth.users where id = any(v_farit_sources);


    -- -------------------------------------------------------------
    -- 2. MERGE STEPAN
    -- -------------------------------------------------------------
    -- Transfer game participants
    update public.game_participants
    set user_id = v_stepan_target
    where user_id = any(v_stepan_sources);

    -- Transfer game summaries with deduplication
    delete from public.game_summaries
    where id in (
        select id from (
            select id, row_number() over (partition by summary_date order by created_at desc) as rn
            from public.game_summaries
            where user_id = v_stepan_target or user_id = any(v_stepan_sources)
        ) dupes
        where rn > 1
    );

    update public.game_summaries
    set user_id = v_stepan_target
    where user_id = any(v_stepan_sources);

    -- Transfer word solution times
    update public.word_solution_times
    set user_id = v_stepan_target
    where user_id = any(v_stepan_sources);

    -- Transfer rooms
    update public.rooms
    set host_id = v_stepan_target
    where host_id = any(v_stepan_sources);

    -- Transfer verifications
    update public.local_player_verifications
    set host_user_id = v_stepan_target
    where host_user_id = any(v_stepan_sources);

    update public.local_player_verifications
    set target_user_id = v_stepan_target
    where target_user_id = any(v_stepan_sources);

    -- Merge user_states playerNames
    insert into public.user_states (user_id, preferences, created_at, updated_at)
    values (v_stepan_target, '{"playerNames":[]}'::jsonb, now(), now())
    on conflict (user_id) do nothing;

    update public.user_states
    set preferences = jsonb_build_object(
        'playerNames',
        (
            select coalesce(jsonb_agg(distinct val), '[]'::jsonb)
            from (
                select jsonb_array_elements_text(coalesce(preferences->'playerNames', '[]'::jsonb)) as val
                from public.user_states
                where user_id = v_stepan_target or user_id = any(v_stepan_sources)
            ) sub
            where val is not null and val != ''
        )
    ),
    updated_at = now()
    where user_id = v_stepan_target;

    delete from public.user_states where user_id = any(v_stepan_sources);

    -- Update games history_data
    update public.games g
    set history_data = (
      select jsonb_agg(
        case
          when (elem->>'describerId') is not null and (elem->>'describerId')::uuid = any(v_stepan_sources)
               and (elem->>'guesserId') is not null and (elem->>'guesserId')::uuid = any(v_stepan_sources)
            then elem || jsonb_build_object('describerId', v_stepan_target::text, 'guesserId', v_stepan_target::text)
          when (elem->>'describerId') is not null and (elem->>'describerId')::uuid = any(v_stepan_sources)
            then elem || jsonb_build_object('describerId', v_stepan_target::text)
          when (elem->>'guesserId') is not null and (elem->>'guesserId')::uuid = any(v_stepan_sources)
            then elem || jsonb_build_object('guesserId', v_stepan_target::text)
          else elem
        end
      )
      from jsonb_array_elements(g.history_data) as elem
    )
    where g.history_data is not null;

    -- Ensure Telegram records
    delete from public.telegram_notifications where user_id = any(v_stepan_sources);
    delete from public.telegram_notifications where telegram_id in ('29768', '1859768232841755554') and user_id != v_stepan_target;

    insert into public.telegram_notifications (user_id, telegram_id, enabled, updated_at)
    values (v_stepan_target, '29768', true, now())
    on conflict (user_id) do update
    set telegram_id = excluded.telegram_id, enabled = true, updated_at = now();

    insert into public.telegram_users (telegram_id, username, full_name, user_id, updated_at)
    values ('29768', 'kix_5', 'Stepan A', v_stepan_target, now())
    on conflict (telegram_id) do update
    set user_id = excluded.user_id, username = 'kix_5', full_name = 'Stepan A', updated_at = now();

    insert into public.telegram_users (telegram_id, username, full_name, user_id, updated_at)
    values ('1859768232841755554', 'kix_5', 'Stepan A', v_stepan_target, now())
    on conflict (telegram_id) do update
    set user_id = excluded.user_id, username = 'kix_5', full_name = 'Stepan A', updated_at = now();

    -- Delete old user records from auth
    delete from auth.identities where user_id = any(v_stepan_sources);
    delete from auth.users where id = any(v_stepan_sources);

end;
$$;
