-- =====================================================================
-- 11. LEADERBOARD RPC: GLOBAL PLAYER RANKINGS BY XP, WINS, AND WORDS
-- =====================================================================

create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  user_id uuid,
  player_name text,
  avatar_url text,
  games_count bigint,
  wins_count bigint,
  win_rate integer,
  words_count bigint,
  fast_words_count bigint,
  clean_games_count bigint,
  total_xp bigint,
  level integer,
  rank_title text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  with player_stats as (
    select
      gp.user_id,
      (array_agg(gp.player_name order by gp.id desc))[1] as latest_name,
      count(distinct gp.game_id) as total_games,
      count(distinct gp.game_id) filter (where gp.is_winner) as total_wins
    from public.game_participants gp
    group by gp.user_id
  ),
  user_meta as (
    select
      u.id,
      coalesce(u.raw_user_meta_data->>'full_name', '') as meta_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', '') as meta_avatar
    from auth.users u
  ),
  word_stats as (
    select
      gp.user_id,
      count(*) filter (where rec->>'result' = 'guessed' and (rec->>'guesserId' = gp.user_id::text or rec->>'describerId' = gp.user_id::text)) as words_solved,
      count(*) filter (where rec->>'result' = 'guessed' and (rec->>'guesserId' = gp.user_id::text or rec->>'describerId' = gp.user_id::text) and (rec->>'timeMs')::numeric < 3000) as fast_words,
      count(distinct g.id) filter (where gp.is_winner and not exists (
        select 1 from jsonb_array_elements(g.history_data) as f_rec
        where f_rec->>'result' = 'foul' and (f_rec->>'guesserId' = gp.user_id::text or f_rec->>'describerId' = gp.user_id::text or f_rec->>'teamId' = gp.team_name)
      )) as clean_games
    from public.game_participants gp
    join public.games g on g.id = gp.game_id
    cross join lateral jsonb_array_elements(g.history_data) as rec
    group by gp.user_id
  ),
  computed as (
    select
      ps.user_id,
      coalesce(nullif(um.meta_name, ''), ps.latest_name, 'Игрок') as final_name,
      coalesce(um.meta_avatar, '') as final_avatar,
      ps.total_games as g_count,
      ps.total_wins as w_count,
      case when ps.total_games > 0 then round((ps.total_wins::numeric / ps.total_games::numeric) * 100)::integer else 0 end as w_rate,
      coalesce(ws.words_solved, 0) as w_solved,
      coalesce(ws.fast_words, 0) as f_words,
      coalesce(ws.clean_games, 0) as c_games,
      -- XP Formula: 50*games + 100*wins + 10*words + 5*fast_words + 30*clean_games
      (
        (ps.total_games * 50) +
        (ps.total_wins * 100) +
        (coalesce(ws.words_solved, 0) * 10) +
        (coalesce(ws.fast_words, 0) * 5) +
        (coalesce(ws.clean_games, 0) * 30)
      )::bigint as calc_xp
    from player_stats ps
    left join user_meta um on um.id = ps.user_id
    left join word_stats ws on ws.user_id = ps.user_id
  )
  select
    c.user_id,
    c.final_name,
    c.final_avatar,
    c.g_count,
    c.w_count,
    c.w_rate,
    c.w_solved,
    c.f_words,
    c.c_games,
    c.calc_xp,
    -- Level calculation
    case
      when c.calc_xp >= 8000 then 10 + floor((c.calc_xp - 8000) / 2500)::integer
      when c.calc_xp >= 6000 then 9
      when c.calc_xp >= 4500 then 8
      when c.calc_xp >= 3200 then 7
      when c.calc_xp >= 2200 then 6
      when c.calc_xp >= 1400 then 5
      when c.calc_xp >= 800 then 4
      when c.calc_xp >= 400 then 3
      when c.calc_xp >= 150 then 2
      else 1
    end as level,
    case
      when c.calc_xp >= 8000 then 'Повелитель Шляпы'
      when c.calc_xp >= 6000 then 'Верховный Маг'
      when c.calc_xp >= 4500 then 'Легенда'
      when c.calc_xp >= 3200 then 'Гроссмейстер'
      when c.calc_xp >= 2200 then 'Телепат'
      when c.calc_xp >= 1400 then 'Мастер Шляпы'
      when c.calc_xp >= 800 then 'Эрудит'
      when c.calc_xp >= 400 then 'Знаток'
      when c.calc_xp >= 150 then 'Любитель'
      else 'Новичок'
    end as rank_title
  from computed c
  order by c.calc_xp desc, c.w_count desc, c.g_count desc
  limit coalesce(p_limit, 50);
end;
$$;

grant execute on function public.get_leaderboard(int) to anon, authenticated, service_role;
