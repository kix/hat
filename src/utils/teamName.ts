import { adjectives, nouns } from '../data/teamNameParts';
import { adjectivesEn, nounsEn } from '../data/teamNamePartsEn';
import type { DictionaryEntry } from '../data/dictionary';
import { getActiveLang } from '../i18n/lang';

// Prefers a random word from the game's own dictionary (any difficulty) as
// the noun half of the name once it's loaded, falling back to the curated
// list before that. The adjective (and the noun fallback) follow the active
// UI language, so English games get English team names.
export function generateTeamName(dictionaryEntries?: DictionaryEntry[] | null): string {
  const en = getActiveLang() === 'en';
  const adjectiveList = en ? adjectivesEn : adjectives;
  const nounFallback = en ? nounsEn : nouns;

  const adjective = adjectiveList[Math.floor(Math.random() * adjectiveList.length)];
  const nounPool =
    dictionaryEntries && dictionaryEntries.length > 0
      ? dictionaryEntries.map((entry) => entry.word)
      : nounFallback;
  const noun = nounPool[Math.floor(Math.random() * nounPool.length)];
  return `${adjective} ${noun}`;
}
