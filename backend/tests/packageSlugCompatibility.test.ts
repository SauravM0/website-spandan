import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPackageSlug } from '../src/utils/packageSlugs';

test('legacy cached package URLs resolve to the current catalog slugs', () => {
  assert.equal(canonicalPackageSlug('advance-cardiac-package'), 'advanced-cardiac-package');
  assert.equal(canonicalPackageSlug('basic-cardiac-package'), 'cardiac-package');
  assert.equal(canonicalPackageSlug('diabetes-management-package'), 'diabetic-package');
  assert.equal(canonicalPackageSlug('full-body-checkup'), 'full-body-check-up-package');
});

test('current and unknown package slugs pass through unchanged', () => {
  assert.equal(canonicalPackageSlug('diabetic-package'), 'diabetic-package');
  assert.equal(canonicalPackageSlug('unknown-package'), 'unknown-package');
});
