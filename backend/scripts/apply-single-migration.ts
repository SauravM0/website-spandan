import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const file = process.argv[2];
if (!file || !/^\d{3}_[a-z0-9_]+\.sql$/.test(file)) {
  throw new Error('Provide one migration filename, for example 027_doctor_calendar_slot_control.sql');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from backend/.env');
}

const migrationPath = path.resolve(__dirname, '../migrations', file);
const migrationsDir = path.resolve(__dirname, '../migrations');
if (path.dirname(migrationPath) !== migrationsDir || !fs.existsSync(migrationPath)) {
  throw new Error(`Migration not found: ${file}`);
}

async function applySingleMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const preflight = await client.query(`SELECT current_database() AS database_name`);
    const state = preflight.rows[0];

    if (file === '027_doctor_calendar_slot_control.sql') {
      const calendarState = await client.query(
        `SELECT to_regclass('public.calendar_exceptions') AS calendar_exceptions,
                to_regclass('public.doctor_schedule_versions') AS doctor_schedule_versions,
                to_regclass('public.schedule_conflict_cases') AS schedule_conflict_cases`
      );
      const calendar = calendarState.rows[0];
      if (!calendar.calendar_exceptions || !calendar.doctor_schedule_versions || !calendar.schedule_conflict_cases) {
        throw new Error('Required earlier calendar migrations are missing; migration 027 was not applied');
      }
    }

    await client.query('BEGIN');
    try {
      await client.query(fs.readFileSync(migrationPath, 'utf8'));
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    if (file === '027_doctor_calendar_slot_control.sql') {
      const verification = await client.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'calendar_exceptions'
               AND column_name = 'slot_minutes'
               AND data_type = 'integer'
           ) AS slot_minutes_exists,
           EXISTS (
             SELECT 1 FROM pg_constraint
             WHERE conname = 'calendar_exceptions_slot_minutes_check'
               AND conrelid = 'public.calendar_exceptions'::regclass
           ) AS slot_constraint_exists`
      );
      const verified = verification.rows[0];
      if (!verified.slot_minutes_exists || !verified.slot_constraint_exists) {
        throw new Error('Migration ran but verification failed');
      }
      console.log('Verified: calendar_exceptions.slot_minutes integer column');
      console.log('Verified: calendar_exceptions_slot_minutes_check constraint');
    }

    if (file === '029_doctor_profile_photos.sql') {
      const verification = await client.query(
        `SELECT slug, photo_url
         FROM doctors
         WHERE slug IN ('dr-tukaram-aute', 'dr-pratibha-aute')
         ORDER BY slug`
      );
      const expected = new Map([
        ['dr-pratibha-aute', '/doctors/dr-pratibha-pawal-aute.png'],
        ['dr-tukaram-aute', '/doctors/dr-tukaram-sonaji-aute.png'],
      ]);
      if (
        verification.rows.length !== expected.size ||
        verification.rows.some((row) => expected.get(row.slug) !== row.photo_url)
      ) {
        throw new Error('Migration ran but doctor photo verification failed');
      }
      console.log('Verified: both doctor photo URLs');
    }

    if (file === '030_health_package_catalog.sql') {
      const verification = await client.query(
        `SELECT
           p.slug,
           p.base_price::numeric::text AS original_price,
           p.discounted_price::numeric::text AS offer_price,
           p.discount_label,
           COUNT(pt.id)::int AS inclusion_count
         FROM packages p
         LEFT JOIN package_tests pt ON pt.package_id = p.id
         WHERE p.slug IN (
           'diabetic-package',
           'cardiac-package',
           'advanced-cardiac-package',
           'diabetic-and-cardiac-package',
           'full-body-check-up-package'
         )
           AND p.is_active = true
           AND p.publication_status = 'published'
         GROUP BY p.id
         ORDER BY p.display_order`
      );
      const expected = new Map([
        ['diabetic-package', { original: '4240.00', offer: '3000.00', discount: '29% OFF', count: 12 }],
        ['cardiac-package', { original: '5300.00', offer: '2500.00', discount: '53% OFF', count: 10 }],
        ['advanced-cardiac-package', { original: '5620.00', offer: '3400.00', discount: '40% OFF', count: 14 }],
        ['diabetic-and-cardiac-package', { original: '6540.00', offer: '5200.00', discount: '20% OFF', count: 16 }],
        ['full-body-check-up-package', { original: '10000.00', offer: '6000.00', discount: '40% OFF', count: 17 }],
      ]);
      const valid = verification.rows.length === expected.size && verification.rows.every((row) => {
        const item = expected.get(row.slug);
        return item
          && row.original_price === item.original
          && row.offer_price === item.offer
          && row.discount_label === item.discount
          && row.inclusion_count === item.count;
      });
      if (!valid) {
        throw new Error('Migration ran but package catalog verification failed');
      }
      for (const row of verification.rows) {
        console.log(
          `Verified: ${row.slug} | original ${row.original_price} | offer ${row.offer_price} | ${row.discount_label} | ${row.inclusion_count} inclusions`
        );
      }
    }

    if (file === '031_custom_diagnostic_packages.sql') {
      const verification = await client.query(
        `SELECT
           to_regclass('public.diagnostic_tests') IS NOT NULL AS diagnostic_tests_exists,
           to_regclass('public.custom_test_order_items') IS NOT NULL AS custom_items_exists,
           (SELECT COUNT(*)::int FROM diagnostic_tests) AS source_count,
           (SELECT COUNT(*)::int FROM diagnostic_tests WHERE is_active = true) AS public_count,
           (SELECT COUNT(*)::int FROM diagnostic_tests WHERE price <> 0 OR price_confirmed = true) AS priced_count,
           EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'package_orders' AND column_name = 'order_type'
           ) AS order_type_exists,
           EXISTS (
             SELECT 1 FROM diagnostic_tests
             WHERE source_number = 93 AND name = '24 Hour Urine Calcium' AND is_active = false
           ) AS duplicate_hidden`
      );
      const verified = verification.rows[0];
      if (
        !verified.diagnostic_tests_exists ||
        !verified.custom_items_exists ||
        !verified.order_type_exists ||
        !verified.duplicate_hidden ||
        verified.source_count !== 110 ||
        verified.public_count !== 109 ||
        verified.priced_count !== 0
      ) {
        throw new Error('Migration ran but custom diagnostic package verification failed');
      }
      console.log(`Verified: ${verified.source_count} source tests and ${verified.public_count} unique public choices`);
      console.log('Verified: all diagnostic prices start at 0 and are unconfirmed');
      console.log('Verified: custom_test_order_items and package_orders.order_type');
    }

    console.log(`Connected to database: ${state.database_name}`);
    console.log(`Applied migration: ${file}`);
  } finally {
    client.release();
    await pool.end();
  }
}

applySingleMigration().catch((error) => {
  console.error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
