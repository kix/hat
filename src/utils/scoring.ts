import type { History, WordResult } from '../machine/hatMachine';

export function scoreDeltaForResult(result: WordResult): -1 | 0 | 1 {
  switch (result) {
    case 'guessed':
      return 1;
    case 'skipped':
    case 'foul':
      return -1;
    case 'timeout':
      return 0;
  }
}

export function getTeamScore(history: History, teamId: string): number {
  return history
    .filter((record) => record.teamId === teamId)
    .reduce((sum, record) => sum + scoreDeltaForResult(record.result), 0);
}

export function getPlayerIndividualScore(history: History, playerId: string): number {
  let score = 0;
  for (const record of history) {
    if (record.guesserId === playerId && record.result === 'guessed') {
      score += 1;
    }
    if (record.describerId === playerId) {
      if (record.result === 'guessed') {
        score += 1;
      } else if (record.result === 'skipped' || record.result === 'foul') {
        score -= 1;
      }
    }
  }
  return score;
}
