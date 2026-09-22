import { describe, it, expect } from 'vitest';
import { getCurrentRoundStreak, getStreakMaster, getIndividualLeaderboard, getBestTandem } from './stats';
import type { Team, WordRecord } from '../machine/hatMachine';

describe('stats streak logic', () => {
  const teams: Team[] = [
    {
      id: 'team1',
      name: 'Alpha',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      roundsPlayed: 0,
    },
    {
      id: 'team2',
      name: 'Beta',
      players: [
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Dave' },
      ],
      roundsPlayed: 0,
    },
  ];

  it('calculates current active streak in round correctly', () => {
    const history: WordRecord[] = [
      {
        word: 'one',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 2000,
        roundIndex: 0,
      },
      {
        word: 'two',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'skipped',
        timeMs: 1500,
        roundIndex: 0,
      },
      {
        word: 'three',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 1200,
        roundIndex: 0,
      },
      {
        word: 'four',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 1800,
        roundIndex: 0,
      },
      {
        word: 'five',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 1100,
        roundIndex: 0,
      },
    ];

    const streak = getCurrentRoundStreak(teams, history, 0);
    expect(streak).toBe(3);
  });

  it('returns streak 0 if last action was not guessed', () => {
    const history: WordRecord[] = [
      {
        word: 'one',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 2000,
        roundIndex: 0,
      },
      {
        word: 'two',
        difficulty: 'easy',
        teamId: 'team1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'foul',
        timeMs: 1000,
        roundIndex: 0,
      },
    ];

    expect(getCurrentRoundStreak(teams, history, 0)).toBe(0);
  });

  it('identifies streak master with max streak >= 3', () => {
    const history: WordRecord[] = [
      { word: 'w1', difficulty: 'easy', teamId: 'team1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      { word: 'w2', difficulty: 'easy', teamId: 'team1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      { word: 'w3', difficulty: 'easy', teamId: 'team1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      { word: 'w4', difficulty: 'easy', teamId: 'team1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 0 },
    ];

    const master = getStreakMaster(teams, history);
    expect(master).not.toBeNull();
    expect(master?.playerName).toBe('Alice');
    expect(master?.teamName).toBe('Alpha');
    expect(master?.maxStreak).toBe(4);
  });
});

describe('individual round-robin mode stats', () => {
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
  ];

  it('calculates individual leaderboard correctly with explain/guess and penalties', () => {
    const history: WordRecord[] = [
      // Alice explains, Bob guesses -> Alice +1, Bob +1
      { word: 'w1', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      // Alice explains, Bob fouls -> Alice -1, Bob 0
      { word: 'w2', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'foul', timeMs: 1000, roundIndex: 0 },
      // Bob explains, Charlie guesses -> Bob +1, Charlie +1
      { word: 'w3', difficulty: 'easy', teamId: 't2', describerId: 'p2', guesserId: 'p3', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      // Charlie explains, Alice guesses -> Charlie +1, Alice +1
      { word: 'w4', difficulty: 'easy', teamId: 't3', describerId: 'p3', guesserId: 'p1', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      // Charlie explains, Alice skips -> Charlie -1, Alice 0
      { word: 'w5', difficulty: 'easy', teamId: 't3', describerId: 'p3', guesserId: 'p1', result: 'skipped', timeMs: 1000, roundIndex: 0 },
    ];

    const leaderboard = getIndividualLeaderboard(players, history);
    // Bob: guessed=1 (w1), explained=1 (w3), fouls=0, skips=0 -> score = 2
    // Alice: guessed=1 (w4), explained=1 (w1), fouls=1 (w2), skips=0 -> score = 1
    // Charlie: guessed=1 (w3), explained=1 (w4), fouls=0, skips=1 (w5) -> score = 1
    expect(leaderboard[0].player.name).toBe('Bob');
    expect(leaderboard[0].score).toBe(2);
    expect(leaderboard[0].guessed).toBe(1);
    expect(leaderboard[0].explained).toBe(1);

    expect(leaderboard.find((l) => l.player.id === 'p1')?.score).toBe(1);
    expect(leaderboard.find((l) => l.player.id === 'p3')?.score).toBe(1);
  });

  it('calculates best tandem correctly', () => {
    const history: WordRecord[] = [
      // Alice & Bob pair
      { word: 'w1', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 0 },
      { word: 'w2', difficulty: 'easy', teamId: 't2', describerId: 'p2', guesserId: 'p1', result: 'guessed', timeMs: 1000, roundIndex: 1 },
      { word: 'w3', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 1000, roundIndex: 2 },
      // Bob & Charlie pair
      { word: 'w4', difficulty: 'easy', teamId: 't3', describerId: 'p2', guesserId: 'p3', result: 'guessed', timeMs: 1000, roundIndex: 0 },
    ];

    const best = getBestTandem(players, history);
    expect(best).not.toBeNull();
    expect(best?.wordsGuessed).toBe(3);
    const tandemNames = [best?.player1.name, best?.player2.name];
    expect(tandemNames).toContain('Alice');
    expect(tandemNames).toContain('Bob');
  });
});
