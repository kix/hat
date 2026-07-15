-- =====================================================================
-- МИГРАЦИЯ ДЛЯ ГЛОБАЛЬНОЙ СТАТИСТИКИ И ИСТОРИИ ИГР
-- =====================================================================

-- Создание таблицы игр games
create table if not exists public.games (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    winner_team_name text not null,
    history_data jsonb not null, -- массив WordRecord[]
    settings jsonb not null      -- объект Settings
);

-- Создание таблицы участников игры game_participants
create table if not exists public.game_participants (
    id bigint generated always as identity primary key,
    game_id uuid references public.games(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    player_name text not null,
    team_name text not null,
    is_winner boolean not null
);

-- Индексы для оптимизации выборок статистики
create index if not exists idx_game_participants_user_id on public.game_participants(user_id);
create index if not exists idx_game_participants_game_id on public.game_participants(game_id);

-- Включаем RLS
alter table public.games enable row level security;
alter table public.game_participants enable row level security;

-- Политики безопасности для public.games
create policy "Allow everyone to read games" 
on public.games 
for select 
to anon, authenticated 
using (true);

create policy "Allow everyone to insert games" 
on public.games 
for insert 
to anon, authenticated 
with check (true);

-- Политики безопасности для public.game_participants
create policy "Allow everyone to read game_participants" 
on public.game_participants 
for select 
to anon, authenticated 
using (true);

create policy "Allow everyone to insert game_participants" 
on public.game_participants 
for insert 
to anon, authenticated 
with check (true);
