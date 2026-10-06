import { describe, it, expect } from 'vitest';
import {
  THEMATIC_PACK_METAS,
  getThematicPackEntries,
  type ThematicPackId,
} from './thematicPacks';

describe('thematicPacks', () => {
  it('contains metadata for all thematic pack IDs', () => {
    expect(THEMATIC_PACK_METAS.length).toBeGreaterThanOrEqual(8);
    for (const meta of THEMATIC_PACK_METAS) {
      expect(meta.id).toBeDefined();
      expect(meta.emoji).toBeDefined();
      expect(meta.titleKey).toBeDefined();
      expect(meta.descKey).toBeDefined();
    }
  });

  it('returns valid non-empty dictionary entries for Russian packs', () => {
    for (const meta of THEMATIC_PACK_METAS) {
      const entries = getThematicPackEntries(meta.id, 'ru');
      expect(entries.length).toBeGreaterThanOrEqual(10);
      for (const entry of entries) {
        expect(entry.word).toBeTruthy();
        expect(entry.difficulty).toBeDefined();
        expect(typeof entry.frequency).toBe('number');
      }
    }
  });

  it('returns valid non-empty dictionary entries for English packs', () => {
    for (const meta of THEMATIC_PACK_METAS) {
      const entries = getThematicPackEntries(meta.id, 'en');
      expect(entries.length).toBeGreaterThanOrEqual(10);
      for (const entry of entries) {
        expect(entry.word).toBeTruthy();
        expect(entry.difficulty).toBeDefined();
      }
    }
  });

  it('returns empty array for unknown pack ID', () => {
    expect(getThematicPackEntries('unknown_pack' as ThematicPackId, 'ru')).toEqual([]);
  });
});
