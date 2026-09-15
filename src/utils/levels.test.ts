import { describe, it, expect } from 'vitest';
import { getLevelFromXP, calculateGameXP, calculateTotalPlayerXP } from './levels';

describe('levels system', () => {
  it('calculates level 1 for 0 XP', () => {
    const lvl = getLevelFromXP(0);
    expect(lvl.level).toBe(1);
    expect(lvl.progressPercent).toBe(0);
    expect(lvl.nextLevelXP).toBe(150);
  });

  it('calculates level 2 for 200 XP', () => {
    const lvl = getLevelFromXP(200);
    expect(lvl.level).toBe(2);
    expect(lvl.currentLevelMinXP).toBe(150);
    expect(lvl.nextLevelXP).toBe(400);
    expect(lvl.xpIntoLevel).toBe(50);
    expect(lvl.progressPercent).toBe(20); // 50 / 250 = 20%
  });

  it('calculates level 10 for 8000+ XP', () => {
    const lvl = getLevelFromXP(8000);
    expect(lvl.level).toBe(10);
    expect(lvl.progressPercent).toBe(0);
  });

  it('calculates level 11 for 10500 XP', () => {
    const lvl = getLevelFromXP(10500);
    expect(lvl.level).toBe(11);
    expect(lvl.progressPercent).toBe(0);
  });

  it('calculates game XP breakdown correctly', () => {
    const history = [
      { result: 'guessed', guesserId: 'u1', describerId: 'u2', timeMs: 2500, teamId: 't1' },
      { result: 'guessed', guesserId: 'u1', describerId: 'u2', timeMs: 4000, teamId: 't1' },
      { result: 'foul', guesserId: 'u1', describerId: 'u2', timeMs: 1000, teamId: 't1' },
    ];

    const xp = calculateGameXP(history, 'u1', true, 't1');
    // participation: 50, victory: 100, 2 words: 20, 1 fast word (<3000ms): 5, fouls > 0: clean game 0
    expect(xp.participationXP).toBe(50);
    expect(xp.victoryXP).toBe(100);
    expect(xp.wordsXP).toBe(20);
    expect(xp.fastWordsBonusXP).toBe(5);
    expect(xp.cleanGameBonusXP).toBe(0);
    expect(xp.totalXP).toBe(175);
  });

  it('calculates total player XP including achievements', () => {
    const participations = [
      {
        is_winner: true,
        team_name: 't1',
        games: {
          history_data: [
            { result: 'guessed', guesserId: 'u1', describerId: 'u2', timeMs: 2000, teamId: 't1' },
          ],
        },
      },
    ];
    const achievements = [
      { id: 'lightning', unlocked: true },
      { id: 'champion', unlocked: false },
    ];

    const result = calculateTotalPlayerXP(participations, 'u1', achievements);
    // Game: 50 (part) + 100 (win) + 10 (word) + 5 (fast) + 30 (clean) = 195
    // Achievement: lightning 100
    // Total: 295
    expect(result.gamesXP).toBe(195);
    expect(result.achievementsXP).toBe(100);
    expect(result.totalXP).toBe(295);
  });
});
