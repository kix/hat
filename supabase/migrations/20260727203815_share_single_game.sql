-- =====================================================================
-- Shareable single-game link (?game=<uuid>).
-- ---------------------------------------------------------------------
-- The "Share to Telegram" button on the game-over screen links to one
-- freshly-finished game (a digest doesn't exist yet — those are built by
-- the daily cron). Like get_game_summary, this returns the game plus its
-- participants as JSON from a SECURITY DEFINER function, so the link
-- renders for ANY viewer — including logged-out ones who have no SELECT
-- grant on public.games.
-- =====================================================================

create or replace function public.get_game(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select jsonb_build_object(
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
    from public.games g
    where g.id = p_id;
$$;

grant execute on function public.get_game(uuid) to anon, authenticated;
