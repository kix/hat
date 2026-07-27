import { messages, type Lang } from './messages';

export type { Lang } from './messages';

// The active UI language as a module-level value, so non-React code (the
// xstate machine, pure utils) can localise strings without the React context.
// The I18nProvider keeps this in sync with the React state.
let activeLang: Lang = 'ru';

export function getActiveLang(): Lang {
  return activeLang;
}

export function setActiveLang(lang: Lang): void {
  activeLang = lang;
}

// Core translation + `{name}` interpolation, shared by the React `t()` (via
// i18n.tsx) and the standalone `tr()` below. Falls back to Russian, then the
// raw key.
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const template = messages[lang][key] ?? messages.ru[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

// Standalone translator for non-React call sites; uses the active language.
export function tr(key: string, vars?: Record<string, string | number>): string {
  return translate(activeLang, key, vars);
}
