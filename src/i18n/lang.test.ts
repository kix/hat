import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveLang, setActiveLang, translate, tr } from './lang';

describe('i18n lang utilities', () => {
  beforeEach(() => {
    setActiveLang('ru');
  });

  it('manages active language state', () => {
    expect(getActiveLang()).toBe('ru');
    setActiveLang('en');
    expect(getActiveLang()).toBe('en');
  });

  it('translates simple keys in Russian and English', () => {
    expect(translate('ru', 'app.title')).toBe('Шляпа');
    expect(translate('en', 'app.title')).toBe('Hat');
  });

  it('interpolates template variables', () => {
    const textRu = translate('ru', 'default.playerN', { n: 3 });
    expect(textRu).toBe('Игрок 3');

    const textEn = translate('en', 'default.playerN', { n: 3 });
    expect(textEn).toBe('Player 3');
  });

  it('tr() uses the currently active language', () => {
    setActiveLang('ru');
    expect(tr('app.title')).toBe('Шляпа');

    setActiveLang('en');
    expect(tr('app.title')).toBe('Hat');
  });

  it('falls back to Russian or key if key is missing in chosen language', () => {
    expect(translate('en', 'nonexistent.key.xyz')).toBe('nonexistent.key.xyz');
  });
});
