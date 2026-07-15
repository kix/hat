-- =====================================================================
-- МИГРАЦИЯ ДЛЯ ОНЛАЙН-МУЛЬТИПЛЕЕРА (ТАБЛИЦА ROOMS)
-- =====================================================================

-- Создание таблицы rooms для хранения состояния игровых сессий
create table if not exists public.rooms (
    id text primary key, -- 4-значный код комнаты (например, 1234)
    host_id uuid references auth.users(id) on delete cascade not null,
    state jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Включаем Row Level Security (RLS)
alter table public.rooms enable row level security;

-- Политики безопасности (RLS)

-- 1. Разрешаем всем (включая анонимных участников) просматривать комнаты
create policy "Allow everyone to read rooms" 
on public.rooms 
for select 
to anon, authenticated 
using (true);

-- 2. Разрешаем всем авторизованным/анонимным пользователям создавать новые комнаты
create policy "Allow everyone to create rooms" 
on public.rooms 
for insert 
to anon, authenticated 
with check (auth.uid() = host_id);

-- 3. Разрешаем только хосту (создателю) обновлять состояние комнаты
create policy "Allow host to update their room" 
on public.rooms 
for update 
to anon, authenticated 
using (auth.uid() = host_id) 
with check (auth.uid() = host_id);

-- 4. Разрешаем только хосту удалять комнату
create policy "Allow host to delete their room" 
on public.rooms 
for delete 
to anon, authenticated 
using (auth.uid() = host_id);

-- Назначаем триггер автообновления времени изменения
create trigger trigger_update_rooms_time
    before update on public.rooms
    for each row
    execute function public.handle_updated_at();
