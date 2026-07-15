import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'buffer',
});
if (listed.status !== 0) throw new Error('Unable to enumerate repository files for secret scanning.');

const files = listed.stdout.toString('utf8').split('\0').filter(Boolean);
const errors = [];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.yml', '.yaml', '.md', '.txt', '.sql', '.example', '']);
const excludedContent = (file) => file.includes('/tests/') || file.endsWith('package-lock.json') || file.endsWith('secret-context-check.mjs');
const secretPatterns = [
  [/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bgh[opsu]_[A-Za-z0-9]{30,}\b/, 'GitHub token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/, 'Slack token'],
  [/["'`](?:admin123|staff123|Admin@123)["'`]/, 'default staff password'],
  [/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i, 'database URL with embedded credentials'],
];

for (const file of files) {
  const normalized = file.replace(/\\/g, '/');
  const basename = path.posix.basename(normalized);
  if (basename === '.env' || (basename.startsWith('.env.') && basename !== '.env.example')) {
    errors.push(`${normalized}: tracked environment file`);
  }
  if (excludedContent(normalized) || !textExtensions.has(path.extname(normalized))) continue;
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 1024 * 1024) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  for (const [pattern, label] of secretPatterns) {
    if (normalized.endsWith('.env.example') && label === 'database URL with embedded credentials') continue;
    if (pattern.test(content)) errors.push(`${normalized}: possible ${label}`);
  }
}

const requiredIgnores = {
  'backend/.dockerignore': ['.env', '.env.*', '*.log', '.private-documents', '*.enc'],
  'frontend/.dockerignore': ['.env', '.env.*', '*.log'],
};
for (const [file, required] of Object.entries(requiredIgnores)) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const entry of required) {
    if (!content.split(/\r?\n/).includes(entry)) errors.push(`${file}: missing ${entry}`);
  }
}

if (errors.length) {
  console.error('Secret and image-context check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Secret and image-context check passed across ${files.length} repository files.`);
