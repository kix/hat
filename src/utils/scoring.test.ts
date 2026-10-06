import { describe, it, expect } from 'vitest';
import {
  scoreDeltaForResult,
  getTeamScore,
  getPlayerIndividualScore,
  getTeamStageScore,
  getPlayerIndividualStageScore,
} from './scoring';
import type { History } from '../machine/hatMachine';

describe('scoring', () => {
  describe('scoreDeltaForResult', () => {
    it('returns +1 for guessed words', () => {
      expect(scoreDeltaForResult('guessed')).toBe(1);
    });

    it('returns -1 for skipped and foul words', () => {
      expect(scoreDeltaForResult('skipped')).toBe(-1);
      expect(scoreDeltaForResult('foul')).toBe(-1);
    });

    it('returns 0 for timeout words', () => {
      expect(scoreDeltaForResult('timeout')).toBe(0);
    });
  });

  describe('getTeamScore', () => {
    it('returns 0 for empty history', () => {
      expect(getTeamScore([], 'team-1')).toBe(0);
    });

    it('sums scores for the specific team only', () => {
      const history: History = [
        { word: 'яблоко', result: 'guessed', teamId: 'team-1' },
        { word: 'груша', result: 'skipped', teamId: 'team-1' },
        { word: 'банан', result: 'guessed', teamId: 'team-1' },
        { word: 'апельсин', result: 'foul', teamId: 'team-1' },
        { word: 'киви', result: 'timeout', teamId: 'team-1' },
        { word: 'слива', result: 'guessed', teamId: 'team-2' },
      ];

      // 1 - 1 + 1 - 1 + 0 = 0
      expect(getTeamScore(history, 'team-1')).toBe(0);
      expect(getTeamScore(history, 'team-2')).toBe(1);
      expect(getTeamScore(history, 'team-3')).toBe(0);
    });
  });

  describe('getPlayerIndividualScore', () => {
    it('awards +1 to guesser and +1 to describer when guessed', () => {
      const history: History = [
        { word: 'кот', result: 'guessed', teamId: 't1', describerId: 'p1', guesserId: 'p2' },
      ];

      expect(getPlayerIndividualScore(history, 'p1')).toBe(1);
      expect(getPlayerIndividualScore(history, 'p2')).toBe(1);
      expect(getPlayerIndividualScore(history, 'p3')).toBe(0);
    });

    it('deducts -1 from describer when skipped or foul, but leaves guesser untouched', () => {
      const history: History = [
        { word: 'собака', result: 'skipped', teamId: 't1', describerId: 'p1', guesserId: 'p2' },
        { word: 'лиса', result: 'foul', teamId: 't1', describerId: 'p1', guesserId: 'p2' },
        { word: 'волк', result: 'timeout', teamId: 't1', describerId: 'p1', guesserId: 'p2' },
      ];

      // p1 was describer for skipped (-1), foul (-1), timeout (0) -> total -2
      expect(getPlayerIndividualScore(history, 'p1')).toBe(-2);
      // p2 was guesser -> total 0
      expect(getPlayerIndividualScore(history, 'p2')).toBe(0);
    });
  });

  describe('getTeamStageScore and getPlayerIndividualStageScore', () => {
    it('filters history by stageIndex', () => {
      const history: History = [
        { word: 'слово 1', result: 'guessed', teamId: 't1', describerId: 'p1', guesserId: 'p2', stageIndex: 1 },
        { word: 'слово 2', result: 'guessed', teamId: 't1', describerId: 'p1', guesserId: 'p2', stageIndex: 2 },
        { word: 'слово 3', result: 'skipped', teamId: 't1', describerId: 'p1', guesserId: 'p2', stageIndex: 2 },
      ];

      expect(getTeamStageScore(history, 't1', 1)).toBe(1);
      expect(getTeamStageScore(history, 't1', 2)).toBe(0);
      expect(getTeamStageScore(history, 't1', 3)).toBe(0);

      expect(getPlayerIndividualStageScore(history, 'p1', 1)).toBe(1);
      expect(getPlayerIndividualStageScore(history, 'p1', 2)).toBe(0);
    });

    it('defaults stageIndex to 1 when stageIndex is missing', () => {
      const history: History = [
        { word: 'слово', result: 'guessed', teamId: 't1', describerId: 'p1', guesserId: 'p2' },
      ];

      expect(getTeamStageScore(history, 't1', 1)).toBe(1);
      expect(getTeamStageScore(history, 't1', 2)).toBe(0);
    });
  });
});
