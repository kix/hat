import { describe, it, expect } from 'vitest';
import { generateTeamName } from './teamName';
import { setActiveLang } from '../i18n/lang';
import type { DictionaryEntry } from '../data/dictionary';

describe('generateTeamName', () => {
  it('generates a two-word Russian team name by default', () => {
    setActiveLang('ru');
    const name = generateTeamName();
    expect(typeof name).toBe('string');
    const parts = name.split(' ');
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it('generates an English team name when active language is en', () => {
    setActiveLang('en');
    const name = generateTeamName();
    expect(typeof name).toBe('string');
    const parts = name.split(' ');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    setActiveLang('ru');
  });

  it('picks nouns from supplied dictionary entries when available', () => {
    const customEntries: DictionaryEntry[] = [
      { word: 'Телепорт', difficulty: 'easy', frequency: 5, levenshtein_zipf_frequency: 5 },
    ];
    setActiveLang('ru');
    const name = generateTeamName(customEntries);
    expect(name.endsWith('Телепорт')).toBe(true);
  });
});
