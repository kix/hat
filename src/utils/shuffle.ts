import type { DictionaryEntry } from '../data/dictionary';

// Zipf frequency (both plain and Levenshtein-neighbour-blended) tops out
// around 8 on wordfreq's scale.
const ZIPF_SCALE_MAX = 8;
// Longer than this and a word counts as "maximally long" for difficulty
// purposes — few dictionary entries exceed it (p99 is ~17 characters).
const MAX_MEANINGFUL_WORD_LENGTH = 16;

// In order of importance: how long the word is, how common it is, how
// common its nearest spelling-neighbours are, and a slice of pure noise so
// the same difficulty setting doesn't draw the exact same words every game.
const DIFFICULTY_WEIGHTS = {
  length: 0.7,
  frequency: 0.15,
  levenshteinFrequency: 0.08,
  randomness: 0.07,
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// 0 (short, common word) to 1 (long, obscure word).
function wordHardness(entry: DictionaryEntry): number {
  const lengthHardness = clamp01(entry.word.length / MAX_MEANINGFUL_WORD_LENGTH);
  const frequencyHardness = 1 - clamp01(entry.frequency / ZIPF_SCALE_MAX);
  const levenshteinHardness = 1 - clamp01(entry.levenshtein_zipf_frequency / ZIPF_SCALE_MAX);

  return (
    DIFFICULTY_WEIGHTS.length * lengthHardness +
    DIFFICULTY_WEIGHTS.frequency * frequencyHardness +
    DIFFICULTY_WEIGHTS.levenshteinFrequency * levenshteinHardness +
    DIFFICULTY_WEIGHTS.randomness * Math.random()
  );
}

// Keeps sampling weights (and the keys derived from them below) well-defined
// even for an exact hardness/difficultyLevel match, where the distance is 0.
const CLOSENESS_EPSILON = 0.01;

// Weighted random sampling without replacement (Efraimidis-Spirakis): give
// every entry a key of random()^(1/weight), then take the entries with the
// highest keys. Entries whose hardness is close to `difficultyLevel` (0 =
// easiest, 1 = hardest) get a higher weight and so tend to rank higher, but
// every entry still has a chance — this stays a random draw, just a biased
// one, so the same difficulty setting doesn't produce the same hat twice.
export function pickRandom(
  items: readonly DictionaryEntry[],
  count: number,
  difficultyLevel: number,
): DictionaryEntry[] {
  const keyed = items.map((entry) => {
    const distance = Math.abs(wordHardness(entry) - difficultyLevel);
    const weight = 1 / (CLOSENESS_EPSILON + distance);
    return { entry, key: Math.random() ** (1 / weight) };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map(({ entry }) => entry);
}
