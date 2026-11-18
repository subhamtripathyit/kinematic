import { HI } from './hi';

/**
 * Tiny translation helper. English text is the key: t('Start workout') returns the
 * Hindi text when Hindi is on, or the English text if there's no translation yet.
 * Placeholders: t('Set {n} of {total}', { n: 1, total: 3 }).
 * To add a language: copy hi.ts, translate, and add it to LANGS and DICTS.
 */
export type Lang = 'en' | 'hi';

export const LANGS: { id: Lang; label: string; speech: string }[] = [
  { id: 'en', label: 'English', speech: 'en-US' },
  { id: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
];

const DICTS: Record<Lang, Record<string, string>> = { en: {}, hi: HI };

let current: Lang = 'en';

export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function getLang(): Lang {
  return current;
}

export function speechLang(): string {
  return LANGS.find((l) => l.id === current)?.speech ?? 'en-US';
}

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = DICTS[current][text] ?? text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
