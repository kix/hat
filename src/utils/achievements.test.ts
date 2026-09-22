import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAchievements,
  getAndSaveNewlyUnlockedAchievements,
  ACHIEVEMENT_DEFINITIONS,
  getLocalUnlockedAchievements,
} from './achievements';
import type { History, Settings, Team } from '../machine/hatMachine';

describe('achievements', () => {
  const dummySettings: Settings = {
    roundDurationSec: 60,
    allowSkip: false,
    wordCount: 20,
    difficultyLevel: 0.5,
    rolesMode: 'alternate',
    soundEnabled: true,
    vibrationEnabled: false,
    enableReview: true,
    wordPack: 'frequent',
    customWords: [],
  };

  const dummyTeams: Team[] = [
    {
      id: 't1',
      name: 'Команда 1',
      players: [
        { id: 'p1', name: 'Алиса' },
        { id: 'p2', name: 'Боб' },
      ],
      roundsPlayed: 1,
    },
  ];

  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: (i: number) => Object.keys(storage)[i] ?? null,
      length: 0,
    } as Storage;
  });

  it('has exactly 12 defined achievements', () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(12);
  });

  it('detects lightning achievement when a word is guessed in under 3 seconds', () => {
    const history: History = [
      {
        word: 'кот',
        difficulty: 'easy',
        teamId: 't1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 2100,
        roundIndex: 0,
      },
    ];

    const unlocked = checkAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
    });

    expect(unlocked).toContain('lightning');
  });

  it('detects erudite achievement for long or hard words', () => {
    const history: History = [
      {
        word: 'электрокардиограмма',
        difficulty: 'hard',
        teamId: 't1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 8000,
        roundIndex: 0,
      },
    ];

    const unlocked = checkAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
    });

    expect(unlocked).toContain('erudite');
  });

  it('detects ironNerves when guessed near round duration expiration', () => {
    const history: History = [
      {
        word: 'финал',
        difficulty: 'easy',
        teamId: 't1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 59000,
        roundIndex: 0,
      },
    ];

    const unlocked = checkAchievements({
      history,
      settings: { ...dummySettings, roundDurationSec: 60 },
      teams: dummyTeams,
    });

    expect(unlocked).toContain('ironNerves');
  });

  it('detects streakMaster when 4+ words in a row are guessed in a turn', () => {
    const history: History = [
      { word: 'w1', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w2', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w3', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w4', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
    ];

    const unlocked = checkAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
    });

    expect(unlocked).toContain('streakMaster');
  });

  it('detects telepath when 5+ words in a single round are guessed', () => {
    const history: History = [
      { word: 'w1', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w2', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w3', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w4', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'skipped', timeMs: 4000, roundIndex: 0 },
      { word: 'w5', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
      { word: 'w6', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
    ];

    const unlocked = checkAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
    });

    expect(unlocked).toContain('telepath');
    expect(unlocked).not.toContain('streakMaster'); // streak was reset by skip
  });

  it('detects cleanGame for winner with 0 fouls', () => {
    const history: History = [
      { word: 'w1', difficulty: 'easy', teamId: 't1', describerId: 'p1', guesserId: 'p2', result: 'guessed', timeMs: 4000, roundIndex: 0 },
    ];

    const unlocked = checkAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
      isWinner: true,
      winningTeamId: 't1',
    });

    expect(unlocked).toContain('cleanGame');
  });

  it('detects partyAnimal, customHat and worldTraveler modes', () => {
    expect(
      checkAchievements({
        history: [],
        settings: { ...dummySettings, wordPack: 'party18' },
        teams: dummyTeams,
      })
    ).toContain('partyAnimal');

    expect(
      checkAchievements({
        history: [],
        settings: { ...dummySettings, wordPack: 'custom', customWords: ['тест'] },
        teams: dummyTeams,
      })
    ).toContain('customHat');

    expect(
      checkAchievements({
        history: [],
        settings: { ...dummySettings, wordPack: 'movies' },
        teams: dummyTeams,
      })
    ).toContain('worldTraveler');
  });

  it('saves and returns newly unlocked achievements', () => {
    const history: History = [
      {
        word: 'быстро',
        difficulty: 'easy',
        teamId: 't1',
        describerId: 'p1',
        guesserId: 'p2',
        result: 'guessed',
        timeMs: 1500,
        roundIndex: 0,
      },
    ];

    const newAchievements = getAndSaveNewlyUnlockedAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
    });

    expect(newAchievements.map((a) => a.id)).toContain('lightning');
    expect(getLocalUnlockedAchievements()['lightning']).toBeDefined();

    // Calling again shouldn't report it as newly unlocked
    const secondCall = getAndSaveNewlyUnlockedAchievements({
      history,
      settings: dummySettings,
      teams: dummyTeams,
    });

    expect(secondCall).toHaveLength(0);
  });
});
