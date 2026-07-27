-- =====================================================================
-- Make the shareable summary link work for ANY viewer.
-- ---------------------------------------------------------------------
-- The initial get_game_summary returned only the digest, leaving the
-- client to re-read public.games. But `anon` has no SELECT grant on
-- public.games, so a logged-out person opening a shared link got a
-- "permission denied" (42501) after the digest loaded.
--
-- Fix: return the games + participants straight from this SECURITY
-- DEFINER function, which bypasses table grants. Now the link renders
-- for anyone, logged in or not, and the client never touches public.games.
--
-- A return-type change (table -> jsonb) requires dropping first;
-- CREATE OR REPLACE cannot change a function's return type.
-- =====================================================================

drop function if exists public.get_game_summary(uuid);

create or replace function public.get_game_summary(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'id', s.id,
        'summary_date', s.summary_date,
        'games', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', g.id,
                    'created_at', g.created_at,
                    'winner_team_name', g.winner_team_name,
                    'history_data', g.history_data,
                    'settings', g.settings,
                    'teams_data', g.teams_data,
                    'participants', coalesce((
                        select jsonb_agg(jsonb_build_object(
                            'user_id', gp.user_id,
                            'player_name', gp.player_name,
                            'team_name', gp.team_name,
                            'is_winner', gp.is_winner
                        ))
                        from public.game_participants gp
                        where gp.game_id = g.id
                    ), '[]'::jsonb)
                )
                order by g.created_at
            )
            from public.games g
            where g.id = any(s.game_ids)
        ), '[]'::jsonb)
    )
    from public.game_summaries s
    where s.id = p_id;
$$;

grant execute on function public.get_game_summary(uuid) to anon, authenticated;
