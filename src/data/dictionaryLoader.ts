import type { DictionaryEntry } from './dictionary';
import { getThematicPackEntries, type ThematicPackId } from './thematicPacks';

export type WordPackType = 'standard' | 'frequent' | 'custom' | ThematicPackId;

// In-memory cache for loaded dictionary modules
let cachedRuFrequent: DictionaryEntry[] | null = null;
let cachedRuStandard: DictionaryEntry[] | null = null;
let cachedEn: DictionaryEntry[] | null = null;

export async function loadRuFrequent(): Promise<DictionaryEntry[]> {
  if (!cachedRuFrequent) {
    const mod = await import('./dictionaryRuFrequent');
    cachedRuFrequent = mod.dictionaryRuFrequent;
  }
  return cachedRuFrequent;
}

export async function loadRuStandard(): Promise<DictionaryEntry[]> {
  if (!cachedRuStandard) {
    const mod = await import('./dictionaryRuStandard');
    cachedRuStandard = mod.dictionaryRuStandard;
  }
  return cachedRuStandard;
}

export async function loadEn(): Promise<DictionaryEntry[]> {
  if (!cachedEn) {
    const mod = await import('./dictionaryEn');
    cachedEn = mod.dictionaryEn;
  }
  return cachedEn;
}

/**
 * Loads the dictionary entries for the given language and word pack setting.
 * Uses cached data if already loaded.
 */
export async function loadDictionary(
  lang: 'ru' | 'en',
  wordPack: WordPackType = 'frequent'
): Promise<DictionaryEntry[]> {
  if (
    wordPack === 'movies' ||
    wordPack === 'food' ||
    wordPack === 'geography' ||
    wordPack === 'gaming' ||
    wordPack === 'animals' ||
    wordPack === 'celebrities' ||
    wordPack === 'tech'
  ) {
    return getThematicPackEntries(wordPack, lang);
  }

  if (lang === 'en') {
    return loadEn();
  }

  const frequent = await loadRuFrequent();
  if (wordPack === 'standard') {
    const standard = await loadRuStandard();
    return [...frequent, ...standard];
  }
  return frequent;
}

/**
 * Prefetches non-critical dictionaries in the background.
 */
export function prefetchDictionaries(): void {
  if (!cachedRuStandard) {
    void loadRuStandard();
  }
  if (!cachedEn) {
    void loadEn();
  }
}

export function prefetchEn(): void {
  if (!cachedEn) {
    void loadEn();
  }
}

export function prefetchRuStandard(): void {
  if (!cachedRuStandard) {
    void loadRuStandard();
  }
}
