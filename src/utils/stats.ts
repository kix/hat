import type { History, Player, Team, WordRecord } from '../machine/hatMachine';
import { getTeamScore } from './scoring';

export function sortTeamsByScore(teams: Team[], history: History): Team[] {
  return [...teams].sort((a, b) => getTeamScore(history, b.id) - getTeamScore(history, a.id));
}

export interface IndividualPlayerScore {
  player: Player;
  score: number;
  guessed: number;
  explained: number;
  fouls: number;
  skips: number;
}

export function getIndividualLeaderboard(players: Player[], history: History): IndividualPlayerScore[] {
  return players
    .map((player) => {
      let guessed = 0;
      let explained = 0;
      let fouls = 0;
      let skips = 0;

      history.forEach((record) => {
        if (record.guesserId === player.id && record.result === 'guessed') {
          guessed++;
        }
        if (record.describerId === player.id) {
          if (record.result === 'guessed') explained++;
          else if (record.result === 'foul') fouls++;
          else if (record.result === 'skipped') skips++;
        }
      });

      const score = (guessed + explained) - (fouls + skips);
      return { player, score, guessed, explained, fouls, skips };
    })
    .sort((a, b) => b.score - a.score || b.guessed - a.guessed || b.explained - a.explained);
}

export interface BestTandem {
  player1: Player;
  player2: Player;
  wordsGuessed: number;
  totalScore: number;
}

export function getBestTandem(players: Player[], history: History): BestTandem | null {
  if (players.length < 2) return null;
  const tandemMap = new Map<string, { p1: Player; p2: Player; wordsGuessed: number; totalScore: number }>();

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      const key = `${p1.id}_${p2.id}`;
      tandemMap.set(key, { p1, p2, wordsGuessed: 0, totalScore: 0 });
    }
  }

  history.forEach((record) => {
    const p1Id = record.describerId;
    const p2Id = record.guesserId;
    const entry = tandemMap.get(`${p1Id}_${p2Id}`) || tandemMap.get(`${p2Id}_${p1Id}`);
    if (entry) {
      if (record.result === 'guessed') {
        entry.wordsGuessed++;
        entry.totalScore += 2;
      } else if (record.result === 'foul' || record.result === 'skipped') {
        entry.totalScore -= 1;
      }
    }
  });

  let best: BestTandem | null = null;
  tandemMap.forEach((entry) => {
    if (
      entry.wordsGuessed > 0 &&
      (!best ||
        entry.wordsGuessed > best.wordsGuessed ||
        (entry.wordsGuessed === best.wordsGuessed && entry.totalScore > best.totalScore))
    ) {
      best = {
        player1: entry.p1,
        player2: entry.p2,
        wordsGuessed: entry.wordsGuessed,
        totalScore: entry.totalScore,
      };
    }
  });

  return best;
}

export interface BestPlayer {
  team: Team;
  player: Player;
  guessedCount: number;
}

export function getBestPlayer(teams: Team[], history: History): BestPlayer | null {
  let best: BestPlayer | null = null;
  for (const team of teams) {
    for (const player of team.players) {
      const guessedCount = history.filter(
        (record) => record.result === 'guessed' && record.guesserId === player.id,
      ).length;
      if (guessedCount > 0 && (!best || guessedCount > best.guessedCount)) {
        best = { team, player, guessedCount };
      }
    }
  }
  return best;
}

export function getHardestWord(history: History): WordRecord | null {
  const guessed = history.filter((record) => record.result === 'guessed');
  if (guessed.length === 0) return null;
  return guessed.reduce((slowest, record) => (record.timeMs > slowest.timeMs ? record : slowest));
}

export function getEasiestWord(history: History): WordRecord | null {
  const guessed = history.filter((record) => record.result === 'guessed');
  if (guessed.length === 0) return null;
  return guessed.reduce((fastest, record) => (record.timeMs < fastest.timeMs ? record : fastest));
}

function getGuessedWordsForRound(history: History, teamId: string, roundIndex: number): WordRecord[] {
  return history.filter(
    (record) => record.teamId === teamId && record.roundIndex === roundIndex && record.result === 'guessed',
  );
}

export interface LastRoundRecap {
  team: Team;
  guessed: WordRecord[];
}

// Derived from the last history entry rather than currentTeamIndex/
// roundsPlayed: those only advance via roundEnd's entry action, which is
// skipped when a guess/skip/foul empties the hat mid-round and jumps
// straight to gameOver — so they can't be trusted to identify "the team
// whose round just ended" in every case. The last history record always can:
// it belongs to whichever team/round most recently had a word resolved.
// Returns null before any word has been resolved yet (game just started).
export function getLastRoundRecap(teams: Team[], history: History): LastRoundRecap | null {
  if (history.length === 0) return null;
  const lastRecord = history[history.length - 1];
  const team = teams.find((candidate) => candidate.id === lastRecord.teamId);
  if (!team) return null;

  return { team, guessed: getGuessedWordsForRound(history, team.id, lastRecord.roundIndex) };
}

// Words the currently-playing team has guessed so far *this* round (i.e. the
// round in progress — team.roundsPlayed hasn't been incremented for it yet).
export function getCurrentRoundGuessedCount(teams: Team[], history: History, currentTeamIndex: number): number {
  const team = teams[currentTeamIndex];
  if (!team) return 0;
  return getGuessedWordsForRound(history, team.id, team.roundsPlayed).length;
}

export interface HintedWord {
  word: string;
  strugglingTeamId: string;
  strugglingTimeMs: number;
  helpedTeamId: string;
  helpedTimeMs: number;
}

export const DEFAULT_QUICK_GUESS_MS = 2000;

// A word can only reappear in history if it timed out (guessed/skipped/foul
// remove it for good), so "подсказали" ("tipped off") looks for: team A
// times out on a word, and the very next team in turn order later guesses
// that same word suspiciously fast.
export function getHintedWords(
  teams: Team[],
  history: History,
  quickGuessMs: number = DEFAULT_QUICK_GUESS_MS,
): HintedWord[] {
  const hinted: HintedWord[] = [];
  if (teams.length <= 1) return hinted;

  history.forEach((record, index) => {
    if (record.result !== 'timeout') return;

    const strugglingTeamIndex = teams.findIndex((team) => team.id === record.teamId);
    if (strugglingTeamIndex === -1) return;
    const nextTeam = teams[(strugglingTeamIndex + 1) % teams.length];

    const nextOccurrence = history.slice(index + 1).find((candidate) => candidate.word === record.word);
    if (!nextOccurrence) return;

    if (
      nextOccurrence.result === 'guessed' &&
      nextOccurrence.teamId === nextTeam.id &&
      nextOccurrence.timeMs <= quickGuessMs
    ) {
      hinted.push({
        word: record.word,
        strugglingTeamId: record.teamId,
        strugglingTimeMs: record.timeMs,
        helpedTeamId: nextOccurrence.teamId,
        helpedTimeMs: nextOccurrence.timeMs,
      });
    }
  });

  return hinted;
}

export interface StolenWord {
  word: string;
  victimTeamName: string;
  victimPlayerName: string;
  thiefTeamName: string;
  thiefPlayerName: string;
  failureReason: 'timeout' | 'foul' | 'skipped';
}

export function getStolenWords(teams: Team[], history: History): StolenWord[] {
  const stolen: StolenWord[] = [];
  
  history.forEach((record, index) => {
    if (record.result !== 'guessed') return;
    
    const priorFailure = history.slice(0, index).find(
      (candidate) => 
        candidate.word === record.word && 
        candidate.teamId !== record.teamId &&
        (candidate.result === 'timeout' || candidate.result === 'foul' || candidate.result === 'skipped')
    );
    
    if (priorFailure) {
      const victimTeam = teams.find(t => t.id === priorFailure.teamId);
      const victimPlayer = victimTeam?.players.find(p => p.id === priorFailure.describerId);
      
      const thiefTeam = teams.find(t => t.id === record.teamId);
      const thiefPlayer = thiefTeam?.players.find(p => p.id === record.guesserId);
      
      stolen.push({
        word: record.word,
        victimTeamName: victimTeam?.name || 'Другая команда',
        victimPlayerName: victimPlayer?.name || 'Игрок',
        thiefTeamName: thiefTeam?.name || 'Своя команда',
        thiefPlayerName: thiefPlayer?.name || 'Игрок',
        failureReason: priorFailure.result as 'timeout' | 'foul' | 'skipped'
      });
    }
  });
  
  return stolen;
}

export interface RuleBreaker {
  playerName: string;
  teamName: string;
  foulCount: number;
}

export function getRuleBreakers(teams: Team[], history: History): RuleBreaker[] {
  const foulsMap = new Map<string, { playerName: string; teamName: string; count: number }>();
  
  history.forEach((record) => {
    if (record.result === 'foul') {
      const team = teams.find(t => t.id === record.teamId);
      const player = team?.players.find(p => p.id === record.describerId);
      if (player) {
        const key = player.id;
        const existing = foulsMap.get(key) || { playerName: player.name, teamName: team?.name || '', count: 0 };
        existing.count++;
        foulsMap.set(key, existing);
      }
    }
  });
  
  return Array.from(foulsMap.values())
    .map(f => ({ playerName: f.playerName, teamName: f.teamName, foulCount: f.count }))
    .sort((a, b) => b.foulCount - a.foulCount);
}

export interface SingleGuess {
  playerName: string;
  teamName: string;
  word: string;
  timeMs: number;
}

export function getFastestGuess(teams: Team[], history: History): SingleGuess | null {
  const guessed = history.filter((r) => r.result === 'guessed');
  if (guessed.length === 0) return null;
  const bestRecord = guessed.reduce((fastest, record) => (record.timeMs < fastest.timeMs ? record : fastest));
  
  const team = teams.find(t => t.id === bestRecord.teamId);
  const player = team?.players.find(p => p.id === bestRecord.guesserId);
  return {
    playerName: player?.name || 'Игрок',
    teamName: team?.name || 'Команда',
    word: bestRecord.word,
    timeMs: bestRecord.timeMs
  };
}

export function getSlowestGuess(teams: Team[], history: History): SingleGuess | null {
  const guessed = history.filter((r) => r.result === 'guessed');
  if (guessed.length === 0) return null;
  const worstRecord = guessed.reduce((slowest, record) => (record.timeMs > slowest.timeMs ? record : slowest));
  
  const team = teams.find(t => t.id === worstRecord.teamId);
  const player = team?.players.find(p => p.id === worstRecord.guesserId);
  return {
    playerName: player?.name || 'Игрок',
    teamName: team?.name || 'Команда',
    word: worstRecord.word,
    timeMs: worstRecord.timeMs
  };
}

/**
 * Returns the current active streak of consecutive correct guesses in the current round.
 */
export function getCurrentRoundStreak(teams: Team[], history: History, currentTeamIndex: number): number {
  const team = teams[currentTeamIndex];
  if (!team) return 0;
  const roundRecords = history.filter(
    (record) => record.teamId === team.id && record.roundIndex === team.roundsPlayed
  );
  if (roundRecords.length === 0) return 0;

  let streak = 0;
  for (let i = roundRecords.length - 1; i >= 0; i--) {
    if (roundRecords[i].result === 'guessed') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export interface StreakMaster {
  playerName: string;
  teamName: string;
  maxStreak: number;
}

/**
 * Finds the player and team with the highest streak of consecutive correct guesses in a single turn.
 */
export function getStreakMaster(teams: Team[], history: History): StreakMaster | null {
  const streakMap = new Map<string, { describerId: string; teamId: string; streak: number; max: number }>();

  history.forEach((record) => {
    const key = `${record.teamId}_${record.roundIndex}`;
    const current = streakMap.get(key) || {
      describerId: record.describerId,
      teamId: record.teamId,
      streak: 0,
      max: 0,
    };

    if (record.result === 'guessed') {
      current.streak++;
      if (current.streak > current.max) {
        current.max = current.streak;
      }
    } else {
      current.streak = 0;
    }
    streakMap.set(key, current);
  });

  let best: { describerId: string; teamId: string; maxStreak: number } | null = null;
  streakMap.forEach((entry) => {
    if (entry.max >= 3 && (!best || entry.max > best.maxStreak)) {
      best = { describerId: entry.describerId, teamId: entry.teamId, maxStreak: entry.max };
    }
  });

  if (!best) return null;
  const bestEntry = best as { describerId: string; teamId: string; maxStreak: number };

  const team = teams.find((t) => t.id === bestEntry.teamId);
  const player = team?.players.find((p) => p.id === bestEntry.describerId);

  return {
    playerName: player?.name || 'Игрок',
    teamName: team?.name || 'Команда',
    maxStreak: bestEntry.maxStreak,
  };
}

