import { describe, it, expect } from 'vitest';
import { getCurrentRoundStreak, getStreakMaster } from './stats';
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
