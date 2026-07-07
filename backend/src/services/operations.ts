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
       (patient_id, doctor_id, hold_id, appointment_date, start_time, end_time, slot_minutes, status, source, reception_notes, created_by_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        patientId,
        input.doctor_id,
        input.hold_id || null,
        input.appointment_date,
        input.start_time,
        endTime,
        slotMinutes,
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
  const purchaserPhone = order.rows[0]?.phone || appointment.rows[0]?.phone || undefined;

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
      phone: purchaserPhone,
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

export async function getAdminDashboard() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE) AS appointments_today,
      (SELECT COUNT(*) FROM package_orders WHERE created_at::date = CURRENT_DATE) AS orders_today,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success' AND created_at::date = CURRENT_DATE) AS collections_today,
      (SELECT COUNT(*) FROM appointment_holds WHERE status = 'active' AND expires_at < NOW()) AS expired_holds
  `);
  return result.rows[0];
}

export async function listAppointments(
  filters: { doctorId?: string; status?: string; from?: string; to?: string; search?: string } = {}
) {
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
      `(p.full_name ILIKE $${values.length} OR p.phone ILIKE $${values.length} OR d.name ILIKE $${values.length})`
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT a.*, p.full_name AS patient_name, p.phone, d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     ${where}
     ORDER BY a.appointment_date DESC, a.start_time DESC
     LIMIT 100`,
    values
  );
  return result.rows;
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
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
  filters: { doctorId?: string; status?: string; from?: string; to?: string; search?: string } = {}
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
  status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  actorStaffId?: string;
}) {
  const timestampColumn = {
    checked_in: 'checked_in_at',
    completed: 'completed_at',
    cancelled: 'cancelled_at',
    no_show: 'no_show_at',
    confirmed: null,
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

export async function listPayments(
  filters: { status?: string; from?: string; to?: string; search?: string } = {}
) {
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
    values.push(`%${filters.search}%`);
    conditions.push(
      `(p.merchant_transaction_id ILIKE $${values.length} OR p.provider_reference ILIKE $${values.length} OR po.order_number ILIKE $${values.length})`
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT p.*, po.order_number, r.id AS receipt_id, r.receipt_number, r.pdf_url,
            latest_notification.status AS notification_status,
            latest_notification.error AS notification_error
     FROM payments p
     LEFT JOIN package_orders po ON po.id = p.order_id
     LEFT JOIN receipts r ON r.payment_id = p.id
     LEFT JOIN LATERAL (
       SELECT status, error
       FROM notification_outbox no
       WHERE no.payment_id = p.id
       ORDER BY no.created_at DESC
       LIMIT 1
     ) latest_notification ON true
     ${where}
     ORDER BY p.created_at DESC
     LIMIT 100`,
    values
  );
  return result.rows;
}

export async function exportPaymentsCsv(
  filters: { status?: string; from?: string; to?: string; search?: string } = {}
): Promise<string> {
  const rows = await listPayments(filters);
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
