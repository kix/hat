-- =====================================================================
-- 9. RPC FUNCTION TO REGISTER/SIGN IN TELEGRAM USER DIRECTLY
-- =====================================================================
create or replace function public.register_telegram_user(
  p_telegram_id text,
  p_full_name text,
  p_avatar_url text,
  p_password text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_email text;
  v_crypted_password text;
begin
  v_email := 'tg_' || p_telegram_id || '@telegram.com';
  
  -- Check if user already exists
  select id into v_user_id from auth.users where email = v_email;
  
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    v_crypted_password := crypt(p_password, gen_salt('bf'));
    
    insert into auth.users (
      id,
      instance_id,
      role,
      aud,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      v_crypted_password,
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object(
        'full_name', p_full_name,
        'avatar_url', p_avatar_url,
        'telegram_id', p_telegram_id,
        'provider', 'telegram'
      ),
      now(),
      now()
    );
    
    -- Insert a default row into telegram_notifications
    insert into public.telegram_notifications (user_id, telegram_id, enabled)
    values (v_user_id, p_telegram_id, true)
    on conflict (user_id) do nothing;
  else
    -- If user exists, update their metadata
    update auth.users
    set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
      'full_name', p_full_name,
      'avatar_url', p_avatar_url,
      'telegram_id', p_telegram_id
    ),
    updated_at = now()
    where id = v_user_id;
  end if;
  
  return v_user_id;
end;
$$;

grant execute on function public.register_telegram_user(text, text, text, text) to anon, authenticated;
