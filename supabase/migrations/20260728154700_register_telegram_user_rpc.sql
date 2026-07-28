-- =====================================================================
-- 9. RPC FUNCTION TO MERGE/LINK TELEGRAM USER SESSIONS
-- =====================================================================
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
  -- 1. Находим старого пользователя с таким же telegram_id
  select id into v_old_user_id 
  from auth.users 
  where raw_user_meta_data->>'telegram_id' = p_telegram_id
    and id != p_new_user_id;
    
  if v_old_user_id is not null then
    -- 2. Объединяем/переносим данные из таблиц public
    
    -- Переносим участников игр
    update public.game_participants 
    set user_id = p_new_user_id 
    where user_id = v_old_user_id;
    
    -- Переносим ежедневные сводки
    update public.game_summaries
    set user_id = p_new_user_id
    where user_id = v_old_user_id;
    
    -- Переносим статистику решения слов
    update public.word_solution_times
    set user_id = p_new_user_id
    where user_id = v_old_user_id;
    
    -- Переносим комнаты, где он хост
    update public.rooms
    set host_id = p_new_user_id
    where host_id = v_old_user_id;
    
    -- Переносим/обновляем статус уведомлений
    delete from public.telegram_notifications 
    where user_id = p_new_user_id;
    
    update public.telegram_notifications
    set user_id = p_new_user_id
    where user_id = v_old_user_id;
    
    -- Переносим достижения и состояние профиля (user_states)
    -- Но сначала удалим пустой профиль нового анонимного пользователя, если он был автоматически создан
    delete from public.user_states
    where user_id = p_new_user_id;
    
    update public.user_states
    set user_id = p_new_user_id
    where user_id = v_old_user_id;
    
    -- 3. Обновляем history_data в таблице games для всех игр, в которых участвовал старый пользователь
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
      select game_id 
      from public.game_participants 
      where user_id = p_new_user_id
    );

    -- 4. Удаляем старый профиль из auth.users и auth.identities
    delete from auth.identities where user_id = v_old_user_id;
    delete from auth.users where id = v_old_user_id;
  end if;

  -- 5. Обновляем метаданные нового анонимного пользователя, делая его полноценным Telegram-аккаунтом
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'full_name', p_full_name,
        'avatar_url', p_avatar_url,
        'telegram_id', p_telegram_id,
        'provider', 'telegram'
      ),
      updated_at = now()
  where id = p_new_user_id;

  -- 6. Создаем/обновляем привязку уведомлений для нового user_id
  insert into public.telegram_notifications (user_id, telegram_id, enabled)
  values (p_new_user_id, p_telegram_id, true)
  on conflict (user_id) 
  do update set telegram_id = excluded.telegram_id;
end;
$$;

grant execute on function public.link_telegram_user(uuid, text, text, text) to anon, authenticated;
