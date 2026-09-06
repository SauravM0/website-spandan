import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Guards the translation dictionaries: every locale must carry the same keys,
 * every value must be non-empty, and every key referenced in the code must
 * exist. Drift here shows up as English text leaking into a Hindi or Marathi
 * page, which is hard to spot by eye.
 */
const LOCALES_DIR = path.join(process.cwd(), 'public/locales');
const SUPPORTED = ['en', 'hi', 'mr'] as const;

// Proper nouns and endonyms are identical across locales by design.
const SHARED_BY_DESIGN = new Set([
  'site_name',
  'language_en',
  'language_hi',
  'language_mr',
  'contact_whatsapp', // brand name, identical in every locale
]);

function dictionary(locale: string): Record<string, string> {
  return JSON.parse(readFileSync(path.join(LOCALES_DIR, locale, 'common.json'), 'utf8'));
}

const dictionaries = Object.fromEntries(SUPPORTED.map((l) => [l, dictionary(l)])) as Record<
  string,
  Record<string, string>
>;

describe('translation dictionaries', () => {
  it('ships every supported locale', () => {
    const present = readdirSync(LOCALES_DIR).sort();
    expect(present).toEqual([...SUPPORTED].sort());
  });

  it.each(SUPPORTED.filter((l) => l !== 'en'))('%s has the same keys as en', (locale) => {
    const english = Object.keys(dictionaries.en).sort();
    expect(Object.keys(dictionaries[locale]).sort()).toEqual(english);
  });

  it.each(SUPPORTED)('%s has no empty values', (locale) => {
    const empty = Object.entries(dictionaries[locale])
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it('every key referenced in the UI exists in every locale', async () => {
    const { readdirSync: readDir, statSync } = await import('node:fs');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readDir(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/[.]tsx?$/.test(entry) && !full.includes('__tests__')) files.push(full);
      }
    };
    walk(path.join(process.cwd(), 'src'));

    const referenced = new Set<string>();
    // Direct t('key') calls, plus nav/footer link tables that carry the key as
    // a label - those render through t() without a literal call site.
    const patterns = [/t\(\s*'([a-z0-9_]+)'/g, /label:\s*'((?:nav|footer)_[a-z0-9_]+)'/g];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) referenced.add(match[1]);
      }
    }

    const missing: string[] = [];
    for (const key of referenced) {
      for (const locale of SUPPORTED) {
        if (!(key in dictionaries[locale])) missing.push(`${locale}:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it.each(SUPPORTED.filter((l) => l !== 'en'))('%s is actually translated', (locale) => {
    const untranslated = Object.entries(dictionaries[locale])
      .filter(([key, value]) => !SHARED_BY_DESIGN.has(key) && value === dictionaries.en[key])
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });
});
