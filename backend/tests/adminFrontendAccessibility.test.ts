import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

function adminSource() {
  const roots = ['frontend/src/app/admin', 'frontend/src/components/admin'];
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (/\.tsx?$/.test(entry.name)) files.push(target);
    }
  };
  roots.forEach((directory) => visit(path.join(root, directory)));
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
}

test('admin workflows use accessible application dialogs instead of browser dialogs', () => {
  const source = adminSource();
  const dialog = read('frontend/src/components/admin/AdminActionDialog.tsx');
  const primitives = read('frontend/src/components/admin/AdminPrimitives.tsx');
  assert.doesNotMatch(source, /window\.(confirm|prompt)\s*\(/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /event\.key === 'Escape'/);
  assert.match(dialog, /FocusTrap/);
  assert.match(primitives, /export function AdminDrawer/);
  assert.match(primitives, /min-h-\[44px\]/);
});

test('admin filters, requests, feedback, motion and Web Vitals have production primitives', () => {
  const appointments = read('frontend/src/app/admin/(protected)/appointments/page.tsx');
  const hooks = read('frontend/src/features/admin/shared/hooks.ts');
  const primitives = read('frontend/src/components/admin/AdminPrimitives.tsx');
  const css = read('frontend/src/styles/globals.css');
  const vitals = read('frontend/src/components/telemetry/WebVitalsReporter.tsx');
  assert.match(appointments, /useSearchParams/);
  assert.match(appointments, /router\.replace/);
  assert.match(hooks, /AbortController/);
  assert.match(hooks, /current\.current\?\.id === state\.id/);
  assert.match(primitives, /aria-live/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(vitals, /'INP'/);
  assert.match(vitals, /'LCP'/);
});
