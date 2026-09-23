import { describe, expect, it } from 'vitest';
import { generateWordsWithAI } from './aiPackService';

describe('aiPackService', () => {
  it('generates words for known seed themes in Russian', async () => {
    const words = await generateWordsWithAI({
      topic: 'Гарри Поттер',
      count: 20,
      difficulty: 'medium',
      lang: 'ru',
    });

    expect(words.length).toBe(20);
    expect(words.some((w) => w.includes('Волан') || w.includes('Гермиона') || w.includes('Хогвартс'))).toBe(true);
  });

  it('generates words for unknown themes with fallback generator', async () => {
    const words = await generateWordsWithAI({
      topic: 'Киберспорт Dota 2',
      count: 15,
      difficulty: 'easy',
      lang: 'ru',
    });

    expect(words.length).toBe(15);
    expect(words.every((w) => typeof w === 'string' && w.length > 0)).toBe(true);
  });

  it('generates words in English', async () => {
    const words = await generateWordsWithAI({
      topic: 'Harry Potter',
      count: 10,
      difficulty: 'medium',
      lang: 'en',
    });

    expect(words.length).toBe(10);
    expect(words.some((w) => w.includes('Hogwarts') || w.includes('Voldemort') || w.includes('Dumbledore'))).toBe(true);
  });
});
