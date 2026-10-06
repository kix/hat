import { describe, it, expect } from 'vitest';
import { summaryTotals, type GameSummary } from './summaryData';

describe('summaryData', () => {
  const mockSummary: GameSummary = {
    id: 'summary-1',
    summaryDate: '2026-10-06',
    games: [
      {
        id: 'g1',
        createdAt: '2026-10-06T10:00:00Z',
        winnerTeamName: 'Победители',
        teams: [
          {
            id: 't1',
            name: 'Победители',
            players: [
              { id: 'p1', name: 'Алиса' },
              { id: 'p2', name: 'Боб' },
            ],
            roundsPlayed: 1,
          },
          {
            id: 't2',
            name: 'Вторые',
            players: [
              { id: 'p3', name: 'Чарли' },
              { id: 'p4', name: 'Диана' },
            ],
            roundsPlayed: 1,
          },
        ],
        history: [
          { word: 'слово 1', result: 'guessed', teamId: 't1', describerId: 'p1', guesserId: 'p2' },
          { word: 'слово 2', result: 'guessed', teamId: 't1', describerId: 'p2', guesserId: 'p1' },
          { word: 'слово 3', result: 'guessed', teamId: 't2', describerId: 'p3', guesserId: 'p4' },
        ] as unknown as any,
        settings: {
          roundDurationSec: 30,
          allowSkip: true,
          wordCount: 20,
          difficultyLevel: 0.5,
          rolesMode: 'alternate',
          soundEnabled: true,
          vibrationEnabled: true,
          wordPack: 'standard',
          customWords: [],
          gameMode: 'teams',
          enableReview: true,
        } as any,
      },
      {
        id: 'g2',
        createdAt: '2026-10-06T11:00:00Z',
        winnerTeamName: 'Вторые',
        teams: [
          {
            id: 't1',
            name: 'Победители',
            players: [
              { id: 'p1', name: 'Алиса' },
              { id: 'p2', name: 'Боб' },
            ],
            roundsPlayed: 1,
          },
          {
            id: 't2',
            name: 'Вторые',
            players: [
              { id: 'p3', name: 'Чарли' },
              { id: 'p4', name: 'Диана' },
            ],
            roundsPlayed: 1,
          },
        ],
        history: [
          { word: 'слово 1', result: 'guessed', teamId: 't2', describerId: 'p3', guesserId: 'p4' },
          { word: 'слово 2', result: 'guessed', teamId: 't2', describerId: 'p4', guesserId: 'p3' },
        ] as unknown as any,
        settings: {
          roundDurationSec: 30,
          allowSkip: true,
          wordCount: 20,
          difficultyLevel: 0.5,
          rolesMode: 'alternate',
          soundEnabled: true,
          vibrationEnabled: true,
          wordPack: 'standard',
          customWords: [],
          gameMode: 'teams',
          enableReview: true,
        } as any,
      },
    ],
  };

  it('calculates total games and wins correctly for viewers', () => {
    // p1 played in both games, won game 1, lost game 2
    const totalsP1 = summaryTotals(mockSummary, 'p1');
    expect(totalsP1).toEqual({ games: 2, wins: 1 });

    // p3 won game 2, lost game 1
    const totalsP3 = summaryTotals(mockSummary, 'p3');
    expect(totalsP3).toEqual({ games: 2, wins: 1 });

    // unknown player has 0 wins
    const totalsUnknown = summaryTotals(mockSummary, 'p999');
    expect(totalsUnknown).toEqual({ games: 2, wins: 0 });

    // undefined viewer has 0 wins
    const totalsNoViewer = summaryTotals(mockSummary);
    expect(totalsNoViewer).toEqual({ games: 2, wins: 0 });
  });
});
