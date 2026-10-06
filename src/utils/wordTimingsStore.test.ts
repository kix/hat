import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredWordTimings,
  recordWordTiming,
  clearStoredWordTimings,
} from './wordTimingsStore';

describe('wordTimingsStore', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    global.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });

  it('records and returns word timings', () => {
    expect(getStoredWordTimings()).toEqual([]);

    recordWordTiming('космос', 2340);
    recordWordTiming('ракета', 1850);

    const timings = getStoredWordTimings();
    expect(timings).toHaveLength(2);
    expect(timings[0]).toEqual({ word: 'космос', timeMs: 2340 });
    expect(timings[1]).toEqual({ word: 'ракета', timeMs: 1850 });
  });

  it('clears stored word timings', () => {
    recordWordTiming('звезда', 1200);
    clearStoredWordTimings();
    expect(getStoredWordTimings()).toEqual([]);
  });

  it('filters out malformed items and handles invalid JSON', () => {
    store.set(
      'hat:wordTimings',
      JSON.stringify([{ word: 'valid', timeMs: 100 }, { invalid: 'item' }, 'not-an-object'])
    );
    expect(getStoredWordTimings()).toEqual([{ word: 'valid', timeMs: 100 }]);

    store.set('hat:wordTimings', 'not-json');
    expect(getStoredWordTimings()).toEqual([]);
  });
});
