import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UnknownColumnError,
  buildInsert,
  buildUpdate,
} from '../src/persistence/sqlBuilders';

/**
 * These builders interpolate column names into SQL text, so they are the one
 * place a request body can reach the statement itself. The placeholder maths
 * matters just as much: an off-by-one here silently writes each value into the
 * neighbouring column instead of failing.
 */

test('update binds each column to its own value', () => {
  const statement = buildUpdate('doctors', 'ID-123', {
    name: 'Alice',
    speciality: 'Cardiology',
  });

  assert.ok(statement);
  assert.equal(
    statement.sql,
    'UPDATE doctors SET name = $1, speciality = $2, updated_at = NOW() WHERE id = $3 RETURNING *'
  );
  assert.deepEqual(statement.values, ['Alice', 'Cardiology', 'ID-123']);
});

test('update keeps the id clear of the column placeholders', () => {
  const statement = buildUpdate('doctors', 'ID-9', { name: 'Solo' });
  assert.ok(statement);
  // One column means the id must be $2, not $1 and not a reused placeholder.
  assert.equal(
    statement.sql,
    'UPDATE doctors SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *'
  );
  assert.deepEqual(statement.values, ['Solo', 'ID-9']);
});

test('update returns null when there is nothing to set', () => {
  assert.equal(buildUpdate('doctors', 'ID-1', {}), null);
});

test('insert numbers placeholders from one', () => {
  const statement = buildInsert('doctors', { name: 'Bob', slug: 'bob' });
  assert.equal(
    statement.sql,
    'INSERT INTO doctors (name, slug) VALUES ($1, $2) RETURNING *'
  );
  assert.deepEqual(statement.values, ['Bob', 'bob']);
});

test('insert rejects a column name carrying injected SQL', () => {
  assert.throws(
    () => buildInsert('doctors', { "name) VALUES ('x') RETURNING *; --": 'y' }),
    UnknownColumnError
  );
});

test('update rejects a column name carrying injected SQL', () => {
  assert.throws(
    () => buildUpdate('doctors', 'ID-1', { "speciality = 'x', is_active = false": 'y' }),
    UnknownColumnError
  );
});

test('generated columns cannot be overwritten by a caller', () => {
  for (const column of ['id', 'created_at', 'updated_at']) {
    assert.throws(() => buildInsert('doctors', { [column]: 'spoofed' }), UnknownColumnError);
    assert.throws(() => buildUpdate('doctors', 'ID-1', { [column]: 'spoofed' }), UnknownColumnError);
  }
});

test('a column from another table is rejected', () => {
  assert.throws(() => buildInsert('doctors', { password_hash: 'x' }), UnknownColumnError);
});

test('an unlisted table is refused outright', () => {
  assert.throws(() => buildInsert('packages', { name: 'x' }), /No writable column list/);
});

test('the real writable columns still pass', () => {
  const statement = buildInsert('articles', {
    slug: 'a',
    title: 'T',
    body_md: '#',
    content_status: 'published',
    tags: ['x'],
  });
  assert.match(statement.sql, /INSERT INTO articles \(slug, title, body_md, content_status, tags\)/);
  assert.equal(statement.values.length, 5);
});
