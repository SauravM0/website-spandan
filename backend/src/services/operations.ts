import crypto from 'crypto';
import { PoolClient } from 'pg';
import { getClient, query } from '../config/database';
import { config } from '../config';
import { getPackageCommerceCatalog } from '../repositories/packageRepository';
import {
  amountToPaisa,
  extractPhonePePaymentDetail,
  getPhonePeOrderStatus,
  initiatePhonePePayment,
  normalizePhonePeState,
} from './phonePe';
import { queueReceiptEmailForPayment } from './notifications';

type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

type PatientInput = {
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  age_years?: number;
  gender?: string;
  address?: string;
  guardian?: { full_name: string; phone: string; relationship?: string };
};

type Slot = {
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  reason?: string;
};

export type AppointmentConfig = {
  default_slot_minutes: number;
  minimum_booking_notice_minutes: number;
  maximum_booking_horizon_days: number;
  hold_duration_minutes: number;
  same_day_booking_allowed: boolean;
  cancellation_cutoff_hours: number;
  arrival_buffer_instructions: string;
};

const defaultAppointmentConfig: AppointmentConfig = {
  default_slot_minutes: 30,
  minimum_booking_notice_minutes: 60,
  maximum_booking_horizon_days: 30,
  hold_duration_minutes: 15,
  same_day_booking_allowed: true,
  cancellation_cutoff_hours: 24,
  arrival_buffer_instructions: 'Please arrive 10 minutes before your appointment.',
};

const appointmentConfigLimits = {
  default_slot_minutes: { min: 30, max: 30 },
  minimum_booking_notice_minutes: { min: 0, max: 1440 },
  maximum_booking_horizon_days: { min: 1, max: 180 },
  hold_duration_minutes: { min: 5, max: 1440 },
  cancellation_cutoff_hours: { min: 0, max: 168 },
} as const;

export function appointmentConfigWarnings(settings: AppointmentConfig): string[] {
  const warnings: string[] = [];
  if (settings.hold_duration_minutes >= 1440) {
    warnings.push(
      'A 24-hour slot hold can block appointment capacity for a full day. Use it only for a deliberate clinic policy.'
    );
  } else if (settings.hold_duration_minutes > 60) {
    warnings.push('Slot holds longer than 60 minutes may reduce available booking capacity.');
  }
  return warnings;
}

function clampNumber(value: number, key: keyof typeof appointmentConfigLimits): number {
  const limits = appointmentConfigLimits[key];
  return Math.min(limits.max, Math.max(limits.min, value));
}

export function normalizeAppointmentConfig(
  value: Partial<AppointmentConfig> | null | undefined
): AppointmentConfig {
  const merged = { ...defaultAppointmentConfig, ...(value || {}) };
  return {
    default_slot_minutes: 30,
    minimum_booking_notice_minutes: clampNumber(
      Number(merged.minimum_booking_notice_minutes),
      'minimum_booking_notice_minutes'
    ),
    maximum_booking_horizon_days: clampNumber(
      Number(merged.maximum_booking_horizon_days),
      'maximum_booking_horizon_days'
    ),
    hold_duration_minutes: clampNumber(
      Number(merged.hold_duration_minutes),
      'hold_duration_minutes'
    ),
    same_day_booking_allowed: Boolean(merged.same_day_booking_allowed),
    cancellation_cutoff_hours: clampNumber(
      Number(merged.cancellation_cutoff_hours),
      'cancellation_cutoff_hours'
    ),
    arrival_buffer_instructions: String(
      merged.arrival_buffer_instructions || defaultAppointmentConfig.arrival_buffer_instructions
    ).slice(0, 500),
  };
}

function compactTime(value: string): string {
  return value.slice(0, 5);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}

function minutesSinceMidnight(time: string): number {
  const [h, m] = compactTime(time).split(':').map(Number);
  return h * 60 + m;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return (
    minutesSinceMidnight(startA) < minutesSinceMidnight(endB) &&
    minutesSinceMidnight(endA) > minutesSinceMidnight(startB)
  );
}

function clinicNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}:00`,
  };
}

function addClinicDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function orderNumber(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isTerminalPaymentStatus(status: string): boolean {
  return ['success', 'failed', 'expired', 'refunded', 'disputed'].includes(status);
}

function redactPaymentPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPaymentPayload);
  if (!value || typeof value !== 'object') return value;
  const redacted: Record<string, unknown> = {};
  const sensitive = new Set([
    'accountNumber',
    'maskedAccountNumber',
    'accountHolderName',
    'cardNumber',
    'vpa',
    'upiTransactionId',
    'auth',
    'authorization',
  ]);
  for (const [key, child] of Object.entries(value)) {
    redacted[key] = sensitive.has(key) ? '[redacted]' : redactPaymentPayload(child);
  }
  return redacted;
}

async function nextReceiptNumber(db: Queryable): Promise<string> {
  const result = await db.query(`SELECT nextval('receipt_number_seq') AS value`);
  return `SPD-${new Date().getFullYear()}-${String(result.rows[0].value).padStart(6, '0')}`;
}

async function createPatient(client: PoolClient, input: PatientInput): Promise<string> {
  const result = await client.query(
    `INSERT INTO patients (full_name, phone, email, date_of_birth, age_years, gender, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.full_name,
      input.phone,
      input.email || null,
      input.date_of_birth || null,
      input.age_years || null,
      input.gender || null,
      input.address || null,
    ]
  );
  const patientId = result.rows[0].id;

  if (input.guardian?.full_name && input.guardian.phone) {
    await client.query(
      `INSERT INTO guardians (patient_id, full_name, phone, relationship)
       VALUES ($1, $2, $3, $4)`,
      [
        patientId,
        input.guardian.full_name,
        input.guardian.phone,
        input.guardian.relationship || 'guardian',
      ]
    );
  }

  return patientId;
}

export async function getAppointmentConfig(db: Queryable = { query }): Promise<AppointmentConfig> {
  const result = await db.query(
    `SELECT value FROM admin_settings WHERE key = 'appointment_config'`
  );
  return normalizeAppointmentConfig(result.rows[0]?.value || {});
}

export async function updateAppointmentConfig(
  input: Partial<AppointmentConfig>
): Promise<{ settings: AppointmentConfig; warnings: string[] }> {
  const current = await getAppointmentConfig();
  const next = normalizeAppointmentConfig({ ...current, ...input, default_slot_minutes: 30 });
  const result = await query(
    `INSERT INTO admin_settings (key, value)
     VALUES ('appointment_config', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
     RETURNING value`,
    [JSON.stringify(next)]
  );
  const settings = normalizeAppointmentConfig(result.rows[0]?.value || next);
  return { settings, warnings: appointmentConfigWarnings(settings) };
}

async function expireOldHolds(db: Queryable = { query }) {
  await db.query(
    `UPDATE appointment_holds
     SET status = 'expired', released_at = COALESCE(released_at, NOW())
     WHERE status = 'active' AND expires_at <= NOW()`
  );
}

function buildSlotsForDate(input: {
  doctorId: string;
  date: string;
  settings: AppointmentConfig;
  rules: any[];
  exceptions: any[];
  appointments: any[];
  holds: any[];
}): Slot[] {
  const { doctorId, date, settings, rules, exceptions, appointments, holds } = input;
  const weekday = new Date(`${date}T00:00:00`).getDay();

  const closedAllDay = exceptions.some(
    (row) =>
      row.override_type === 'unavailable_whole_day' ||
      (!row.override_type && !row.is_available && !row.start_time && !row.end_time)
  );
  if (closedAllDay) return [];

  const customHours = exceptions.filter(
    (row) => row.override_type === 'custom_hours' && row.start_time && row.end_time
  );
  const extraHours = exceptions.filter(
    (row) =>
      (row.override_type === 'add_extra_hours' || row.is_available) &&
      row.start_time &&
      row.end_time
  );
  if (weekday === 0 && customHours.length === 0 && extraHours.length === 0) return [];

  const blocked = exceptions.filter(
    (row) =>
      (row.override_type === 'block_time_range' ||
        (!row.override_type && !row.is_available && row.start_time && row.end_time)) &&
      row.start_time &&
      row.end_time
  );
  const windows =
    customHours.length > 0
      ? customHours.map((row) => ({
          start_time: row.start_time,
          end_time: row.end_time,
          slot_minutes: settings.default_slot_minutes,
        }))
      : rules.map((row) => ({
          start_time: row.start_time,
          end_time: row.end_time,
          slot_minutes: row.slot_minutes || settings.default_slot_minutes,
        }));

  windows.push(
    ...extraHours.map((row) => ({
      start_time: row.start_time,
      end_time: row.end_time,
      slot_minutes: settings.default_slot_minutes,
    }))
  );

  const takenRanges = [
    ...appointments.map((row) => ({ start_time: row.start_time, end_time: row.end_time })),
    ...holds.map((row) => ({ start_time: row.start_time, end_time: row.end_time })),
  ];
  const now = clinicNow();
  const horizonDate = addClinicDays(now.date, settings.maximum_booking_horizon_days);
  if (date > horizonDate) return [];

  const slots: Slot[] = [];

  for (const window of windows) {
    let cursor = compactTime(window.start_time);
    const end = compactTime(window.end_time);
    while (cursor < end) {
      const endTime = addMinutes(`${cursor}:00`, window.slot_minutes);
      if (compactTime(endTime) > end) break;
      const blockedByException = blocked.some((row) =>
        overlaps(`${cursor}:00`, endTime, row.start_time, row.end_time)
      );
      const takenByBooking = takenRanges.some((row) =>
        overlaps(`${cursor}:00`, endTime, row.start_time, row.end_time)
      );
      const pastInClinic = date < now.date || (date === now.date && `${cursor}:00` <= now.time);
      const sameDayBlocked = date === now.date && !settings.same_day_booking_allowed;
      const noticeBlocked =
        date === now.date &&
        minutesSinceMidnight(`${cursor}:00`) <
          minutesSinceMidnight(now.time) + settings.minimum_booking_notice_minutes;
      slots.push({
        doctor_id: doctorId,
        date,
        start_time: `${cursor}:00`,
        end_time: endTime,
        available:
          !takenByBooking &&
          !blockedByException &&
          !pastInClinic &&
          !sameDayBlocked &&
          !noticeBlocked,
        reason: takenByBooking
          ? 'Booked or held'
          : blockedByException
            ? 'Unavailable'
            : pastInClinic
              ? 'Past time'
              : sameDayBlocked
                ? 'Same-day booking closed'
                : noticeBlocked
                  ? 'Booking notice required'
                  : undefined,
      });
      cursor = compactTime(endTime);
    }
  }

  return slots
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .filter(
      (slot, index, all) => all.findIndex((item) => item.start_time === slot.start_time) === index
    );
}

export async function listSlotsWithDb(
  db: Queryable,
  doctorId: string,
  date: string
): Promise<Slot[]> {
  const settings = await getAppointmentConfig(db);
  const weekday = new Date(`${date}T00:00:00`).getDay();
  const [rules, exceptions, appointments, holds] = await Promise.all([
    db.query(
      `SELECT * FROM doctor_availability_rules
       WHERE doctor_id = $1 AND weekday = $2 AND is_active = true
         AND effective_from <= $3
         AND (effective_until IS NULL OR effective_until >= $3)
       ORDER BY start_time ASC`,
      [doctorId, weekday, date]
    ),
    db.query(
      `SELECT * FROM calendar_exceptions
       WHERE (doctor_id = $1 OR doctor_id IS NULL) AND exception_date = $2`,
      [doctorId, date]
    ),
    db.query(
      `SELECT start_time, end_time FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2
         AND status IN ('awaiting_payment', 'payment_pending', 'confirmed', 'checked_in')`,
      [doctorId, date]
    ),
    db.query(
      `SELECT start_time, end_time FROM appointment_holds
       WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'active' AND expires_at > NOW()`,
      [doctorId, date]
    ),
  ]);

  return buildSlotsForDate({
    doctorId,
    date,
    settings,
    rules: rules.rows,
    exceptions: exceptions.rows,
    appointments: appointments.rows,
    holds: holds.rows,
  });
}

export async function listSlots(doctorId: string, date: string): Promise<Slot[]> {
  await expireOldHolds();
  return listSlotsWithDb({ query }, doctorId, date);
}

function datesBetween(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    const error = new Error('Invalid availability date range') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 400;
    error.code = 'INVALID_DATE_RANGE';
    throw error;
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (dates.length >= 31) {
      const error = new Error('Availability range cannot exceed 31 days') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 400;
      error.code = 'DATE_RANGE_TOO_LARGE';
      throw error;
    }
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function listDoctorAvailability(
  doctorId: string,
  from: string,
  to: string
): Promise<Record<string, Slot[]>> {
  await expireOldHolds();
  const dates = datesBetween(from, to);
  const settings = await getAppointmentConfig();
  const [rules, exceptions, appointments, holds] = await Promise.all([
    query(
      `SELECT * FROM doctor_availability_rules
       WHERE doctor_id = $1 AND is_active = true
         AND effective_from <= $2
         AND (effective_until IS NULL OR effective_until >= $3)
       ORDER BY weekday ASC, start_time ASC`,
      [doctorId, to, from]
    ),
    query(
      `SELECT * FROM calendar_exceptions
       WHERE (doctor_id = $1 OR doctor_id IS NULL)
         AND exception_date >= $2
         AND exception_date <= $3
       ORDER BY exception_date ASC, start_time ASC NULLS FIRST`,
      [doctorId, from, to]
    ),
    query(
      `SELECT appointment_date, start_time, end_time FROM appointments
       WHERE doctor_id = $1
         AND appointment_date >= $2
         AND appointment_date <= $3
         AND status IN ('awaiting_payment', 'payment_pending', 'confirmed', 'checked_in')`,
      [doctorId, from, to]
    ),
    query(
      `SELECT appointment_date, start_time, end_time FROM appointment_holds
       WHERE doctor_id = $1
         AND appointment_date >= $2
         AND appointment_date <= $3
         AND status = 'active'
         AND expires_at > NOW()`,
      [doctorId, from, to]
    ),
  ]);

  const availability: Record<string, Slot[]> = {};
  for (const date of dates) {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    availability[date] = buildSlotsForDate({
      doctorId,
      date,
      settings,
      rules: rules.rows.filter((row) => {
        const effectiveFrom = formatClinicDate(row.effective_from);
        const effectiveUntil = row.effective_until ? formatClinicDate(row.effective_until) : '';
        return Number(row.weekday) === weekday && effectiveFrom <= date && (!effectiveUntil || effectiveUntil >= date);
      }),
      exceptions: exceptions.rows.filter((row) => formatClinicDate(row.exception_date) === date),
      appointments: appointments.rows.filter((row) => formatClinicDate(row.appointment_date) === date),
      holds: holds.rows.filter((row) => formatClinicDate(row.appointment_date) === date),
    });
  }
  return availability;
}

export async function getAppointmentHold(id: string) {
  await expireOldHolds();
  const result = await query('SELECT * FROM appointment_holds WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createSlotHold(input: {
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  patient_phone: string;
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${input.doctor_id}:${input.appointment_date}`,
    ]);
    await expireOldHolds(client);

    const existingHold = await client.query(
      `SELECT * FROM appointment_holds
       WHERE patient_phone = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [input.patient_phone]
    );
    if (existingHold.rows[0]) {
      const hold = existingHold.rows[0];
      if (
        hold.doctor_id === input.doctor_id &&
        String(hold.appointment_date).slice(0, 10) === input.appointment_date &&
        compactTime(hold.start_time) === compactTime(input.start_time)
      ) {
        await client.query('COMMIT');
        return hold;
      }

      const error = new Error('This phone number already has an active slot hold') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 409;
      error.code = 'ACTIVE_HOLD_EXISTS';
      throw error;
    }

    const settings = await getAppointmentConfig(client);
    const slots = await listSlotsWithDb(client, input.doctor_id, input.appointment_date);
    const slot = slots.find(
      (item) => compactTime(item.start_time) === compactTime(input.start_time)
    );
    if (!slot || !slot.available) {
      const error = new Error('Selected slot is no longer available') as Error & {
        status?: number;
      };
      error.status = 409;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO appointment_holds (doctor_id, appointment_date, start_time, end_time, patient_phone, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6::text || ' minutes')::interval)
       RETURNING *`,
      [
        input.doctor_id,
        input.appointment_date,
        slot.start_time,
        slot.end_time,
        input.patient_phone,
        settings.hold_duration_minutes,
      ]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const error = new Error('This phone number already has an active slot hold') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 409;
      error.code = 'ACTIVE_HOLD_EXISTS';
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function createAppointment(input: {
  hold_id?: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  appointment_type?: string;
  patient: PatientInput;
  source?: string;
  status?: string;
  reception_notes?: string;
  created_by_staff_id?: string;
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${input.doctor_id}:${input.appointment_date}`,
    ]);
    await expireOldHolds(client);
    const patientId = await createPatient(client, input.patient);

    const settings = await getAppointmentConfig(client);
    let endTime = addMinutes(input.start_time, settings.default_slot_minutes);
    let slotMinutes = settings.default_slot_minutes;
    if (input.hold_id) {
      const hold = await client.query(
        `UPDATE appointment_holds
         SET status = 'converted', converted_at = NOW()
         WHERE id = $1 AND status = 'active' AND expires_at > NOW()
         RETURNING *`,
        [input.hold_id]
      );
      if (!hold.rows[0]) throw new Error('Slot hold has expired');
      if (
        hold.rows[0].doctor_id !== input.doctor_id ||
        String(hold.rows[0].appointment_date).slice(0, 10) !== input.appointment_date ||
        compactTime(hold.rows[0].start_time) !== compactTime(input.start_time)
      ) {
        const error = new Error('Slot hold does not match the requested appointment') as Error & {
          status?: number;
        };
        error.status = 409;
        throw error;
      }
      endTime = hold.rows[0].end_time;
      slotMinutes = Math.max(
        1,
        minutesSinceMidnight(endTime) - minutesSinceMidnight(input.start_time)
      );
    } else {
      const slots = await listSlotsWithDb(client, input.doctor_id, input.appointment_date);
      const slot = slots.find(
        (item) => compactTime(item.start_time) === compactTime(input.start_time)
      );
      if (!slot || !slot.available) {
        const error = new Error('Selected slot is no longer available') as Error & {
          status?: number;
        };
        error.status = 409;
        throw error;
      }
      endTime = slot.end_time;
      slotMinutes = Math.max(
        1,
        minutesSinceMidnight(endTime) - minutesSinceMidnight(slot.start_time)
      );
    }

    const appointment = await client.query(
      `INSERT INTO appointments
       (patient_id, doctor_id, hold_id, appointment_date, start_time, end_time, slot_minutes, appointment_type, status, source, reception_notes, created_by_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        patientId,
        input.doctor_id,
        input.hold_id || null,
        input.appointment_date,
        input.start_time,
        endTime,
        slotMinutes,
        input.appointment_type || 'new',
        input.status || (input.source === 'admin' ? 'confirmed' : 'awaiting_payment'),
        input.source || 'public',
        input.reception_notes || null,
        input.created_by_staff_id || null,
      ]
    );

    await client.query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'appointment.created', 'appointment', $2, $3)`,
      [
        input.created_by_staff_id || null,
        appointment.rows[0].id,
        JSON.stringify({ source: input.source || 'public' }),
      ]
    );

    await client.query('COMMIT');
    return appointment.rows[0];
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const error = new Error('This slot was just booked. Please choose another time.') as Error & {
        status?: number;
      };
      error.status = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function createPackageOrder(input: {
  purchaser_name: string;
  phone: string;
  email?: string;
  preferred_date?: string;
  source_language?: string;
  items: Array<{
    package_id: string;
    patient: PatientInput;
    quantity?: number;
    preferred_date?: string;
  }>;
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    let subtotal = 0;
    const orderNo = orderNumber('SPO');

    const order = await client.query(
      `INSERT INTO package_orders (order_number, purchaser_name, phone, email, preferred_date, source_language)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        orderNo,
        input.purchaser_name,
        input.phone,
        input.email || null,
        input.preferred_date || null,
        input.source_language || 'en',
      ]
    );

    for (const item of input.items) {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const pkg = await client.query(
        `SELECT id, name, short_description, description, prep_instructions,
                base_price, discounted_price, is_active, publication_status,
                tax_applicable, tax_name, tax_rate, convenience_fee,
                purchase_status, purchase_enabled, terms_text, no_refund_text,
                effective_start, effective_end, preferred_date_required
         FROM packages WHERE id = $1`,
        [item.package_id]
      );
      const selected = pkg.rows[0];
      if (
        !selected ||
        !selected.is_active ||
        selected.publication_status !== 'published' ||
        !selected.purchase_enabled ||
        selected.purchase_status !== 'available'
      ) {
        throw new Error('Selected package is unavailable');
      }
      const today = clinicNow().date;
      const starts = selected.effective_start
        ? String(selected.effective_start).slice(0, 10)
        : null;
      const ends = selected.effective_end ? String(selected.effective_end).slice(0, 10) : null;
      if ((starts && starts > today) || (ends && ends < today)) {
        throw new Error('Selected package is not available for purchase today');
      }
      if (selected.preferred_date_required && !(item.preferred_date || input.preferred_date)) {
        throw new Error('Preferred date is required for this package');
      }
      const patientId = await createPatient(client, item.patient);
      const unitPrice = Number(selected.discounted_price || selected.base_price);
      const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
      subtotal += lineSubtotal;
      const taxRate = selected.tax_applicable ? Number(selected.tax_rate || 0) : 0;
      const itemTax = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
      const itemFee = Number((Number(selected.convenience_fee || 0) * quantity).toFixed(2));
      const lineTotal = Number((lineSubtotal + itemTax + itemFee).toFixed(2));
      await client.query(
        `INSERT INTO package_order_items (
           order_id, package_id, patient_id, package_name, quantity, unit_price,
           package_short_description, package_description, prep_instructions,
           terms_text, no_refund_text, base_price_snapshot, discounted_price_snapshot,
           tax_applicable_snapshot, tax_name_snapshot, tax_rate_snapshot,
           tax_amount, fee_amount, line_total, preferred_date
         )
         VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9,
           $10, $11, $12, $13,
           $14, $15, $16,
           $17, $18, $19, $20
         )`,
        [
          order.rows[0].id,
          selected.id,
          patientId,
          selected.name,
          quantity,
          unitPrice,
          selected.short_description || null,
          selected.description || null,
          selected.prep_instructions || null,
          selected.terms_text || null,
          selected.no_refund_text || null,
          selected.base_price,
          selected.discounted_price || null,
          Boolean(selected.tax_applicable),
          selected.tax_name || null,
          taxRate,
          itemTax,
          itemFee,
          lineTotal,
          item.preferred_date || input.preferred_date || null,
        ]
      );
      await client.query(
        `UPDATE package_orders
         SET tax_amount = tax_amount + $1,
             fee_amount = fee_amount + $2
         WHERE id = $3`,
        [itemTax, itemFee, order.rows[0].id]
      );
    }

    const totalsResult = await client.query(
      'SELECT tax_amount, fee_amount FROM package_orders WHERE id = $1',
      [order.rows[0].id]
    );
    const tax = Number(totalsResult.rows[0].tax_amount || 0);
    const fee = Number(totalsResult.rows[0].fee_amount || 0);
    const total = Number((subtotal + tax + fee).toFixed(2));
    const updated = await client.query(
      `UPDATE package_orders
       SET subtotal = $1, tax_amount = $2, fee_amount = $3, total_amount = $4
       WHERE id = $5
       RETURNING *`,
      [subtotal, tax, fee, total, order.rows[0].id]
    );

    await client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, metadata)
       VALUES ('package_order.created', 'package_order', $1, $2)`,
      [order.rows[0].id, JSON.stringify({ item_count: input.items.length })]
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function quotePackageOrder(input: {
  preferred_date?: string;
  items: Array<{
    package_id: string;
    quantity?: number;
    preferred_date?: string;
  }>;
}) {
  let subtotal = 0;
  let tax = 0;
  let fee = 0;
  const quotedItems: any[] = [];

  for (const item of input.items) {
    const quantity = Math.max(1, Math.min(20, Number(item.quantity || 1)));
    const pkg = await query(
      `SELECT id, name, short_description, prep_instructions,
              base_price, discounted_price, is_active, publication_status,
              tax_applicable, tax_name, tax_rate, convenience_fee,
              purchase_status, purchase_enabled, terms_text, no_refund_text,
              effective_start, effective_end, preferred_date_required
       FROM packages WHERE id = $1`,
      [item.package_id]
    );
    const selected = pkg.rows[0];
    if (
      !selected ||
      !selected.is_active ||
      selected.publication_status !== 'published' ||
      !selected.purchase_enabled ||
      selected.purchase_status !== 'available'
    ) {
      const error = new Error('Selected package is unavailable') as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'PACKAGE_UNAVAILABLE';
      throw error;
    }
    const today = clinicNow().date;
    const starts = selected.effective_start ? String(selected.effective_start).slice(0, 10) : null;
    const ends = selected.effective_end ? String(selected.effective_end).slice(0, 10) : null;
    if ((starts && starts > today) || (ends && ends < today)) {
      const error = new Error('Selected package is not available for purchase today') as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'PACKAGE_WINDOW_CHANGED';
      throw error;
    }
    if (selected.preferred_date_required && !(item.preferred_date || input.preferred_date)) {
      const error = new Error('Preferred date is required for this package') as Error & { status?: number; code?: string };
      error.status = 400;
      error.code = 'PREFERRED_DATE_REQUIRED';
      throw error;
    }

    const unitPrice = Number(selected.discounted_price || selected.base_price);
    const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
    const taxRate = selected.tax_applicable ? Number(selected.tax_rate || 0) : 0;
    const itemTax = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
    const itemFee = Number((Number(selected.convenience_fee || 0) * quantity).toFixed(2));
    const lineTotal = Number((lineSubtotal + itemTax + itemFee).toFixed(2));

    subtotal += lineSubtotal;
    tax += itemTax;
    fee += itemFee;
    quotedItems.push({
      package_id: selected.id,
      package_name: selected.name,
      quantity,
      unit_price: unitPrice,
      base_price: Number(selected.base_price),
      discounted_price: selected.discounted_price === null ? null : Number(selected.discounted_price),
      tax_amount: itemTax,
      fee_amount: itemFee,
      line_total: lineTotal,
      prep_instructions: selected.prep_instructions || null,
      terms_text: selected.terms_text || null,
      no_refund_text: selected.no_refund_text || null,
      preferred_date_required: Boolean(selected.preferred_date_required),
    });
  }

  return {
    policy_version: 'package-policy-2026-07-07',
    currency: 'INR',
    item_limit: 20,
    items: quotedItems,
    subtotal: Number(subtotal.toFixed(2)),
    tax_total: Number(tax.toFixed(2)),
    fee_total: Number(fee.toFixed(2)),
    total: Number((subtotal + tax + fee).toFixed(2)),
  };
}

export async function listPackageCommerceCatalog() {
  return getPackageCommerceCatalog();
}

export async function createPayment(input: { order_id?: string; appointment_id?: string }) {
  if (input.order_id || input.appointment_id) {
    const existing = await query(
      `SELECT * FROM payments
       WHERE ${input.order_id ? 'order_id' : 'appointment_id'} = $1
         AND status IN ('created', 'pending', 'success', 'verification_required')
       ORDER BY created_at DESC
       LIMIT 1`,
      [input.order_id || input.appointment_id]
    );
    if (existing.rows[0]) return existing.rows[0];
  }

  const order = input.order_id
    ? await query('SELECT * FROM package_orders WHERE id = $1', [input.order_id])
    : { rows: [] };
  const appointment = input.appointment_id
    ? await query(
        `SELECT a.*, p.phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.id = $1`,
        [input.appointment_id]
      )
    : { rows: [] };
  const amount = Number(
    order.rows[0]?.total_amount || (appointment.rows[0] ? config.appointmentConsultationFee : 0)
  );
  if (!order.rows[0] && !appointment.rows[0]) throw new Error('Payment target not found');
  if (amount <= 0 && order.rows[0]) throw new Error('Order amount must be greater than zero');
  if (amount <= 0 && appointment.rows[0])
    throw new Error('Appointment amount must be greater than zero');

  const merchantTransactionId = orderNumber('SPP');
  const returnUrl = `${config.frontendUrl}/payment/confirmation?transaction=${merchantTransactionId}`;
  const amountPaisa = amountToPaisa(amount);
  const paymentPhone = '9172027838';

  const result = await query(
    `INSERT INTO payments
     (order_id, appointment_id, merchant_transaction_id, amount, amount_paisa, status, redirect_url, raw_response)
     VALUES ($1, $2, $3, $4, $5, 'created', $6, $7)
     RETURNING *`,
    [
      input.order_id || null,
      input.appointment_id || null,
      merchantTransactionId,
      amount,
      amountPaisa,
      config.phonePe.enabled ? returnUrl : `${returnUrl}&mock=1`,
      JSON.stringify({ mode: config.phonePe.enabled ? 'phonepe' : 'mock' }),
    ]
  );
  if (!config.phonePe.enabled) {
    return updatePaymentStatus(merchantTransactionId, 'success', {
      mode: 'mock',
      verified_at: new Date().toISOString(),
    });
  }

  try {
    const phonePeResponse = await initiatePhonePePayment({
      merchantOrderId: merchantTransactionId,
      amountPaisa,
      redirectUrl: returnUrl,
      phone: paymentPhone,
      metaInfo: {
        udf1: input.order_id || input.appointment_id || '',
        udf2: input.order_id ? 'package_order' : 'appointment',
      },
    });
    const updated = await query(
      `UPDATE payments
       SET status = 'pending',
           provider_order_id = $1,
           redirect_url = $2,
           expires_at = $3,
           raw_response = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        phonePeResponse.orderId,
        phonePeResponse.redirectUrl,
        phonePeResponse.expireAt ? new Date(phonePeResponse.expireAt) : null,
        JSON.stringify(redactPaymentPayload(phonePeResponse)),
        result.rows[0].id,
      ]
    );
    return updated.rows[0];
  } catch (err) {
    await query(
      `UPDATE payments
       SET status = 'verification_required',
           raw_response = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ error: (err as Error).message }), result.rows[0].id]
    );
    throw err;
  }
  return result.rows[0];
}

export async function createOrderPayment(orderId: string) {
  return createPayment({ order_id: orderId });
}

export async function createAppointmentPayment(holdId: string) {
  const appointment = await query(
    `SELECT id FROM appointments WHERE hold_id = $1 OR id = $1 LIMIT 1`,
    [holdId]
  );
  if (!appointment.rows[0]) {
    const error = new Error('Appointment not found for this hold') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }
  return createPayment({ appointment_id: appointment.rows[0].id });
}

export async function updatePaymentStatus(
  merchantTransactionId: string,
  status: string,
  payload: unknown = {},
  eventName = 'manual.status_update'
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT * FROM payments WHERE merchant_transaction_id = $1 FOR UPDATE`,
      [merchantTransactionId]
    );
    if (!current.rows[0]) throw new Error('Payment not found');

    const paymentRow = current.rows[0];
    const safePayload = redactPaymentPayload(payload);
    const payloadObject = (payload || {}) as any;
    const paymentDetail = extractPhonePePaymentDetail(payloadObject.payload || payloadObject);
    const providerOrderId =
      payloadObject.payload?.orderId ||
      payloadObject.orderId ||
      paymentRow.provider_order_id ||
      null;
    const providerTransactionId =
      paymentDetail.transactionId || payloadObject.transactionId || null;
    const paymentMethod = paymentDetail.paymentMode || paymentRow.payment_method || null;
    const incomingPaisa = payloadObject.payload?.amount || payloadObject.amount;
    const expectedPaisa = Number(
      paymentRow.amount_paisa || amountToPaisa(Number(paymentRow.amount))
    );
    const nextStatus =
      status === 'success' && incomingPaisa && Number(incomingPaisa) !== expectedPaisa
        ? 'verification_required'
        : status;
    const shouldApplyStatus = !(paymentRow.status === 'success' && nextStatus !== 'success');
    const appliedStatus = shouldApplyStatus ? nextStatus : paymentRow.status;

    const payment = await client.query(
      `UPDATE payments
       SET status = $1,
           provider_order_id = COALESCE($2, provider_order_id),
           provider_reference = COALESCE($3, provider_reference),
           payment_method = COALESCE($4, payment_method),
           raw_response = $5,
           verified_at = CASE WHEN $1 = 'success' THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
           failed_at = CASE WHEN $1 IN ('failed', 'expired') THEN COALESCE(failed_at, NOW()) ELSE failed_at END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        appliedStatus,
        providerOrderId,
        providerTransactionId,
        paymentMethod,
        JSON.stringify(safePayload),
        paymentRow.id,
      ]
    );

    await client.query(
      `INSERT INTO payment_attempts (payment_id, status, raw_payload) VALUES ($1, $2, $3)`,
      [payment.rows[0].id, nextStatus, JSON.stringify(safePayload)]
    );
    await client.query(
      `INSERT INTO payment_webhook_events
       (payment_id, event_name, merchant_order_id, provider_order_id, provider_transaction_id, status, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        payment.rows[0].id,
        eventName,
        merchantTransactionId,
        providerOrderId,
        providerTransactionId,
        nextStatus,
        JSON.stringify(safePayload),
      ]
    );

    if (paymentRow.status !== 'success' && appliedStatus === 'success') {
      if (payment.rows[0].order_id) {
        await client.query(
          `UPDATE package_orders SET status = 'paid', updated_at = NOW() WHERE id = $1`,
          [payment.rows[0].order_id]
        );
      }
      if (payment.rows[0].appointment_id) {
        await client.query(
          `UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
          [payment.rows[0].appointment_id]
        );
      }
      const receiptNumber = await nextReceiptNumber(client);
      await client.query(
        `INSERT INTO receipts (payment_id, receipt_number, pdf_url, object_storage_key, checksum, receipt_payload)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (payment_id) DO NOTHING`,
        [
          payment.rows[0].id,
          receiptNumber,
          `/api/payments/${payment.rows[0].merchant_transaction_id}/receipt`,
          `receipts/${receiptNumber}.pdf`,
          crypto
            .createHash('sha256')
            .update(`${payment.rows[0].id}:${receiptNumber}`)
            .digest('hex'),
          JSON.stringify({
            receipt_number: receiptNumber,
            amount: payment.rows[0].amount,
            amount_paisa: payment.rows[0].amount_paisa,
            payment_mode: paymentMethod || 'PhonePe',
            merchant_order_id: merchantTransactionId,
            provider_order_id: providerOrderId,
            provider_transaction_id: providerTransactionId,
            generated_at: new Date().toISOString(),
          }),
        ]
      );
      await queueReceiptEmailForPayment(client, payment.rows[0].id);
    }

    if (paymentRow.status !== 'success' && appliedStatus === 'failed') {
      if (payment.rows[0].order_id) {
        await client.query(
          `UPDATE package_orders SET status = 'payment_failed', updated_at = NOW() WHERE id = $1`,
          [payment.rows[0].order_id]
        );
      }
      if (payment.rows[0].appointment_id) {
        await client.query(
          `UPDATE appointments SET status = 'payment_failed', updated_at = NOW() WHERE id = $1`,
          [payment.rows[0].appointment_id]
        );
      }
    }

    await client.query('COMMIT');
    return payment.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function refreshPaymentFromProvider(payment: any) {
  if (!config.phonePe.enabled || !payment) return payment;
  if (isTerminalPaymentStatus(payment.status) && payment.status !== 'verification_required')
    return payment;
  const updatedAt = parseDate(payment.updated_at);
  if (updatedAt && Date.now() - updatedAt.getTime() < 60_000) return payment;

  const providerStatus = await getPhonePeOrderStatus(payment.merchant_transaction_id);
  const nextStatus = normalizePhonePeState(providerStatus.state);
  return updatePaymentStatus(
    payment.merchant_transaction_id,
    nextStatus,
    providerStatus,
    'phonepe.status_api'
  );
}

export async function getPaymentStatus(merchantTransactionId: string) {
  const result = await query(
    `SELECT p.*, r.id AS receipt_id, r.receipt_number, r.pdf_url,
            latest_notification.status AS notification_status,
            latest_notification.error AS notification_error
     FROM payments p
     LEFT JOIN receipts r ON r.payment_id = p.id
     LEFT JOIN LATERAL (
       SELECT status, error
       FROM notification_outbox no
       WHERE no.payment_id = p.id
       ORDER BY no.created_at DESC
       LIMIT 1
     ) latest_notification ON true
     WHERE p.merchant_transaction_id = $1`,
    [merchantTransactionId]
  );
  const payment = result.rows[0] || null;
  if (!payment) return null;
  const refreshed = await refreshPaymentFromProvider(payment);
  if (refreshed?.id !== payment.id || refreshed?.status === payment.status) return payment;
  const refreshedResult = await query(
    `SELECT p.*, r.id AS receipt_id, r.receipt_number, r.pdf_url,
            latest_notification.status AS notification_status,
            latest_notification.error AS notification_error
     FROM payments p
     LEFT JOIN receipts r ON r.payment_id = p.id
     LEFT JOIN LATERAL (
       SELECT status, error
       FROM notification_outbox no
       WHERE no.payment_id = p.id
       ORDER BY no.created_at DESC
       LIMIT 1
     ) latest_notification ON true
     WHERE p.merchant_transaction_id = $1`,
    [merchantTransactionId]
  );
  return refreshedResult.rows[0] || refreshed;
}

function maskPhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function toNumber(value: unknown): number {
  return Number(value || 0);
}

export async function getAdminDashboard(options: { doctorId?: string } = {}) {
  const values = options.doctorId ? [options.doctorId] : [];
  const doctorAppointmentFilter = options.doctorId ? 'AND a.doctor_id = $1' : '';
  const doctorHoldFilter = options.doctorId ? 'AND ah.doctor_id = $1' : '';
  const doctorPaymentJoin = options.doctorId ? 'LEFT JOIN appointments ap_scope ON ap_scope.id = p.appointment_id' : '';
  const doctorPaymentFilter = options.doctorId ? 'AND ap_scope.doctor_id = $1' : '';
  const doctorNotificationJoin = options.doctorId ? 'LEFT JOIN appointments an_scope ON an_scope.id = no.appointment_id' : '';
  const doctorNotificationFilter = options.doctorId ? 'AND an_scope.doctor_id = $1' : '';

  const [context, metrics, todayAppointments, paymentIssues, notificationFailures] = await Promise.all([
    query(
      `SELECT
         (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS clinic_date,
         NOW() AS generated_at`
    ),
    query(
      `WITH clinic AS (
         SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS clinic_date
       )
       SELECT
         (SELECT COUNT(*) FROM appointments a, clinic c
          WHERE a.appointment_date = c.clinic_date ${doctorAppointmentFilter}) AS appointments_today,
         (SELECT COUNT(*) FROM appointments a, clinic c
          WHERE a.appointment_date = c.clinic_date AND a.status = 'confirmed' ${doctorAppointmentFilter}) AS confirmed_appointments,
         (SELECT COUNT(*) FROM appointments a, clinic c
          WHERE a.appointment_date = c.clinic_date AND a.status IN ('awaiting_payment', 'payment_pending') ${doctorAppointmentFilter}) AS awaiting_payment,
         (SELECT COUNT(*) FROM appointments a, clinic c
          WHERE a.appointment_date = c.clinic_date AND a.status = 'checked_in' ${doctorAppointmentFilter}) AS checked_in,
         (SELECT COUNT(*) FROM appointments a, clinic c
          WHERE a.appointment_date = c.clinic_date AND a.status = 'completed' ${doctorAppointmentFilter}) AS completed,
         (SELECT COUNT(*) FROM package_orders po, clinic c
          WHERE ${options.doctorId ? 'false' : "(po.created_at AT TIME ZONE 'Asia/Kolkata')::date = c.clinic_date"}) AS orders_today,
         (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
          ${doctorPaymentJoin}, clinic c
          WHERE p.status = 'success'
            AND (p.created_at AT TIME ZONE 'Asia/Kolkata')::date = c.clinic_date
            ${doctorPaymentFilter}) AS collections_today,
         (SELECT COUNT(*) FROM payments p
          ${doctorPaymentJoin}, clinic c
          WHERE p.status IN ('failed', 'verification_required', 'pending')
            AND (p.created_at AT TIME ZONE 'Asia/Kolkata')::date >= c.clinic_date - INTERVAL '7 days'
            ${doctorPaymentFilter}) AS payment_issues,
         (SELECT COUNT(*) FROM notification_outbox no
          ${doctorNotificationJoin}
          WHERE no.status IN ('failed', 'retrying', 'skipped_no_destination')
            ${doctorNotificationFilter}) AS notification_failures,
         (SELECT COUNT(*) FROM appointment_holds ah
          WHERE ah.status = 'active' AND ah.expires_at < NOW() ${doctorHoldFilter}) AS expired_holds`,
      values
    ),
    query(
      `WITH clinic AS (
         SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS clinic_date
       )
       SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
              a.status, a.payment_status, a.amount_snapshot,
              p.full_name AS patient_name, p.phone, d.name AS doctor_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN clinic c ON a.appointment_date = c.clinic_date
       WHERE true ${doctorAppointmentFilter}
       ORDER BY a.start_time ASC
       LIMIT 8`,
      values
    ),
    query(
      `SELECT p.id, p.merchant_transaction_id, p.amount, p.status, p.created_at, p.updated_at,
              po.order_number, a.appointment_number, patient.full_name AS patient_name, patient.phone
       FROM payments p
       LEFT JOIN package_orders po ON po.id = p.order_id
       LEFT JOIN appointments a ON a.id = p.appointment_id
       LEFT JOIN patients patient ON patient.id = a.patient_id
       ${doctorPaymentJoin}
       WHERE p.status IN ('failed', 'verification_required', 'pending')
         ${doctorPaymentFilter}
       ORDER BY p.updated_at DESC
       LIMIT 5`,
      values
    ),
    query(
      `SELECT no.id, no.channel, no.template, no.destination, no.status, no.error,
              no.attempt_count, no.created_at, r.receipt_number, po.order_number, a.appointment_number
       FROM notification_outbox no
       LEFT JOIN receipts r ON r.payment_id = no.payment_id
       LEFT JOIN package_orders po ON po.id = no.order_id
       LEFT JOIN appointments a ON a.id = no.appointment_id
       ${doctorNotificationJoin}
       WHERE no.status IN ('failed', 'retrying', 'skipped_no_destination')
         ${doctorNotificationFilter}
       ORDER BY no.created_at DESC
       LIMIT 5`,
      values
    ),
  ]);

  const metricRow = metrics.rows[0] || {};
  const actionItems = [
    {
      id: 'awaiting-payment',
      label: 'Appointments awaiting payment',
      count: toNumber(metricRow.awaiting_payment),
      href: '/admin/appointments',
      priority: toNumber(metricRow.awaiting_payment) > 0 ? 'high' : 'normal',
    },
    {
      id: 'payment-issues',
      label: 'Payment issues',
      count: toNumber(metricRow.payment_issues),
      href: '/admin/payments',
      priority: toNumber(metricRow.payment_issues) > 0 ? 'high' : 'normal',
    },
    {
      id: 'notification-failures',
      label: 'Notification failures',
      count: toNumber(metricRow.notification_failures),
      href: '/admin/notifications',
      priority: toNumber(metricRow.notification_failures) > 0 ? 'medium' : 'normal',
    },
    {
      id: 'expired-holds',
      label: 'Expired active holds',
      count: toNumber(metricRow.expired_holds),
      href: '/admin/calendar',
      priority: toNumber(metricRow.expired_holds) > 0 ? 'medium' : 'normal',
    },
  ];

  return {
    clinicDate: formatClinicDate(context.rows[0]?.clinic_date),
    generatedAt: context.rows[0]?.generated_at,
    timezone: 'Asia/Kolkata',
    metrics: {
      appointmentsToday: toNumber(metricRow.appointments_today),
      confirmedAppointments: toNumber(metricRow.confirmed_appointments),
      awaitingPayment: toNumber(metricRow.awaiting_payment),
      checkedIn: toNumber(metricRow.checked_in),
      completed: toNumber(metricRow.completed),
      packagePurchases: toNumber(metricRow.orders_today),
      collectionsToday: toNumber(metricRow.collections_today),
      paymentIssues: toNumber(metricRow.payment_issues),
      notificationFailures: toNumber(metricRow.notification_failures),
      expiredHolds: toNumber(metricRow.expired_holds),
    },
    actionItems,
    todayAppointments: todayAppointments.rows.map((row) => ({
      ...row,
      phone_masked: maskPhone(row.phone),
      phone: undefined,
    })),
    paymentIssues: paymentIssues.rows.map((row) => ({
      ...row,
      phone_masked: row.phone ? maskPhone(row.phone) : null,
      phone: undefined,
    })),
    notificationFailures: notificationFailures.rows.map((row) => ({
      ...row,
      destination_masked: row.destination ? maskPhone(row.destination) : null,
      destination: undefined,
    })),
    warnings: [
      ...(toNumber(metricRow.expired_holds) > 0
        ? ['Some active holds are already expired and may need cleanup.']
        : []),
    ],
  };
}

type AppointmentFilters = {
  doctorId?: string;
  status?: string;
  source?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
};

function appointmentAllowedActions(status: string): string[] {
  const transitions: Record<string, string[]> = {
    awaiting_payment: ['confirmed', 'cancelled'],
    payment_pending: ['confirmed', 'payment_failed', 'cancelled'],
    confirmed: ['checked_in', 'completed', 'no_show', 'cancelled'],
    checked_in: ['completed', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
    payment_failed: ['cancelled'],
  };
  return transitions[status] || [];
}

function appointmentOrderBy(sort?: string): string {
  switch (sort) {
    case 'date_asc':
      return 'a.appointment_date ASC, a.start_time ASC';
    case 'created_desc':
      return 'a.created_at DESC';
    case 'created_asc':
      return 'a.created_at ASC';
    case 'date_desc':
    default:
      return 'a.appointment_date DESC, a.start_time DESC';
  }
}

function buildAppointmentFilterSql(filters: AppointmentFilters = {}) {
  const values: any[] = [];
  const conditions: string[] = [];
  if (filters.doctorId) {
    values.push(filters.doctorId);
    conditions.push(`a.doctor_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`a.status = $${values.length}`);
  }
  if (filters.source) {
    values.push(filters.source);
    conditions.push(`a.source = $${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`a.appointment_date >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`a.appointment_date <= $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(
      `(p.full_name ILIKE $${values.length}
        OR p.phone ILIKE $${values.length}
        OR d.name ILIKE $${values.length}
        OR a.appointment_number ILIKE $${values.length})`
    );
  }
  return {
    values,
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

function decorateAppointmentRows(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    allowed_actions: appointmentAllowedActions(row.status),
    phone_masked: maskPhone(row.phone),
  }));
}

export async function listAppointments(filters: AppointmentFilters = {}) {
  const { values, where } = buildAppointmentFilterSql(filters);
  const result = await query(
    `SELECT a.*, p.full_name AS patient_name, p.phone, d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     ${where}
     ORDER BY ${appointmentOrderBy(filters.sort)}
     LIMIT 100`,
    values
  );
  return decorateAppointmentRows(result.rows);
}

export async function listAppointmentsPage(
  filters: AppointmentFilters & { page?: number; pageSize?: number } = {}
) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize || 25)));
  const offset = (page - 1) * pageSize;
  const { values, where } = buildAppointmentFilterSql(filters);

  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     ${where}`,
    values
  );
  const total = Number(countResult.rows[0]?.total || 0);
  const result = await query(
    `SELECT a.*, p.full_name AS patient_name, p.phone, d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     ${where}
     ORDER BY ${appointmentOrderBy(filters.sort)}
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, pageSize, offset]
  );

  return {
    data: decorateAppointmentRows(result.rows),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    filters: {
      doctor_id: filters.doctorId || '',
      status: filters.status || '',
      source: filters.source || '',
      from: filters.from || '',
      to: filters.to || '',
      search: filters.search || '',
      sort: filters.sort || 'date_desc',
    },
  };
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatClinicDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function formatClinicMoney(value: unknown): string {
  const amount = Number(value || 0);
  return amount.toFixed(2);
}

export function maskSensitiveId(value: unknown): string {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return '****';
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function csvLine(values: unknown[]): string {
  return values.map(csvCell).join(',');
}

export async function exportAppointmentsCsv(
  filters: AppointmentFilters = {}
): Promise<string> {
  const rows = await listAppointments(filters);
  const header = [
    'Appointment Date',
    'Start Time',
    'Patient',
    'Phone',
    'Doctor',
    'Status',
    'Source',
    'Created At',
  ];
  const body = rows.map((row) =>
    csvLine([
      formatClinicDate(row.appointment_date),
      String(row.start_time || '').slice(0, 5),
      row.patient_name,
      row.phone,
      row.doctor_name,
      row.status,
      row.source,
      row.created_at ? new Date(row.created_at).toISOString() : '',
    ])
  );
  return [csvLine(header), ...body].join('\n');
}

export async function listAvailabilityRules(doctorId?: string) {
  const result = await query(
    `SELECT ar.*, d.name AS doctor_name
     FROM doctor_availability_rules ar
     JOIN doctors d ON d.id = ar.doctor_id
     ${doctorId ? 'WHERE ar.doctor_id = $1' : ''}
     ORDER BY ar.weekday ASC, ar.start_time ASC`,
    doctorId ? [doctorId] : []
  );
  return result.rows;
}

export async function createAvailabilityRule(input: {
  doctor_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes?: number;
  effective_from?: string;
  effective_until?: string;
  is_active?: boolean;
}) {
  const result = await query(
    `INSERT INTO doctor_availability_rules
     (doctor_id, weekday, start_time, end_time, slot_minutes, effective_from, effective_until, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.doctor_id,
      input.weekday,
      input.start_time,
      input.end_time,
      input.slot_minutes || defaultAppointmentConfig.default_slot_minutes,
      input.effective_from || new Date().toISOString().slice(0, 10),
      input.effective_until || null,
      input.is_active ?? true,
    ]
  );
  return result.rows[0];
}

export async function listCalendarOverrides(
  filters: { doctorId?: string; from?: string; to?: string } = {}
) {
  const values: any[] = [];
  const conditions: string[] = [];
  if (filters.doctorId) {
    values.push(filters.doctorId);
    conditions.push(`ce.doctor_id = $${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`ce.exception_date >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`ce.exception_date <= $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT ce.*, d.name AS doctor_name
     FROM calendar_exceptions ce
     LEFT JOIN doctors d ON d.id = ce.doctor_id
     ${where}
     ORDER BY ce.exception_date DESC, ce.start_time ASC NULLS FIRST
     LIMIT 200`,
    values
  );
  return result.rows;
}

function summarizeAvailability(slots: Slot[]) {
  return {
    total: slots.length,
    available: slots.filter((slot) => slot.available).length,
    blocked: slots.filter((slot) => !slot.available).length,
  };
}

function effectiveCalendarStatus(input: {
  date: string;
  slots: Slot[];
  overrides: any[];
  appointmentCount: number;
}) {
  const weekday = new Date(`${input.date}T00:00:00`).getDay();
  const hasWholeDayBlock = input.overrides.some((item) => item.override_type === 'unavailable_whole_day');
  const hasCustomHours = input.overrides.some((item) => ['custom_hours', 'add_extra_hours'].includes(item.override_type));
  const hasPartialBlock = input.overrides.some((item) => item.override_type === 'block_time_range');
  const summary = summarizeAvailability(input.slots);

  if (hasWholeDayBlock) return 'unavailable';
  if (weekday === 0 && !hasCustomHours) return 'sunday_closed';
  if (summary.total === 0) return 'no_hours';
  if (summary.available === 0) return 'full';
  if (hasPartialBlock || summary.blocked > 0) return 'partial';
  if (input.appointmentCount > 0) return 'booked';
  return 'available';
}

export async function getAdminCalendarView(input: {
  doctorId: string;
  from: string;
  to: string;
}) {
  const dates = datesBetween(input.from, input.to);
  const [settings, availability, rules, overrides, appointments] = await Promise.all([
    getAppointmentConfig(),
    listDoctorAvailability(input.doctorId, input.from, input.to),
    listAvailabilityRules(input.doctorId),
    listCalendarOverrides({ doctorId: input.doctorId, from: input.from, to: input.to }),
    listAppointments({ doctorId: input.doctorId, from: input.from, to: input.to }),
  ]);

  const appointmentsByDate = appointments.reduce<Record<string, any[]>>((map, item) => {
    const key = formatClinicDate(item.appointment_date);
    if (!map[key]) map[key] = [];
    map[key].push({
      id: item.id,
      appointment_number: item.appointment_number,
      appointment_date: key,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      payment_status: item.payment_status,
      patient_name: item.patient_name,
      phone_masked: maskPhone(item.phone),
      doctor_name: item.doctor_name,
    });
    return map;
  }, {});

  const overridesByDate = overrides.reduce<Record<string, any[]>>((map, item) => {
    const key = formatClinicDate(item.exception_date);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});

  const days = dates.map((date) => {
    const slots = availability[date] || [];
    const dayOverrides = overridesByDate[date] || [];
    const dayAppointments = appointmentsByDate[date] || [];
    return {
      date,
      status: effectiveCalendarStatus({
        date,
        slots,
        overrides: dayOverrides,
        appointmentCount: dayAppointments.length,
      }),
      slotSummary: summarizeAvailability(slots),
      appointmentCount: dayAppointments.length,
      overrideCount: dayOverrides.length,
      slots,
      appointments: dayAppointments,
      overrides: dayOverrides,
    };
  });

  return {
    doctorId: input.doctorId,
    from: input.from,
    to: input.to,
    generatedAt: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    settings,
    warnings: appointmentConfigWarnings(settings),
    rules,
    overrides,
    appointments,
    availability,
    days,
  };
}

export async function createCalendarOverride(input: {
  doctor_id?: string;
  exception_date: string;
  override_type: 'unavailable_whole_day' | 'custom_hours' | 'block_time_range' | 'add_extra_hours';
  start_time?: string;
  end_time?: string;
  reason?: string;
  public_note?: string;
  internal_note?: string;
}) {
  const available =
    input.override_type === 'custom_hours' || input.override_type === 'add_extra_hours';
  const result = await query(
    `INSERT INTO calendar_exceptions
     (doctor_id, exception_date, override_type, start_time, end_time, reason, public_note, internal_note, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.doctor_id || null,
      input.exception_date,
      input.override_type,
      input.override_type === 'unavailable_whole_day' ? null : input.start_time || null,
      input.override_type === 'unavailable_whole_day' ? null : input.end_time || null,
      input.reason || null,
      input.public_note || null,
      input.internal_note || null,
      available,
    ]
  );
  return result.rows[0];
}

export async function createCalendarOverridesBatch(input: {
  doctor_id: string;
  dates: string[];
  override_type: 'unavailable_whole_day' | 'custom_hours' | 'block_time_range' | 'add_extra_hours';
  start_time?: string;
  end_time?: string;
  reason?: string;
  public_note?: string;
  internal_note?: string;
  allow_conflicts?: boolean;
  actor_staff_id?: string;
}) {
  const uniqueDates = Array.from(new Set(input.dates)).sort();
  if (uniqueDates.length === 0) {
    const error = new Error('At least one date is required') as Error & { status?: number; code?: string };
    error.status = 400;
    error.code = 'DATES_REQUIRED';
    throw error;
  }
  if (uniqueDates.length > 31) {
    const error = new Error('Batch calendar changes cannot exceed 31 dates') as Error & { status?: number; code?: string };
    error.status = 400;
    error.code = 'DATE_RANGE_TOO_LARGE';
    throw error;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`calendar:${input.doctor_id}`]);

    const conflictResult = await client.query(
      `SELECT appointment_date, COUNT(*)::int AS appointment_count
       FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = ANY($2::date[])
         AND status IN ('awaiting_payment', 'payment_pending', 'confirmed', 'checked_in')
       GROUP BY appointment_date
       ORDER BY appointment_date ASC`,
      [input.doctor_id, uniqueDates]
    );
    const conflicted = conflictResult.rows.map((row) => ({
      date: formatClinicDate(row.appointment_date),
      appointment_count: Number(row.appointment_count || 0),
    }));

    if (conflicted.length > 0 && input.override_type === 'unavailable_whole_day' && !input.allow_conflicts) {
      await client.query('ROLLBACK');
      return {
        created: [],
        skipped: [],
        conflicted,
        requiresConfirmation: true,
      };
    }

    const available =
      input.override_type === 'custom_hours' || input.override_type === 'add_extra_hours';
    const created: any[] = [];
    const skipped: any[] = [];

    for (const date of uniqueDates) {
      const weekday = new Date(`${date}T00:00:00`).getDay();
      if (weekday === 0 && input.override_type === 'unavailable_whole_day') {
        skipped.push({ date, reason: 'Sunday is already closed' });
        continue;
      }

      const result = await client.query(
        `INSERT INTO calendar_exceptions
         (doctor_id, exception_date, override_type, start_time, end_time, reason, public_note, internal_note, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.doctor_id,
          date,
          input.override_type,
          input.override_type === 'unavailable_whole_day' ? null : input.start_time || null,
          input.override_type === 'unavailable_whole_day' ? null : input.end_time || null,
          input.reason || null,
          input.public_note || null,
          input.internal_note || null,
          available,
        ]
      );
      created.push(result.rows[0]);
    }

    await client.query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'calendar.batch_override_created', 'calendar_exception', $2, $3)`,
      [
        input.actor_staff_id || null,
        input.doctor_id,
        JSON.stringify({
          doctor_id: input.doctor_id,
          dates: uniqueDates,
          override_type: input.override_type,
          created: created.length,
          skipped,
          conflicted,
        }),
      ]
    );

    await client.query('COMMIT');
    return {
      created,
      skipped,
      conflicted,
      requiresConfirmation: false,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteCalendarOverride(id: string) {
  const result = await query('DELETE FROM calendar_exceptions WHERE id = $1 RETURNING *', [id]);
  if (!result.rows[0]) {
    const error = new Error('Calendar override not found') as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' | 'payment_failed';
  actorStaffId?: string;
}) {
  const current = await query('SELECT status FROM appointments WHERE id = $1', [input.appointmentId]);
  if (!current.rows[0]) {
    const error = new Error('Appointment not found') as Error & { status?: number; code?: string };
    error.status = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }
  if (!appointmentAllowedActions(current.rows[0].status).includes(input.status)) {
    const error = new Error('This appointment status change is not allowed') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 409;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
  const timestampColumn = {
    checked_in: 'checked_in_at',
    completed: 'completed_at',
    cancelled: 'cancelled_at',
    no_show: 'no_show_at',
    confirmed: null,
    payment_failed: null,
  }[input.status];
  const result = await query(
    `UPDATE appointments
     SET status = $1,
         updated_at = NOW()
         ${timestampColumn ? `, ${timestampColumn} = NOW()` : ''}
     WHERE id = $2
     RETURNING *`,
    [input.status, input.appointmentId]
  );
  if (!result.rows[0]) throw new Error('Appointment not found');
  await query(
    `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'appointment.status_updated', 'appointment', $2, $3)`,
    [input.actorStaffId || null, input.appointmentId, JSON.stringify({ status: input.status })]
  );
  return result.rows[0];
}

export async function listPackageOrders() {
  const result = await query(
    `SELECT po.*, COUNT(poi.id) AS item_count
     FROM package_orders po
     LEFT JOIN package_order_items poi ON poi.order_id = po.id
     GROUP BY po.id
     ORDER BY po.created_at DESC
     LIMIT 100`
  );
  return result.rows;
}

type PaymentFilters = {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  provider?: string;
  entity?: 'appointment' | 'package_order';
  sort?: 'date_desc' | 'date_asc' | 'updated_desc' | 'updated_asc' | 'amount_desc' | 'amount_asc';
  page?: number;
  pageSize?: number;
};

function buildPaymentFilters(filters: PaymentFilters = {}) {
  const values: any[] = [];
  const conditions: string[] = [];
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`p.status = $${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`p.created_at::date >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`p.created_at::date <= $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(p.merchant_transaction_id ILIKE $${values.length}
        OR p.provider_reference ILIKE $${values.length}
        OR p.provider_order_id ILIKE $${values.length}
        OR po.order_number ILIKE $${values.length}
        OR a.appointment_number ILIKE $${values.length})`
    );
  }
  if (filters.provider) {
    values.push(filters.provider);
    conditions.push(`p.provider = $${values.length}`);
  }
  if (filters.entity === 'appointment') {
    conditions.push('p.appointment_id IS NOT NULL');
  }
  if (filters.entity === 'package_order') {
    conditions.push('p.order_id IS NOT NULL');
  }
  return {
    values,
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

function paymentOrderBy(sort: PaymentFilters['sort']) {
  switch (sort) {
    case 'date_asc':
      return 'p.created_at ASC, p.id ASC';
    case 'updated_desc':
      return 'p.updated_at DESC, p.id DESC';
    case 'updated_asc':
      return 'p.updated_at ASC, p.id ASC';
    case 'amount_desc':
      return 'p.amount DESC, p.created_at DESC';
    case 'amount_asc':
      return 'p.amount ASC, p.created_at DESC';
    case 'date_desc':
    default:
      return 'p.created_at DESC, p.id DESC';
  }
}

export async function listPayments(filters: PaymentFilters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize || 25)));
  const offset = (page - 1) * pageSize;
  const { values, where } = buildPaymentFilters(filters);
  const countValues = [...values];
  const summaryValues = [...values];
  const pageValues = [...values, pageSize, offset];
  const [result, countResult, summaryResult] = await Promise.all([
    query(
      `SELECT p.id, p.order_id, p.appointment_id, p.provider, p.merchant_transaction_id,
              p.amount, p.status, p.payment_method, p.provider_reference, p.provider_order_id,
              p.created_at, p.updated_at, p.verified_at, p.failed_at, p.expires_at,
              po.order_number, a.appointment_number,
              r.id AS receipt_id, r.receipt_number, r.pdf_url,
            latest_notification.status AS notification_status,
            latest_notification.error AS notification_error
     FROM payments p
     LEFT JOIN package_orders po ON po.id = p.order_id
     LEFT JOIN appointments a ON a.id = p.appointment_id
     LEFT JOIN receipts r ON r.payment_id = p.id
     LEFT JOIN LATERAL (
       SELECT status, error
       FROM notification_outbox no
       WHERE no.payment_id = p.id
       ORDER BY no.created_at DESC
       LIMIT 1
     ) latest_notification ON true
     ${where}
     ORDER BY ${paymentOrderBy(filters.sort)}
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM payments p
       LEFT JOIN package_orders po ON po.id = p.order_id
       LEFT JOIN appointments a ON a.id = p.appointment_id
       ${where}`,
      countValues
    ),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE p.status = 'success')::int AS success,
         COUNT(*) FILTER (WHERE p.status IN ('created', 'pending', 'verification_required'))::int AS pending,
         COUNT(*) FILTER (WHERE p.status IN ('failed', 'expired', 'disputed'))::int AS issues,
         COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS success_amount
       FROM payments p
       LEFT JOIN package_orders po ON po.id = p.order_id
       LEFT JOIN appointments a ON a.id = p.appointment_id
       ${where}`,
      summaryValues
    ),
  ]);
  const total = Number(countResult.rows[0]?.total || 0);
  return {
    payments: result.rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    summary: summaryResult.rows[0] || {
      total: 0,
      success: 0,
      pending: 0,
      issues: 0,
      success_amount: 0,
    },
  };
}

export async function exportPaymentsCsv(
  filters: PaymentFilters = {}
): Promise<string> {
  const rows: any[] = [];
  let page = 1;
  for (;;) {
    const result = await listPayments({ ...filters, page, pageSize: 50 });
    rows.push(...result.payments);
    if (page >= result.pagination.totalPages) break;
    page += 1;
  }
  const header = [
    'Payment Date',
    'Transaction',
    'Order',
    'Appointment',
    'Amount',
    'Status',
    'Method',
    'Receipt',
    'Provider Reference',
    'Updated At',
  ];
  const body = rows.map((row) =>
    csvLine([
      formatClinicDate(row.created_at),
      maskSensitiveId(row.merchant_transaction_id),
      row.order_number || '',
      row.appointment_id ? maskSensitiveId(row.appointment_id) : '',
      formatClinicMoney(row.amount),
      row.status,
      row.payment_method || '',
      row.receipt_number || '',
      maskSensitiveId(row.provider_reference),
      row.updated_at ? new Date(row.updated_at).toISOString() : '',
    ])
  );
  return [csvLine(header), ...body].join('\n');
}

export async function getAdminPaymentDetail(paymentId: string) {
  const paymentResult = await query(
    `SELECT p.id, p.order_id, p.appointment_id, p.provider, p.merchant_transaction_id,
            p.amount, p.status, p.payment_method, p.provider_reference, p.provider_order_id,
            p.created_at, p.updated_at, p.verified_at, p.failed_at, p.expires_at,
            po.order_number, po.status AS order_status,
            a.appointment_number, a.status AS appointment_status,
            r.id AS receipt_id, r.receipt_number, r.pdf_url, r.issued_at, r.voided_at,
            latest_notification.status AS notification_status,
            latest_notification.error AS notification_error
     FROM payments p
     LEFT JOIN package_orders po ON po.id = p.order_id
     LEFT JOIN appointments a ON a.id = p.appointment_id
     LEFT JOIN receipts r ON r.payment_id = p.id
     LEFT JOIN LATERAL (
       SELECT status, error
       FROM notification_outbox no
       WHERE no.payment_id = p.id
       ORDER BY no.created_at DESC
       LIMIT 1
     ) latest_notification ON true
     WHERE p.id = $1`,
    [paymentId]
  );
  const payment = paymentResult.rows[0] || null;
  if (!payment) return null;

  const [webhooks, attempts, notifications, audits] = await Promise.all([
    query(
      `SELECT id, 'provider_event' AS type, event_name, provider, status,
              merchant_order_id, provider_order_id, provider_transaction_id, created_at
       FROM payment_webhook_events
       WHERE payment_id = $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [paymentId]
    ),
    query(
      `SELECT id, 'status_attempt' AS type, status, created_at
       FROM payment_attempts
       WHERE payment_id = $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [paymentId]
    ),
    query(
      `SELECT id, 'notification' AS type, channel, template, status, attempt_count,
              sent_at, error, created_at
       FROM notification_outbox
       WHERE payment_id = $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [paymentId]
    ),
    query(
      `SELECT id, 'audit' AS type, action, metadata, created_at
       FROM audit_log
       WHERE entity_type = 'payment' AND entity_id = $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [paymentId]
    ),
  ]);

  const receiptEvents = payment.receipt_id
    ? [
        {
          id: payment.receipt_id,
          type: 'receipt',
          status: payment.voided_at ? 'voided' : 'issued',
          receipt_number: payment.receipt_number,
          created_at: payment.issued_at || payment.updated_at,
        },
      ]
    : [];

  const events = [
    ...webhooks.rows,
    ...attempts.rows,
    ...notifications.rows,
    ...audits.rows.map((event) => ({
      id: event.id,
      type: event.type,
      action: event.action,
      status: event.metadata?.status || event.metadata?.result_status || '',
      created_at: event.created_at,
    })),
    ...receiptEvents,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { payment, events };
}

export async function recheckAdminPayment(paymentId: string, actorStaffId?: string) {
  const current = await query(
    `SELECT * FROM payments WHERE id = $1`,
    [paymentId]
  );
  const payment = current.rows[0] || null;
  if (!payment) return null;

  const beforeStatus = payment.status;
  const refreshed = await refreshPaymentFromProvider(payment);
  await query(
    `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'payment.provider_recheck', 'payment', $2, $3)`,
    [
      actorStaffId || null,
      paymentId,
      JSON.stringify({
        before_status: beforeStatus,
        result_status: refreshed?.status || beforeStatus,
        provider: payment.provider,
        transaction: maskSensitiveId(payment.merchant_transaction_id),
      }),
    ]
  );
  return getAdminPaymentDetail(paymentId);
}
