import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve(__dirname, '../migrations');
const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();
const seenPrefixes = new Map<string, string>();
const errors: string[] = [];

if (files.length === 0) {
  errors.push('No migration files found.');
}

for (const file of files) {
  const prefix = file.match(/^(\d{3})_/)?.[1];
  if (!prefix) {
    errors.push(
      `${file}: migration filename must start with a three-digit prefix, for example 011_example.sql.`
    );
    continue;
  }

  const previous = seenPrefixes.get(prefix);
  if (previous) {
    errors.push(`${file}: duplicate migration prefix ${prefix}; already used by ${previous}.`);
  }
  seenPrefixes.set(prefix, file);

  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim();
  if (!sql) {
    errors.push(`${file}: migration is empty.`);
  }
  if (
    /\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i.test(sql) &&
    !/--\s*allow-destructive-migration/i.test(sql)
  ) {
    errors.push(`${file}: destructive DROP requires an "-- allow-destructive-migration" comment.`);
  }
  if (
    /\bDELETE\s+FROM\b/i.test(sql) &&
    !/\bWHERE\b/i.test(sql) &&
    !/--\s*allow-full-delete/i.test(sql)
  ) {
    errors.push(`${file}: DELETE without WHERE requires an "-- allow-full-delete" comment.`);
  }
}

if (errors.length > 0) {
  console.error('Migration validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${files.length} migration(s).`);
