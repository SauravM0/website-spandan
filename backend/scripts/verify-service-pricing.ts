import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { resolveServicePrice } from '../src/services/servicePricing';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing from backend/.env');

async function verify() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
  try {
    const schema = await pool.query(`
      SELECT
        to_regclass('public.billable_services') IS NOT NULL AS services_table,
        to_regclass('public.billable_service_price_history') IS NOT NULL AS history_table,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointment_holds' AND column_name='service_price_version') AS hold_snapshot,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='service_price_version') AS appointment_snapshot
    `);
    const checks = schema.rows[0];
    if (!Object.values(checks).every(Boolean)) throw new Error(`Schema verification failed: ${JSON.stringify(checks)}`);

    const pricing = await pool.query(`
      SELECT s.id, s.code, s.name, s.is_active, h.price, h.currency, h.version, h.effective_from
      FROM billable_services s
      JOIN billable_service_price_history h ON h.service_id=s.id
      WHERE s.code='consultation' AND s.doctor_id IS NULL AND s.appointment_type IS NULL
      ORDER BY h.version DESC LIMIT 1
    `);
    const consultation = pricing.rows[0];
    if (!consultation || !consultation.is_active || Number(consultation.price) < 0 || consultation.currency !== 'INR') {
      const diagnostic = await pool.query(`SELECT code, name, doctor_id IS NULL AS clinic_wide, appointment_type, is_active FROM billable_services ORDER BY code`);
      throw new Error(`The default consultation service or its active INR price is invalid: ${JSON.stringify({ consultation: consultation || null, services: diagnostic.rows })}`);
    }
    const resolved = await resolveServicePrice(
      { query: (text, params) => pool.query(text, params) },
      'consultation',
      null,
      'new',
      true
    );
    if (resolved.id !== consultation.id || Number(resolved.price) !== Number(consultation.price)) {
      throw new Error('Authoritative service-price resolution did not return the active public price');
    }

    console.log('Verified: billable service and immutable price-history tables');
    console.log('Verified: hold and appointment service snapshot columns');
    console.log(`Verified: active ${consultation.name} price ₹${Number(consultation.price).toFixed(2)} (version ${consultation.version})`);
    console.log('Verified: authoritative public price resolution');
  } finally { await pool.end(); }
}

verify().catch((error) => { console.error(`Pricing verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`); process.exit(1); });
