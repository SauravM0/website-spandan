import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const supported = /\.(?:ts|tsx|js|mjs|json|md|yml|yaml|css)$/i;
const base = process.env.FORMAT_BASE_SHA?.trim();
const diffArgs =
  base && !/^0+$/.test(base)
    ? ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]
    : ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'];
const diff = spawnSync('git', diffArgs, { encoding: 'utf8' });
if (diff.status !== 0) {
  console.error(diff.stderr || 'Unable to determine changed files.');
  process.exit(1);
}

const untracked = base
  ? { status: 0, stdout: '' }
  : spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
if (untracked.status !== 0) {
  console.error(untracked.stderr || 'Unable to determine untracked files.');
  process.exit(1);
}

const files = `${diff.stdout}\n${untracked.stdout}`
  .split(/\r?\n/)
  .filter(
    (file) => supported.test(file) && fs.existsSync(file) && file !== 'frontend/next-env.d.ts'
  );

if (!files.length) {
  console.log('No changed files require Prettier validation.');
  process.exit(0);
}

const prettier = path.resolve('node_modules/prettier/bin/prettier.cjs');
const result = spawnSync(process.execPath, [prettier, '--check', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
