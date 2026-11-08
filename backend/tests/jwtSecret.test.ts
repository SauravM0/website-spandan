import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveJwtSecret } from '../src/config';

const PLACEHOLDER = 'CHANGE_ME_IN_PRODUCTION_MUST_BE_AT_LEAST_32_CHARS';

/**
 * The placeholder is published in the repository, so anything that signs a real
 * session with it hands out forgeable admin tokens. These cases pin the one
 * rule that matters: it must never survive into a production process.
 */

test('a production process refuses to start without a configured secret', () => {
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    /JWT_SECRET must be set/
  );
});

test('a production process refuses the published placeholder', () => {
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: PLACEHOLDER } as NodeJS.ProcessEnv),
    /JWT_SECRET must be set/
  );
});

test('whitespace does not disguise a missing secret', () => {
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '   ' } as NodeJS.ProcessEnv),
    /JWT_SECRET must be set/
  );
});

test('a real production secret is accepted', () => {
  const secret = 'a-genuinely-configured-secret-value-32+';
  assert.equal(
    resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: secret } as NodeJS.ProcessEnv),
    secret
  );
});

test('development still runs without a .env file', () => {
  assert.equal(resolveJwtSecret({ NODE_ENV: 'development' } as NodeJS.ProcessEnv), PLACEHOLDER);
});

test('development honours a configured secret when one is present', () => {
  assert.equal(
    resolveJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'local-secret' } as NodeJS.ProcessEnv),
    'local-secret'
  );
});
