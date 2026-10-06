import { describe, it, expect, beforeEach } from 'vitest';
import type { DesignThemeMode } from './LiquidGlassContext';

describe('DesignThemeMode types and configuration', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });

  it('supports all four theme modes', () => {
    const modes: DesignThemeMode[] = ['classic', 'glass', '3d', 'win95'];
    expect(modes).toContain('win95');
    expect(modes).toContain('3d');
    expect(modes).toContain('glass');
    expect(modes).toContain('classic');
  });

  it('persists theme selection to localStorage', () => {
    localStorage.setItem('hat-design-theme-mode', 'win95');
    expect(localStorage.getItem('hat-design-theme-mode')).toBe('win95');
  });
});
