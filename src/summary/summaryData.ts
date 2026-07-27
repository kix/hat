import { supabase } from '../auth/supabaseClient';
import type { History, Player, Settings, Team } from '../machine/hatMachine';
import { sortTeamsByScore } from '../utils/stats';

export interface SummaryGame {
  id: string;
  createdAt: string;
  winnerTeamName: string;
  teams: Team[];
  history: History;
  settings: Settings;
}

export interface GameSummary {
  id: string;
  summaryDate: string;
  games: SummaryGame[];
}

interface ParticipantRow {
  user_id: string;
  player_name: string;
  team_name: string;
  is_winner: boolean;
}

interface GameRow {
  id: string;
  created_at: string;
  winner_team_name: string;
  history_data: History;
  settings: Settings;
  teams_data: Team[] | null;
  participants: ParticipantRow[] | null;
}

// Legacy games (saved before the teams_data snapshot existed) only carry
// player *ids* inside history_data. Rebuild a best-effort roster from those
// ids plus the participant rows so the page still renders — names resolve for
// online players (whose player id is their Supabase user id) and fall back to
// a placeholder otherwise.
function reconstructTeams(game: GameRow): Team[] {
  const participants = game.participants ?? [];
  const nameByUserId = new Map(participants.map((p) => [p.user_id, p.player_name]));
  const teamNameByUserId = new Map(participants.map((p) => [p.user_id, p.team_name]));

  const playerIdsByTeam = new Map<string, string[]>();
  for (const record of game.history_data) {
    const ids = playerIdsByTeam.get(record.teamId) ?? [];
    for (const playerId of [record.describerId, record.guesserId]) {
      if (playerId && !ids.includes(playerId)) ids.push(playerId);
    }
    playerIdsByTeam.set(record.teamId, ids);
  }

  return [...playerIdsByTeam.entries()].map(([teamId, playerIds], index) => {
    const players = playerIds.map<Player>((id) => ({ id, name: nameByUserId.get(id) ?? 'Игрок' }));
    const teamName =
      playerIds.map((id) => teamNameByUserId.get(id)).find(Boolean) ?? `Команда ${index + 1}`;
    return { id: teamId, name: teamName, players, roundsPlayed: 0 } as unknown as Team;
  });
}

function toSummaryGame(game: GameRow): SummaryGame {
  const teams =
    game.teams_data && game.teams_data.length > 0 ? game.teams_data : reconstructTeams(game);
  return {
    id: game.id,
    createdAt: game.created_at,
    winnerTeamName: game.winner_team_name,
    teams,
    history: game.history_data ?? [],
    settings: game.settings,
  };
}

// Fetches a shared daily digest by its UUID (the link target). Returns null
// if the id is unknown. A single SECURITY DEFINER RPC returns the digest and
// its games/participants — that way the shared link needs no table grants and
// the summaries table can't be enumerated.
export async function fetchSummary(summaryId: string): Promise<GameSummary | null> {
  const { data, error } = await supabase.rpc('get_game_summary', { p_id: summaryId });
  if (error) throw error;
  if (!data) return null;

  const digest = data as { id: string; summary_date: string; games: GameRow[] };
  const summaryGames = (digest.games ?? [])
    .map(toSummaryGame)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { id: digest.id, summaryDate: digest.summary_date, games: summaryGames };
}

// Convenience for a digest-level headline: total games and how many the
// viewer won (matched by their player id across every game's ranking).
export function summaryTotals(summary: GameSummary, viewerId?: string) {
  let wins = 0;
  for (const game of summary.games) {
    if (!viewerId) continue;
    const [winner] = sortTeamsByScore(game.teams, game.history);
    if (winner?.players.some((p) => p.id === viewerId)) wins += 1;
  }
  return { games: summary.games.length, wins };
}
