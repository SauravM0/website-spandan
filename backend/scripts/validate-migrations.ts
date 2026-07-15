import path from 'node:path';
import { discoverMigrations } from '../src/migrations/runner';

const migrationsDir = path.resolve(__dirname, '../migrations');
const errors: string[] = [];

try {
  const migrations = discoverMigrations(migrationsDir);
  for (const migration of migrations) {
    if (
      /\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i.test(migration.sql) &&
      !/--\s*allow-destructive-migration/i.test(migration.sql)
    ) {
      errors.push(
        `${migration.filename}: destructive DROP requires an "-- allow-destructive-migration" comment.`
      );
    }
    if (
      /\bDELETE\s+FROM\b/i.test(migration.sql) &&
      !/\bWHERE\b/i.test(migration.sql) &&
      !/--\s*allow-full-delete/i.test(migration.sql)
    ) {
      errors.push(
        `${migration.filename}: DELETE without WHERE requires an "-- allow-full-delete" comment.`
      );
    }
    if (/\b(?:CREATE\s+INDEX|REINDEX)\s+CONCURRENTLY\b/i.test(migration.sql)) {
      errors.push(
        `${migration.filename}: concurrent index operations are incompatible with transactional migrations.`
      );
    }
    if (/\b(?:VACUUM|CHECKPOINT|CREATE\s+DATABASE|DROP\s+DATABASE)\b/i.test(migration.sql)) {
      errors.push(
        `${migration.filename}: contains a command that cannot run in a migration transaction.`
      );
    }
    if (migration.version >= 32) {
      const phase = migration.sql.match(
        /^--\s*migration-phase:\s*(expand|migrate|contract)\s*$/im
      )?.[1];
      if (!phase) {
        errors.push(
          `${migration.filename}: migrations from version 032 require a migration-phase marker.`
        );
      }
      if (
        /\b(?:DROP\s+(?:COLUMN|TABLE)|ALTER\s+COLUMN\s+\S+\s+SET\s+NOT\s+NULL)\b/i.test(
          migration.sql
        ) &&
        phase !== 'contract'
      ) {
        errors.push(
          `${migration.filename}: compatibility-breaking SQL is allowed only in contract phase.`
        );
      }
      if (phase === 'contract' && !/^--\s*compatibility-approved:\s*WP\d+/im.test(migration.sql)) {
        errors.push(
          `${migration.filename}: contract phase requires a compatibility approval reference.`
        );
      }
    }
  }

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Validated ${migrations.length} contiguous transactional migration(s).`);
} catch (error) {
  console.error('Migration validation failed:');
  for (const message of (error as Error).message.split('\n')) console.error(`- ${message}`);
  process.exitCode = 1;
}
