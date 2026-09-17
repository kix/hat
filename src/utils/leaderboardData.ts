import { supabase } from '../auth/supabaseClient';
import { getLevelFromXP, calculateGameXP } from './levels';

export interface LeaderboardEntry {
  userId: string;
  playerName: string;
  avatarUrl?: string;
  gamesCount: number;
  winsCount: number;
  winRate: number;
  wordsCount: number;
  fastWordsCount: number;
  cleanGamesCount: number;
  totalXP: number;
  level: number;
  rankTitle: string;
  badgeColor: string;
  emoji: string;
}

/**
 * Loads leaderboard entries from Supabase RPC with client fallback.
 */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  try {
    // 1. Try RPC function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_leaderboard', {
      p_limit: limit,
    });

    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.map((row: any) => {
        const lvl = getLevelFromXP(Number(row.total_xp || 0));
        return {
          userId: row.user_id,
          playerName: row.player_name || 'Игрок',
          avatarUrl: row.avatar_url || '',
          gamesCount: Number(row.games_count || 0),
          winsCount: Number(row.wins_count || 0),
          winRate: Number(row.win_rate || 0),
          wordsCount: Number(row.words_count || 0),
          fastWordsCount: Number(row.fast_words_count || 0),
          cleanGamesCount: Number(row.clean_games_count || 0),
          totalXP: Number(row.total_xp || 0),
          level: lvl.level,
          rankTitle: lvl.titleKey,
          badgeColor: lvl.badgeColor,
          emoji: lvl.emoji,
        };
      });
    }

    // 2. Client-side fallback: fetch participations & games
    const { data: parts, error: partsErr } = await supabase
      .from('game_participants')
      .select('*, games:game_id (*)')
      .limit(1000);

    if (partsErr || !parts) {
      console.warn('Leaderboard fallback error:', partsErr);
      return [];
    }

    const userMap = new Map<string, {
      userId: string;
      name: string;
      games: Set<string>;
      wins: Set<string>;
      history: any[];
      cleanGamesCount: number;
    }>();

    parts.forEach((p) => {
      if (!p.user_id) return;
      if (!userMap.has(p.user_id)) {
        userMap.set(p.user_id, {
          userId: p.user_id,
          name: p.player_name || 'Игрок',
          games: new Set(),
          wins: new Set(),
          history: [],
          cleanGamesCount: 0,
        });
      }

      const entry = userMap.get(p.user_id)!;
      if (p.player_name) entry.name = p.player_name;
      if (p.game_id) entry.games.add(p.game_id);
      if (p.is_winner && p.game_id) entry.wins.add(p.game_id);

      if (p.games?.history_data) {
        entry.history.push(...p.games.history_data);
      }
    });

    const entries: LeaderboardEntry[] = [];
    userMap.forEach((u) => {
      const gamesCount = u.games.size;
      const winsCount = u.wins.size;
      const winRate = gamesCount > 0 ? Math.round((winsCount / gamesCount) * 100) : 0;

      const breakdown = calculateGameXP(u.history, u.userId, false);
      const totalXP = (gamesCount * 50) + (winsCount * 100) + breakdown.wordsXP + breakdown.fastWordsBonusXP;
      const lvl = getLevelFromXP(totalXP);

      entries.push({
        userId: u.userId,
        playerName: u.name,
        avatarUrl: '',
        gamesCount,
        winsCount,
        winRate,
        wordsCount: breakdown.wordsCount,
        fastWordsCount: breakdown.fastWordsCount,
        cleanGamesCount: 0,
        totalXP,
        level: lvl.level,
        rankTitle: lvl.titleKey,
        badgeColor: lvl.badgeColor,
        emoji: lvl.emoji,
      });
    });

    entries.sort((a, b) => b.totalXP - a.totalXP || b.winsCount - a.winsCount || b.gamesCount - a.gamesCount);
    return entries.slice(0, limit);
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    return [];
  }
}

export interface HardestWordEntry {
  word: string;
  avgSec: number;
  maxSec: number;
  solvesCount: number;
  definition?: string;
}

/**
 * Loads the hardest words statistics from Supabase RPC or client aggregation fallback.
 */
export async function fetchHardestWords(limit = 10): Promise<HardestWordEntry[]> {
  try {
    // 1. Try RPC function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_hardest_words', {
      p_limit: limit,
    });

    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.map((row: any) => ({
        word: row.word,
        avgSec: Number(row.avg_sec || 0),
        maxSec: Number(row.max_sec || 0),
        solvesCount: Number(row.solves_count || 0),
        definition: row.definition || undefined,
      }));
    }

    // 2. Client fallback: query word_solution_times, games and word_definitions
    const [solTimesRes, gamesRes, defsRes] = await Promise.all([
      supabase.from('word_solution_times').select('word, time_ms').limit(1000),
      supabase.from('games').select('history_data').limit(500),
      supabase.from('word_definitions').select('word, definition').limit(500),
    ]);

    const statsMap = new Map<string, {
      word: string;
      count: number;
      totalMs: number;
      maxMs: number;
    }>();

    const recordTime = (word: string, ms: number) => {
      if (!word || typeof ms !== 'number' || ms <= 0) return;
      const clean = word.trim().toLowerCase();
      if (!clean) return;
      if (!statsMap.has(clean)) {
        statsMap.set(clean, { word: clean, count: 0, totalMs: 0, maxMs: 0 });
      }
      const item = statsMap.get(clean)!;
      item.count += 1;
      item.totalMs += ms;
      item.maxMs = Math.max(item.maxMs, ms);
    };

    if (solTimesRes.data) {
      solTimesRes.data.forEach((r: any) => recordTime(r.word, r.time_ms));
    }
    if (gamesRes.data) {
      gamesRes.data.forEach((g: any) => {
        const hist = g.history_data || [];
        hist.forEach((rec: any) => {
          if (rec.word && typeof rec.timeMs === 'number' && rec.timeMs > 0) {
            recordTime(rec.word, rec.timeMs);
          }
        });
      });
    }

    const defsMap = new Map<string, string>();
    if (defsRes.data) {
      defsRes.data.forEach((d: any) => {
        if (d.word && d.definition) defsMap.set(d.word.trim().toLowerCase(), d.definition);
      });
    }

    const list: HardestWordEntry[] = Array.from(statsMap.values()).map((item) => {
      const avgSec = Number((item.totalMs / item.count / 1000).toFixed(1));
      const maxSec = Number((item.maxMs / 1000).toFixed(1));
      return {
        word: item.word,
        avgSec,
        maxSec,
        solvesCount: item.count,
        definition: defsMap.get(item.word),
      };
    });

    list.sort((a, b) => b.avgSec - a.avgSec);
    return list.slice(0, limit);
  } catch (err) {
    console.error('Failed to load hardest words:', err);
    return [];
  }
}

