export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DictionaryEntry {
  word: string;
  difficulty: DifficultyLevel;
  // Zipf frequency in Russian, per rspeer/wordfreq — higher is more common,
  // 0 means the word wasn't found in its frequency lists.
  frequency: number;
  // `frequency`, unless a word one or two edits away (see
  // scripts/annotate_levenshtein_frequency.ts) is more common — in which case
  // this is 25% of that stronger neighbour's frequency instead.
  levenshtein_zipf_frequency: number;
}
