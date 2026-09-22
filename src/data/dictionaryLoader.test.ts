import { describe, it, expect } from 'vitest';
import {
  loadDictionary,
  loadRuFrequent,
  loadRuStandard,
  loadEn,
  prefetchDictionaries,
  prefetchEn,
  prefetchRuStandard,
} from './dictionaryLoader';

describe('dictionaryLoader', { timeout: 20000 }, () => {
  it('loads Russian frequent dictionary', async () => {
    const words = await loadRuFrequent();
    expect(words).toBeDefined();
    expect(words.length).toBeGreaterThan(0);
    expect(typeof words[0].word).toBe('string');
  });

  it('loads Russian standard dictionary', async () => {
    const words = await loadRuStandard();
    expect(words).toBeDefined();
    expect(words.length).toBeGreaterThan(0);
  });

  it('loads English dictionary', async () => {
    const words = await loadEn();
    expect(words).toBeDefined();
    expect(words.length).toBeGreaterThan(0);
  });

  it('loads dictionary by language and wordPack configuration', async () => {
    const ruFrequent = await loadDictionary('ru', 'frequent');
    const ruStandard = await loadDictionary('ru', 'standard');
    const en = await loadDictionary('en');

    expect(ruFrequent.length).toBeGreaterThan(0);
    expect(ruStandard.length).toBeGreaterThan(ruFrequent.length);
    expect(en.length).toBeGreaterThan(0);
  });

  it('loads thematic word packs correctly for both languages', async () => {
    const moviesRu = await loadDictionary('ru', 'movies');
    const moviesEn = await loadDictionary('en', 'movies');
    const foodRu = await loadDictionary('ru', 'food');
    const gamingEn = await loadDictionary('en', 'gaming');

    expect(moviesRu.length).toBeGreaterThan(20);
    expect(moviesEn.length).toBeGreaterThan(20);
    expect(foodRu.length).toBeGreaterThan(20);
    expect(gamingEn.length).toBeGreaterThan(20);

    expect(moviesRu.some((e) => e.word.includes('поттер') || e.word.includes('титаник'))).toBe(true);
    expect(moviesEn.some((e) => e.word.includes('potter') || e.word.includes('titanic'))).toBe(true);
  });

  it('executes prefetch functions without errors', () => {
    expect(() => prefetchDictionaries()).not.toThrow();
    expect(() => prefetchEn()).not.toThrow();
    expect(() => prefetchRuStandard()).not.toThrow();
  });
});
