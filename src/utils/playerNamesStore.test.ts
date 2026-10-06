import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredPlayerNames, rememberPlayerName } from './playerNamesStore';

describe('playerNamesStore', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    // Polyfill localStorage in test environment
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });

  it('returns empty array when nothing is stored', () => {
    expect(getStoredPlayerNames()).toEqual([]);
  });

  it('stores and retrieves player names', () => {
    rememberPlayerName('Алексей');
    rememberPlayerName('Мария');
    expect(getStoredPlayerNames()).toEqual(['Алексей', 'Мария']);
  });

  it('does not store duplicates (case-insensitive) or blank names', () => {
    rememberPlayerName('Алексей');
    rememberPlayerName('  алексей  ');
    rememberPlayerName('   ');
    expect(getStoredPlayerNames()).toEqual(['Алексей']);
  });

  it('handles corrupted localStorage data without throwing', () => {
    store.set('hat:playerNames', '{invalid json');
    expect(getStoredPlayerNames()).toEqual([]);
  });
});
