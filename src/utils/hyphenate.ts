import { hyphenated } from 'hyphenated';
import ru from 'hyphenated-ru';

// Inserts soft hyphens (U+00AD) at valid Russian syllable breaks, so a long
// guessed word wraps at a proper hyphenation point instead of overflowing or
// (via CSS word-break) splitting at an arbitrary character.
export function hyphenateWord(word: string): string {
  return hyphenated(word, { language: ru });
}
