import { describe, it, expect } from 'vitest';
import { pickRandom } from './shuffle';
import type { DictionaryEntry } from '../data/dictionary';

describe('pickRandom', () => {
  const sampleEntries: DictionaryEntry[] = [
    { word: 'дом', difficulty: 'easy', frequency: 6.5, levenshtein_zipf_frequency: 6.5 },
    { word: 'машина', difficulty: 'easy', frequency: 5.8, levenshtein_zipf_frequency: 5.8 },
    { word: 'траектория', difficulty: 'medium', frequency: 4.2, levenshtein_zipf_frequency: 4.2 },
    { word: 'синхрофазотрон', difficulty: 'hard', frequency: 2.1, levenshtein_zipf_frequency: 2.1 },
    { word: 'дезоксирибонуклеиновый', difficulty: 'hard', frequency: 1.2, levenshtein_zipf_frequency: 1.2 },
    { word: 'неизвестноеслово', difficulty: 'hard', frequency: 0, levenshtein_zipf_frequency: 0 },
  ];

  it('returns exact count requested when enough items exist', () => {
    const picked = pickRandom(sampleEntries, 3, 0.5);
    expect(picked).toHaveLength(3);
    // Elements should be unique
    const words = picked.map((p) => p.word);
    expect(new Set(words).size).toBe(3);
  });

  it('excludes frequency 0 words when difficultyLevel < 1', () => {
    // Run multiple times to verify statistical filtering
    for (let i = 0; i < 10; i++) {
      const picked = pickRandom(sampleEntries, 5, 0.5);
      expect(picked.some((p) => p.word === 'неизвестноеслово')).toBe(false);
    }
  });

  it('allows frequency 0 words when difficultyLevel is 1.0', () => {
    const zeroFreqOnly: DictionaryEntry[] = [
      { word: 'неизвестноеслово', difficulty: 'hard', frequency: 0, levenshtein_zipf_frequency: 0 },
    ];
    const picked = pickRandom(zeroFreqOnly, 1, 1.0);
    expect(picked).toHaveLength(1);
    expect(picked[0].word).toBe('неизвестноеслово');
  });

  it('handles empty or single item arrays gracefully', () => {
    expect(pickRandom([], 5, 0.5)).toEqual([]);

    const single: DictionaryEntry[] = [
      { word: 'один', difficulty: 'easy', frequency: 5, levenshtein_zipf_frequency: 5 },
    ];
    const picked = pickRandom(single, 1, 0.5);
    expect(picked).toHaveLength(1);
    expect(picked[0].word).toBe('один');
  });
});
