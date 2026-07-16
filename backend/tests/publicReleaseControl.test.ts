import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCommerceDecision } from '../src/middleware/publicRelease';

test('public commerce release modes fail closed and require the pilot secret', () => {
  assert.equal(publicCommerceDecision('disabled'), 'disabled');
  assert.equal(publicCommerceDecision('staff_pilot', '', 'a'.repeat(32)), 'pilot_token_required');
  assert.equal(publicCommerceDecision('staff_pilot', 'a'.repeat(32), 'a'.repeat(32)), 'allow');
  assert.equal(publicCommerceDecision('public'), 'allow');
});

test('pilot secret comparison rejects different values and lengths', () => {
  assert.equal(
    publicCommerceDecision('staff_pilot', 'b'.repeat(32), 'a'.repeat(32)),
    'pilot_token_required'
  );
  assert.equal(
    publicCommerceDecision('staff_pilot', 'short', 'a'.repeat(32)),
    'pilot_token_required'
  );
});
