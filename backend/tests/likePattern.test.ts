import assert from 'node:assert/strict';
import test from 'node:test';
import { containsPattern, escapeLikePattern } from '../src/utils/likePattern';

const BS = String.fromCharCode(92); // a single backslash, written without escaping

test('a percent sign is matched literally, not as a wildcard', () => {
  assert.equal(escapeLikePattern('100%'), `100${BS}%`);
  assert.equal(containsPattern('%'), `%${BS}%%`);
});

test('an underscore is matched literally', () => {
  assert.equal(escapeLikePattern('a_b'), `a${BS}_b`);
});

test('a backslash is escaped before the others are added', () => {
  // Escaping the backslash last would re-escape the escapes added for % and _.
  assert.equal(escapeLikePattern(`a${BS}b`), `a${BS}${BS}b`);
  assert.equal(escapeLikePattern(`50%${BS}`), `50${BS}%${BS}${BS}`);
});

test('ordinary search text is untouched', () => {
  assert.equal(containsPattern('diabetes'), '%diabetes%');
  assert.equal(containsPattern('Heart health'), '%Heart health%');
});
