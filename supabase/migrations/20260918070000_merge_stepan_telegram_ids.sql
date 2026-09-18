-- =====================================================================
-- MERGE TELEGRAM IDS 1859768232841755554 AND 29768 FOR STEPAN A
-- =====================================================================
-- Primary target: telegram_id = '29768', user_id = '1c61dbe7-f81b-4d71-bd41-ca1f84a8f76a'
-- Source to merge: telegram_id = '1859768232841755554'

do $$
declare
  v_target_user_id uuid := '1c61dbe7-f81b-4d71-bd41-ca1f84a8f76a';
  v_primary_tg_id  text := '29768';
  v_oidc_tg_id     text := '1859768232841755554';
  v_oidc_user_id   uuid;
begin
  -- 1. Check if another auth.users exists with v_oidc_tg_id
  select id into v_oidc_user_id
  from auth.users
  where raw_user_meta_data->>'telegram_id' = v_oidc_tg_id
    and id != v_target_user_id;

  if v_oidc_user_id is not null then
    update public.game_participants set user_id = v_target_user_id where user_id = v_oidc_user_id;
    update public.game_summaries set user_id = v_target_user_id where user_id = v_oidc_user_id;
    update public.word_solution_times set user_id = v_target_user_id where user_id = v_oidc_user_id;
    update public.rooms set host_id = v_target_user_id where host_id = v_oidc_user_id;
    
    delete from public.telegram_notifications where user_id = v_oidc_user_id;
    delete from public.user_states where user_id = v_oidc_user_id;
    delete from auth.identities where user_id = v_oidc_user_id;
    delete from auth.users where id = v_oidc_user_id;
  end if;

  -- 2. Update target user metadata in auth.users
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'full_name', 'Stepan A',
        'first_name', 'Stepan',
        'last_name', 'A',
        'telegram_id', v_primary_tg_id,
        'username', 'kix_5',
        'avatar_url', 'https://t.me/i/userpic/320/kwbFjdIgtXoK85egMd16pdkvDwCoEZJwtj9DvXozuYA.svg',
        'provider', 'telegram'
      ),
      updated_at = now()
  where id = v_target_user_id;

  -- 3. Update or merge telegram_notifications
  delete from public.telegram_notifications where telegram_id = v_oidc_tg_id and user_id != v_target_user_id;
  
  insert into public.telegram_notifications (user_id, telegram_id, enabled, updated_at)
  values (v_target_user_id, v_primary_tg_id, true, now())
  on conflict (user_id)
  do update set
    telegram_id = v_primary_tg_id,
    enabled = true,
    updated_at = now();

  -- 4. Clean up telegram_users
  delete from public.telegram_users where telegram_id = v_oidc_tg_id;

  insert into public.telegram_users (
    telegram_id,
    username,
    first_name,
    last_name,
    full_name,
    avatar_url,
    user_id,
    updated_at
  ) values (
    v_primary_tg_id,
    'kix_5',
    'Stepan',
    'A',
    'Stepan A',
    'https://t.me/i/userpic/320/kwbFjdIgtXoK85egMd16pdkvDwCoEZJwtj9DvXozuYA.svg',
    v_target_user_id,
    now()
  )
  on conflict (telegram_id)
  do update set
    username = 'kix_5',
    first_name = 'Stepan',
    last_name = 'A',
    full_name = 'Stepan A',
    avatar_url = excluded.avatar_url,
    user_id = v_target_user_id,
    updated_at = now();

  -- 5. Ensure all game_participants for Stepan have user_id = v_target_user_id
  update public.game_participants
  set user_id = v_target_user_id
  where (player_name ilike '%Stepan%' or player_name = 'Степан')
    and (user_id is null or user_id != v_target_user_id);

end;
$$;
