import type { History, Player, Team, WordRecord } from '../machine/hatMachine';
import { getTeamScore } from './scoring';

export function sortTeamsByScore(teams: Team[], history: History): Team[] {
  return [...teams].sort((a, b) => getTeamScore(history, b.id) - getTeamScore(history, a.id));
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
