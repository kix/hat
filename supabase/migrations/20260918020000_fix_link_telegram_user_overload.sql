-- Drop obsolete 4-parameter overload of link_telegram_user to resolve PostgREST ambiguity
drop function if exists public.link_telegram_user(uuid, text, text, text);

-- Ensure unified 5-parameter version with default username
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

grant execute on function public.link_telegram_user(uuid, text, text, text, text) to anon, authenticated;
