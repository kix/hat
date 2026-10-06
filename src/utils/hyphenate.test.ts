import { describe, it, expect } from 'vitest';
import { hyphenateWord } from './hyphenate';

describe('hyphenateWord', () => {
  it('inserts soft hyphens (\\u00AD) into multi-syllable Russian words', () => {
    const result = hyphenateWord('энциклопедия');
    expect(result).toContain('\u00AD');
  });

  it('leaves single-syllable or empty words intact', () => {
    expect(hyphenateWord('кот')).toBe('кот');
    expect(hyphenateWord('')).toBe('');
  });
});
