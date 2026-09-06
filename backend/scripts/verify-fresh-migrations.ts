import crypto from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createDatabaseRuntimePolicy } from '../src/config/databasePolicy';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const schema = `upi_fresh_${crypto.randomBytes(8).toString('hex')}`;
  if (!/^upi_fresh_[a-f0-9]{16}$/.test(schema)) throw new Error('Unsafe test schema name');
  const pool = new Pool(createDatabaseRuntimePolicy(process.env, 'migration').poolConfig);
  const client = await pool.connect();
  try {
    // Historical migration 009 uses digest(); hosted deployments provision pgcrypto as a
    // database prerequisite rather than changing the checksum of already-applied migration 001.
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}",public,extensions`);
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = (await readdir(migrationsDir))
      .filter((file) => /^\d{3}_.+\.sql$/.test(file))
      .sort();
    for (const file of files) {
      await client.query('BEGIN');
      try {
        await client.query(await readFile(path.join(migrationsDir, file), 'utf8'));
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Fresh migration failed at ${file}: ${(error as Error).message}`);
      }
    }
    const result = await client.query(
      `SELECT
         to_regclass('payment_configurations') IS NOT NULL AS configurations,
         to_regclass('direct_upi_utr_claims') IS NOT NULL AS utr_claims,
         EXISTS(SELECT 1 FROM payment_configurations WHERE is_active AND active_provider='disabled') AS safe_bootstrap`
    );
    if (!result.rows[0]?.configurations || !result.rows[0]?.utr_claims || !result.rows[0]?.safe_bootstrap) {
      throw new Error('Fresh schema did not contain the expected safe Direct UPI structures');
    }
    console.log(`Fresh schema migration passed: ${files.length} migrations, safe disabled bootstrap.`);
  } finally {
    await client.query('RESET search_path').catch(() => undefined);
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
