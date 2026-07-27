import type { DictionaryEntry } from '../data/dictionary';

// Prefers the Web Crypto API's CSPRNG over Math.random() when available
// (all evergreen browsers), falling back for older/non-browser runtimes.
function randomFloat(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / 2 ** 32;
  }
  return Math.random();
}

// Zipf frequency (both plain and Levenshtein-neighbour-blended) tops out
// around 8 on wordfreq's scale.
const ZIPF_SCALE_MAX = 8;
// Longer than this and a word counts as "maximally long" for difficulty
// purposes — few dictionary entries exceed it (p99 is ~17 characters).
const MAX_MEANINGFUL_WORD_LENGTH = 16;

// Relative influence of each signal on where a word sits in the easy→hard
// ordering. These only decide rank *order* — the difficulty slider is mapped
// through the resulting distribution (see pickRandom), so their absolute
// scale no longer skews how the slider feels.
const HARDNESS_WEIGHTS = {
  length: 0.5,
  frequency: 0.42,
  levenshteinFrequency: 0.08,
} as const;

// The hardest possible setting (slider at 100%) opens up words wordfreq has
// never seen (frequency 0) — anywhere below that, they're excluded outright
// rather than just scored as maximally hard, since a 0 usually means
// "unattested" rather than "extremely obscure but real".
const MAX_DIFFICULTY_LEVEL = 1;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Word length hurts with diminishing returns: going from a 4- to an 8-letter
// word is a big jump in difficulty, but 12 to 16 barely registers. A
// logarithmic curve captures that, unlike a flat characters/MAX ratio which
// treats every extra character as equally punishing.
function lengthHardness(length: number): number {
  return clamp01(Math.log1p(length) / Math.log1p(MAX_MEANINGFUL_WORD_LENGTH));
}

// 0 (short, common word) to 1 (long, obscure word). Deterministic — no
// per-draw noise — so a word's position in the difficulty ranking is stable
// within a single draw. Frequency is left linear in the Zipf value on
// purpose: Zipf is itself a base-10 logarithm of occurrence counts, so this
// is already a logarithmic response to raw frequency.
function baseHardness(entry: DictionaryEntry): number {
  const frequencyHardness = 1 - clamp01(entry.frequency / ZIPF_SCALE_MAX);
  const levenshteinHardness = 1 - clamp01(entry.levenshtein_zipf_frequency / ZIPF_SCALE_MAX);

  return (
    HARDNESS_WEIGHTS.length * lengthHardness(entry.word.length) +
    HARDNESS_WEIGHTS.frequency * frequencyHardness +
    HARDNESS_WEIGHTS.levenshteinFrequency * levenshteinHardness
  );
}

// How tightly the draw concentrates around the requested difficulty, measured
// in percentile units (0..1). ~0.18 keeps most picks within roughly a fifth
// of the ranking of the target while still mixing in the occasional easier or
// harder word; smaller makes each hat more uniform, larger broadens the mix.
const DIFFICULTY_BANDWIDTH = 0.18;

// A little noise on each word's percentile so the same difficulty setting
// doesn't deal an identical-feeling hat twice, on top of the random sampling
// below.
const PERCENTILE_JITTER = 0.05;

// Weighted random sampling without replacement (Efraimidis-Spirakis): give
// every entry a key of random()^(1/weight), then take the entries with the
// highest keys.
//
// The catch the old linear version hit: word hardness is heavily clustered
// (the dictionary has almost no genuinely easy words and a long hard tail),
// so comparing `difficultyLevel` directly against a raw hardness score left
// most of the slider's range behaving the same and crammed the interesting
// action into a narrow band. Instead we *rank* the eligible pool by hardness
// and read `difficultyLevel` as a percentile into that ranking (0 = easiest
// available, 1 = hardest). That makes the slider consistent: equal moves of
// the slider shift the difficulty by equal amounts regardless of how the
// underlying scores bunch up.
//
// Words whose percentile is close to `difficultyLevel` get a higher weight
// and so tend to rank higher, but every entry still has a chance — this stays
// a random draw, just a biased one, so the same difficulty setting doesn't
// produce the same hat twice.
export function pickRandom(
  items: readonly DictionaryEntry[],
  count: number,
  difficultyLevel: number,
): DictionaryEntry[] {
  const eligible =
    difficultyLevel >= MAX_DIFFICULTY_LEVEL ? items : items.filter((entry) => entry.frequency !== 0);

  const ranked = eligible
    .map((entry) => ({ entry, hardness: baseHardness(entry) }))
    .sort((a, b) => a.hardness - b.hardness);

  // Guard against a single-entry (or empty) pool, where there is no spread to
  // divide across.
  const lastIndex = Math.max(1, ranked.length - 1);

  const keyed = ranked.map((item, index) => {
    const percentile = index / lastIndex;
    const jittered = percentile + (randomFloat() * 2 - 1) * PERCENTILE_JITTER;
    const distance = Math.abs(jittered - difficultyLevel);
    // Exponential (log-linear) falloff: log(weight) drops linearly with
    // distance, a smooth non-linear curve with one clear width knob, in place
    // of the old spiky 1/distance reciprocal that fell off unevenly.
    const weight = Math.exp(-distance / DIFFICULTY_BANDWIDTH);
    return { entry: item.entry, key: randomFloat() ** (1 / weight) };
  });

  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map(({ entry }) => entry);
}
