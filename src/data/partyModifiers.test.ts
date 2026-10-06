import { describe, it, expect } from 'vitest';
import {
  PARTY_MODIFIERS,
  getRandomModifierId,
  getModifierById,
} from './partyModifiers';

describe('partyModifiers', () => {
  it('contains a rich list of modifiers with bilingual text and emojis', () => {
    expect(PARTY_MODIFIERS.length).toBeGreaterThanOrEqual(15);
    for (const mod of PARTY_MODIFIERS) {
      expect(mod.id).toBeTruthy();
      expect(mod.emoji).toBeTruthy();
      expect(mod.titleRu).toBeTruthy();
      expect(mod.titleEn).toBeTruthy();
      expect(mod.descRu).toBeTruthy();
      expect(mod.descEn).toBeTruthy();
    }
  });

  it('retrieves modifier by ID', () => {
    const robot = getModifierById('robot');
    expect(robot).toBeDefined();
    expect(robot?.emoji).toBe('🤖');
    expect(robot?.titleRu).toBe('Робот');
    expect(robot?.titleEn).toBe('Robot');

    expect(getModifierById('nonexistent')).toBeUndefined();
    expect(getModifierById(null)).toBeUndefined();
    expect(getModifierById(undefined)).toBeUndefined();
  });

  it('selects a random modifier ID and can exclude previous modifier', () => {
    const randomId = getRandomModifierId();
    expect(typeof randomId).toBe('string');
    expect(PARTY_MODIFIERS.some((m) => m.id === randomId)).toBe(true);

    // Exclusion test over several draws
    for (let i = 0; i < 20; i++) {
      const nextId = getRandomModifierId('robot');
      expect(nextId).not.toBe('robot');
    }
  });
});
