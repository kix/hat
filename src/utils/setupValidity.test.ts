import { describe, it, expect } from 'vitest';
import { getDuplicateNameReason, getSetupValidity } from './setupValidity';
import type { HatContext, Team } from '../machine/hatMachine';

describe('setupValidity', () => {
  describe('getDuplicateNameReason', () => {
    it('returns null if names are distinct', () => {
      const team: Team = {
        id: 't1',
        name: 'Команда 1',
        players: [
          { id: 'p1', name: 'Алиса' },
          { id: 'p2', name: 'Боб' },
        ],
        roundsPlayed: 0,
      };
      expect(getDuplicateNameReason(team)).toBeNull();
    });

    it('returns duplicate reason if names are equal case-insensitively with trimming', () => {
      const team: Team = {
        id: 't1',
        name: 'Команда 1',
        players: [
          { id: 'p1', name: '  Алиса  ' },
          { id: 'p2', name: 'алиса' },
        ],
        roundsPlayed: 0,
      };
      const reason = getDuplicateNameReason(team);
      expect(reason).not.toBeNull();
      expect(reason).toContain('Алиса');
    });

    it('returns null if one or both names are blank (backfilled later)', () => {
      const team: Team = {
        id: 't1',
        name: 'Команда 1',
        players: [
          { id: 'p1', name: '' },
          { id: 'p2', name: '' },
        ],
        roundsPlayed: 0,
      };
      expect(getDuplicateNameReason(team)).toBeNull();
    });
  });

  describe('getSetupValidity', () => {
    const baseContext = {
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
      },
      teams: [
        {
          id: 't1',
          name: 'Команда 1',
          players: [
            { id: 'p1', name: 'Игрок 1' },
            { id: 'p2', name: 'Игрок 2' },
          ],
          roundsPlayed: 0,
        },
        {
          id: 't2',
          name: 'Команда 2',
          players: [
            { id: 'p3', name: 'Игрок 3' },
            { id: 'p4', name: 'Игрок 4' },
          ],
          roundsPlayed: 0,
        },
      ],
      hat: [],
      currentWord: null,
      timeRemainingSec: 30,
      activeTeamIndex: 0,
      history: [],
      stage: 1,
      partyModifier: null,
    } as unknown as HatContext;

    it('allows valid teams setup', () => {
      const validity = getSetupValidity(baseContext);
      expect(validity.canStart).toBe(true);
      expect(validity.reasons).toHaveLength(0);
    });

    it('fails if fewer than 2 teams in teams mode', () => {
      const validity = getSetupValidity({
        ...baseContext,
        teams: [baseContext.teams[0]],
      });
      expect(validity.canStart).toBe(false);
      expect(validity.reasons.length).toBeGreaterThan(0);
    });

    it('allows 1 team in pairs mode', () => {
      const validity = getSetupValidity({
        ...baseContext,
        settings: { ...baseContext.settings, gameMode: 'pairs' },
        teams: [baseContext.teams[0]],
      });
      expect(validity.canStart).toBe(true);
      expect(validity.reasons).toHaveLength(0);
    });

    it('fails if 0 teams in pairs mode', () => {
      const validity = getSetupValidity({
        ...baseContext,
        settings: { ...baseContext.settings, gameMode: 'pairs' },
        teams: [],
      });
      expect(validity.canStart).toBe(false);
    });

    it('validates individual mode: requires at least 3 players and unique non-empty names', () => {
      const twoPlayersContext: HatContext = {
        ...baseContext,
        settings: { ...baseContext.settings, gameMode: 'individual' },
        individualPlayers: [
          { id: 'p1', name: 'Игрок 1' },
          { id: 'p2', name: 'Игрок 2' },
        ],
      };
      expect(getSetupValidity(twoPlayersContext).canStart).toBe(false);

      const threePlayersContext: HatContext = {
        ...baseContext,
        settings: { ...baseContext.settings, gameMode: 'individual' },
        individualPlayers: [
          { id: 'p1', name: 'Игрок 1' },
          { id: 'p2', name: 'Игрок 2' },
          { id: 'p3', name: 'Игрок 3' },
        ],
      };
      expect(getSetupValidity(threePlayersContext).canStart).toBe(true);

      const dupPlayersContext: HatContext = {
        ...baseContext,
        settings: { ...baseContext.settings, gameMode: 'individual' },
        individualPlayers: [
          { id: 'p1', name: 'Анна' },
          { id: 'p2', name: '  анна  ' },
          { id: 'p3', name: 'Борис' },
        ],
      };
      const dupValidity = getSetupValidity(dupPlayersContext);
      expect(dupValidity.canStart).toBe(false);
      expect(dupValidity.reasons.some((r) => r.includes('Анна'))).toBe(true);
    });
  });
});
