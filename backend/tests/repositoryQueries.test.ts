import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Captures the SQL and parameters the repositories send, so the row bounds and
 * the escaped search term are verified where they matter: at the query boundary.
 */

const captured: { sql: string; values: unknown[] }[] = [];

const databaseModulePath = require.resolve('../src/config/database');
require.cache[databaseModulePath] = {
  id: databaseModulePath,
  filename: databaseModulePath,
  loaded: true,
  exports: {
    pool: { on() {}, end: async () => {} },
    getClient: async () => {
      throw new Error('not used');
    },
    getDatabasePoolSnapshot: () => ({}),
    async query(sql: string, values: unknown[] = []) {
      captured.push({ sql, values });
      return { rows: [], rowCount: 0 };
    },
  },
} as unknown as NodeModule;

const doctorRepo = require('../src/repositories/doctorRepository');
const articleRepo = require('../src/repositories/articleRepository');

test('the doctor listing is bounded on both the active and full queries', async () => {
  captured.length = 0;
  await doctorRepo.getDoctors(true);
  await doctorRepo.getDoctors(false);
  assert.equal(captured.length, 2);
  for (const q of captured) {
    assert.match(q.sql, new RegExp(`LIMIT ${doctorRepo.MAX_DOCTOR_ROWS}$`));
  }
});

test('the article listing is bounded on both the published and full queries', async () => {
  captured.length = 0;
  await articleRepo.getArticles(true);
  await articleRepo.getArticles(false);
  for (const q of captured) {
    assert.match(q.sql, /LIMIT 500$/);
  }
});

test('a search for a literal percent sign is bound escaped, not as a wildcard', async () => {
  captured.length = 0;
  await articleRepo.getArticlesByLanguage({ q: '%' });
  const search = captured.find((q) => /ILIKE/i.test(q.sql));
  assert.ok(search, 'search query should run');
  const pattern = search.values.find((v) => typeof v === 'string' && v.includes('%')) as string;
  assert.equal(pattern, '%\\%%', 'the user percent sign must be escaped inside the pattern');
});

test('the search term stays a bound parameter, never spliced into the SQL', async () => {
  captured.length = 0;
  await articleRepo.getArticlesByLanguage({ q: "x'; DROP TABLE articles; --" });
  const search = captured.find((q) => /ILIKE/i.test(q.sql));
  assert.ok(search);
  assert.doesNotMatch(search.sql, /DROP TABLE/);
});
