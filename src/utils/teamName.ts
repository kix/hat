import { adjectives, nouns } from '../data/teamNameParts';
import type { DictionaryEntry } from '../data/dictionary';

// Prefers a random word from the game's own dictionary (any difficulty) as
// the noun half of the name once it's loaded, falling back to the curated
// list from teamNameParts.ts before that (or if the dictionary is empty).
export function generateTeamName(dictionaryEntries?: DictionaryEntry[] | null): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const nounPool = dictionaryEntries && dictionaryEntries.length > 0 ? dictionaryEntries.map((entry) => entry.word) : nouns;
  const noun = nounPool[Math.floor(Math.random() * nounPool.length)];
  return `${adjective} ${noun}`;
}
