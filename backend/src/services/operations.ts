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
import { assertBookingTransition, bookingStateForPayment, isBookingState } from '../domain/appointmentBooking';
import { assertPaymentTransition, providerEventHash, validateRefundAmount } from '../domain/paymentLifecycle';
import { resolveServicePrice } from './servicePricing';
import { AppError } from '../utils/errors';

type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

export type PatientInput = {
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

export function slotMinutesForCount(startTime?: string, endTime?: string, slotCount?: number): number {
  if (!startTime || !endTime || !slotCount) {
    const error = new Error('Opening time, closing time, and slot count are required') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 400;
    error.code = 'SLOT_PLAN_REQUIRED';
    throw error;
  }
  const totalMinutes = minutesSinceMidnight(endTime) - minutesSinceMidnight(startTime);
  if (totalMinutes <= 0 || totalMinutes % slotCount !== 0) {
    const error = new Error('The selected hours must divide evenly into the requested number of slots') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 400;
    error.code = 'SLOT_COUNT_NOT_DIVISIBLE';
    throw error;
  }
  const slotMinutes = totalMinutes / slotCount;
  if (slotMinutes < 5 || slotMinutes > 240) {
    const error = new Error('Each appointment slot must be between 5 and 240 minutes') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 400;
    error.code = 'SLOT_DURATION_OUT_OF_RANGE';
    throw error;
  }
  return slotMinutes;
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

export async function createPatient(client: PoolClient, input: PatientInput): Promise<string> {
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

  // Phone is only a candidate signal. Never merge public submissions automatically.
  const possibleMatches = await client.query(
    `SELECT id,
            ARRAY_REMOVE(ARRAY[
              CASE WHEN LOWER(BTRIM(full_name)) = LOWER(BTRIM($1)) THEN 'name' END,
              CASE WHEN phone = $2 THEN 'phone' END,
              CASE WHEN date_of_birth IS NOT DISTINCT FROM $3::date AND $3::date IS NOT NULL THEN 'date_of_birth' END,
              CASE WHEN LOWER(COALESCE(email, '')) = LOWER(COALESCE($4, '')) AND $4 IS NOT NULL THEN 'email' END
            ], NULL) AS reasons
     FROM patients
     WHERE id <> $5 AND (phone = $2 OR ($3::date IS NOT NULL AND date_of_birth = $3::date))
     LIMIT 10`,
    [input.full_name, input.phone, input.date_of_birth || null, input.email || null, patientId]
  );
  for (const match of possibleMatches.rows) {
    await client.query(
      `INSERT INTO patient_match_reviews
       (candidate_patient_id, possible_patient_id, reason_codes)
       VALUES ($1, $2, $3)`,
      [patientId, match.id, match.reasons]
    );
  }

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
          slot_minutes: row.slot_minutes || settings.default_slot_minutes,
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
      slot_minutes: row.slot_minutes || settings.default_slot_minutes,
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
  date: string,
  excludeHoldId?: string
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
       WHERE (doctor_id = $1 OR doctor_id IS NULL) AND exception_date = $2
         AND (status IS NULL OR status = 'active')`,
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
       WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'active' AND expires_at > NOW()
         AND ($3::uuid IS NULL OR id <> $3)`,
      [doctorId, date, excludeHoldId || null]
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
         AND (status IS NULL OR status = 'active')
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

export async function getPublicDoctorAvailabilityView(
  doctorId: string,
  from: string,
  to: string
) {
  const availability = await listDoctorAvailability(doctorId, from, to);
  const settings = await getAppointmentConfig();
  const now = clinicNow();
  const horizonDate = addClinicDays(now.date, settings.maximum_booking_horizon_days);
  const days = Object.fromEntries(
    Object.entries(availability).map(([date, slots]) => {
      const available = slots.filter((slot) => slot.available).length;
      const status = date < now.date
        ? 'past'
        : date > horizonDate
          ? 'booking_not_open'
          : slots.length === 0
            ? 'closed'
            : available > 0
              ? 'open'
              : slots.every((slot) => ['Past time', 'Same-day booking closed', 'Booking notice required'].includes(slot.reason || ''))
                ? 'booking_closed'
                : 'fully_booked';
      return [date, {
        date,
        status,
        total_slots: slots.length,
        available_slots: available,
        opening_time: slots[0]?.start_time || null,
        closing_time: slots[slots.length - 1]?.end_time || null,
      }];
    })
  );
  return { availability, days, timezone: 'Asia/Kolkata' };
}

export async function getAppointmentHold(id: string) {
  await expireOldHolds();
  const result = await query('SELECT * FROM appointment_holds WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function recoverAppointmentBooking(reference: string, phone: string) {
  await expireOldHolds();
  const normalizedPhone = phone.replace(/^\+91/, '');
  const result = await query(
    `SELECT h.booking_state AS hold_state, h.expires_at, h.public_reference,
            a.booking_state, a.status, a.appointment_number,
            CASE WHEN a.booking_state = 'confirmed' THEN a.appointment_number ELSE NULL END AS confirmed_appointment_number,
            p.merchant_transaction_id
     FROM appointment_holds h
     LEFT JOIN appointments a ON a.hold_id = h.id
     LEFT JOIN payments p ON p.appointment_id = a.id
       AND p.status IN ('created', 'pending', 'success', 'verification_required')
     WHERE (h.public_reference::text = $1 OR p.merchant_transaction_id = $1)
       AND RIGHT(REGEXP_REPLACE(h.patient_phone, '\\D', '', 'g'), 10) = $2
     ORDER BY p.created_at DESC NULLS LAST
     LIMIT 1`,
    [reference, normalizedPhone]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    reference: row.public_reference,
    state: row.booking_state || row.hold_state,
    expires_at: row.expires_at,
    appointment_number: row.confirmed_appointment_number,
    payment_reference: row.merchant_transaction_id || null,
  };
}

export async function createSlotHold(input: {
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  patient_phone: string;
  appointment_type?: 'new' | 'follow_up';
  idempotency_key?: string;
  correlation_id?: string;
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`calendar:${input.doctor_id}`]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${input.doctor_id}:${input.appointment_date}`,
    ]);
    await expireOldHolds(client);

    if (input.idempotency_key) {
      const replay = await client.query(
        `SELECT * FROM appointment_holds WHERE idempotency_key = $1 FOR UPDATE`,
        [input.idempotency_key]
      );
      if (replay.rows[0]) {
        await client.query('COMMIT');
        return replay.rows[0];
      }
    }

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

    const servicePrice = await resolveServicePrice(client, 'consultation', input.doctor_id, input.appointment_type || 'new', true);
    const result = await client.query(
      `INSERT INTO appointment_holds
       (doctor_id, appointment_date, start_time, end_time, patient_phone, expires_at,
        idempotency_key, correlation_id, fee_amount, fee_currency, booking_state,
        service_id, service_code, service_name, service_price_version)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6::text || ' minutes')::interval,
               $7, COALESCE($8::uuid, gen_random_uuid()), $9, 'INR', 'slot_held', $10, $11, $12, $13)
       RETURNING *`,
      [
        input.doctor_id,
        input.appointment_date,
        slot.start_time,
        slot.end_time,
        input.patient_phone,
        settings.hold_duration_minutes,
        input.idempotency_key || null,
        input.correlation_id || null,
        Number(servicePrice.price),
        servicePrice.id,
        servicePrice.code,
        servicePrice.name,
        servicePrice.version,
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
  idempotency_key?: string;
  correlation_id?: string;
  expected_version?: number;
  consent: {
    accepted: true;
    purpose: 'appointment_booking_and_payment';
    version: string;
    policy_version: string;
    language: 'en' | 'hi' | 'mr';
  };
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`calendar:${input.doctor_id}`]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${input.doctor_id}:${input.appointment_date}`,
    ]);
    await expireOldHolds(client);
    if (input.idempotency_key) {
      const replay = await client.query(
        `SELECT * FROM appointments WHERE idempotency_key = $1 FOR UPDATE`,
        [input.idempotency_key]
      );
      if (replay.rows[0]) {
        await client.query('COMMIT');
        return replay.rows[0];
      }
    }
    const patientId = await createPatient(client, input.patient);

    const settings = await getAppointmentConfig(client);
    let endTime = addMinutes(input.start_time, settings.default_slot_minutes);
    let slotMinutes = settings.default_slot_minutes;
    let serviceSnapshot: { id: string; code: string; name: string; version: number; price: number };
    if (input.hold_id) {
      const holdResult = await client.query(
        `SELECT * FROM appointment_holds
         WHERE id = $1 AND status = 'active' AND expires_at > NOW()
           AND ($2::integer IS NULL OR version = $2)
         FOR UPDATE`,
        [input.hold_id, input.expected_version || null]
      );
      const heldSlot = holdResult.rows[0];
      if (!heldSlot) throw new Error('Slot hold has expired');
      if (
        heldSlot.doctor_id !== input.doctor_id ||
        String(heldSlot.appointment_date).slice(0, 10) !== input.appointment_date ||
        compactTime(heldSlot.start_time) !== compactTime(input.start_time)
      ) {
        const error = new Error('Slot hold does not match the requested appointment') as Error & {
          status?: number;
        };
        error.status = 409;
        throw error;
      }

      const currentSlots = await listSlotsWithDb(
        client,
        input.doctor_id,
        input.appointment_date,
        input.hold_id
      );
      const currentSlot = currentSlots.find(
        (item) => compactTime(item.start_time) === compactTime(input.start_time)
      );
      if (!currentSlot || !currentSlot.available) {
        const error = new Error(
          'The doctor schedule changed while this slot was held. Please select another slot.'
        ) as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'HELD_SLOT_NO_LONGER_AVAILABLE';
        throw error;
      }

      const hold = await client.query(
        `UPDATE appointment_holds
         SET status = 'converted', converted_at = NOW(), booking_state = 'payment_required',
             version = version + 1, policy_version = $2, consent_version = $3,
             consent_language = $4, consent_given_at = NOW()
         WHERE id = $1 AND status = 'active' AND expires_at > NOW()
           AND ($5::integer IS NULL OR version = $5)
         RETURNING *`,
        [input.hold_id, input.consent.policy_version, input.consent.version, input.consent.language, input.expected_version || null]
      );
      if (!hold.rows[0]) throw new Error('Slot hold has expired');
      endTime = hold.rows[0].end_time;
      const legacyResolved = hold.rows[0].service_id ? null : await resolveServicePrice(client, 'consultation', input.doctor_id, input.appointment_type || 'new');
      serviceSnapshot = {
        id: hold.rows[0].service_id || legacyResolved.id,
        code: hold.rows[0].service_code || legacyResolved?.code || 'consultation',
        name: hold.rows[0].service_name || legacyResolved?.name || 'Consultation',
        version: Number(hold.rows[0].service_price_version || legacyResolved?.version || 1),
        price: Number(hold.rows[0].fee_amount ?? legacyResolved?.price),
      };
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
      const resolved = await resolveServicePrice(client, 'consultation', input.doctor_id, input.appointment_type || 'new', input.source !== 'admin');
      serviceSnapshot = { id: resolved.id, code: resolved.code, name: resolved.name, version: resolved.version, price: Number(resolved.price) };
    }

    const appointment = await client.query(
      `INSERT INTO appointments
       (patient_id, doctor_id, hold_id, appointment_date, start_time, end_time, slot_minutes,
        appointment_type, status, source, reception_notes, created_by_staff_id, booking_state,
        idempotency_key, correlation_id, fee_amount, fee_currency, service_id, service_code,
        service_name, service_price_version, policy_version,
        consent_version, consent_language, consent_given_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'payment_required',
               $13, COALESCE($14::uuid, gen_random_uuid()), $15, 'INR', $16, $17, $18, $19, $20, $21, $22, NOW())
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
        input.idempotency_key || null,
        input.correlation_id || null,
        serviceSnapshot.price,
        serviceSnapshot.id,
        serviceSnapshot.code,
        serviceSnapshot.name,
        serviceSnapshot.version,
        input.consent.policy_version,
        input.consent.version,
        input.consent.language,
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

export async function createPayment(input: { order_id?: string; appointment_id?: string; idempotency_key?: string }) {
  if (!config.phonePe.enabled && !config.payments.mockEnabled) {
    throw new AppError(503, 'PAYMENT_PROVIDER_DISABLED', 'Online payment is temporarily unavailable. No payment was created.');
  }
  if (input.idempotency_key) {
    const replay = await query('SELECT * FROM payments WHERE idempotency_key = $1', [input.idempotency_key]);
    if (replay.rows[0]) return replay.rows[0];
  }
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
  const amount = Number(order.rows[0]?.total_amount || appointment.rows[0]?.fee_amount || 0);
  if (!order.rows[0] && !appointment.rows[0]) throw new Error('Payment target not found');
  if (amount <= 0 && order.rows[0]) throw new Error('Order amount must be greater than zero');
  if (amount <= 0 && appointment.rows[0])
    throw new Error('Appointment amount must be greater than zero');

  const merchantTransactionId = orderNumber('SPP');
  const returnUrl = `${config.frontendUrl}/payment/confirmation?transaction=${merchantTransactionId}`;
  const amountPaisa = amountToPaisa(amount);
  const paymentPhone = String(order.rows[0]?.phone || appointment.rows[0]?.phone || '').replace(/^\+/, '');

  let result;
  try {
    result = await query(
      `INSERT INTO payments
     (order_id, appointment_id, merchant_transaction_id, amount, amount_paisa, currency,
      status, redirect_url, raw_response, idempotency_key, quote_snapshot, policy_snapshot)
     VALUES ($1, $2, $3, $4, $5, 'INR', 'created', $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.order_id || null,
      input.appointment_id || null,
      merchantTransactionId,
      amount,
      amountPaisa,
      config.phonePe.enabled ? returnUrl : `${returnUrl}&mock=1`,
      JSON.stringify({ mode: config.phonePe.enabled ? 'phonepe' : 'mock' }),
      input.idempotency_key || null,
      JSON.stringify({
        amount, amount_paisa: amountPaisa, currency: 'INR',
        ...(appointment.rows[0] ? {
          service_id: appointment.rows[0].service_id,
          service_code: appointment.rows[0].service_code,
          service_name: appointment.rows[0].service_name,
          service_price_version: appointment.rows[0].service_price_version,
        } : {}),
      }),
      JSON.stringify({
        policy_version: order.rows[0]?.policy_version || appointment.rows[0]?.policy_version || null,
        captured_at: new Date().toISOString(),
      }),
      ]
    );
  } catch (err) {
    if ((err as { code?: string }).code !== '23505') throw err;
    const replay = await query(
      `SELECT * FROM payments
       WHERE ($1::text IS NOT NULL AND idempotency_key = $1)
          OR ($2::uuid IS NOT NULL AND order_id = $2 AND status IN ('created','pending','success','verification_required','refund_pending'))
          OR ($3::uuid IS NOT NULL AND appointment_id = $3 AND status IN ('created','pending','success','verification_required','refund_pending'))
       ORDER BY created_at DESC LIMIT 1`,
      [input.idempotency_key || null, input.order_id || null, input.appointment_id || null]
    );
    if (replay.rows[0]) return replay.rows[0];
    throw err;
  }
  if (input.appointment_id) {
    await query(
      `UPDATE appointments
       SET booking_state = 'payment_pending', status = 'payment_pending',
           version = version + 1, updated_at = NOW()
       WHERE id = $1 AND booking_state IN ('payment_required', 'payment_failed')`,
      [input.appointment_id]
    );
  }
  if (!config.phonePe.enabled && config.payments.mockEnabled) {
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

export async function createOrderPayment(orderId: string, idempotencyKey?: string) {
  return createPayment({ order_id: orderId, idempotency_key: idempotencyKey });
}

export async function createAppointmentPayment(holdId: string, idempotencyKey?: string) {
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
  return createPayment({ appointment_id: appointment.rows[0].id, idempotency_key: idempotencyKey });
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
    const eventHash = providerEventHash('phonepe', eventName, safePayload);
    const acceptedEvent = await client.query(
      `INSERT INTO payment_webhook_events
       (payment_id, event_name, merchant_order_id, status, raw_payload, event_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (provider, event_hash) WHERE event_hash IS NOT NULL DO NOTHING
       RETURNING id`,
      [paymentRow.id, eventName, merchantTransactionId, status, JSON.stringify(safePayload), eventHash]
    );
    if (!acceptedEvent.rows[0]) {
      await client.query('COMMIT');
      return paymentRow;
    }
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
    assertPaymentTransition(paymentRow.status, appliedStatus);
    if (paymentRow.appointment_id) {
      const appointmentState = await client.query(
        `SELECT booking_state FROM appointments WHERE id = $1 FOR UPDATE`,
        [paymentRow.appointment_id]
      );
      const currentBookingState = appointmentState.rows[0]?.booking_state;
      const mappedState = bookingStateForPayment(appliedStatus);
      if (mappedState && isBookingState(currentBookingState)) {
        assertBookingTransition(currentBookingState, mappedState);
      }
    }

    const payment = await client.query(
      `UPDATE payments
       SET status = $1,
           provider_order_id = COALESCE($2, provider_order_id),
           provider_reference = COALESCE($3, provider_reference),
           payment_method = COALESCE($4, payment_method),
           raw_response = $5,
           status_version = status_version + CASE WHEN status <> $1 THEN 1 ELSE 0 END,
           last_reconciled_at = CASE WHEN $7 THEN NOW() ELSE last_reconciled_at END,
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
        eventName === 'phonepe.status_api' || eventName === 'phonepe.reconciliation',
      ]
    );

    await client.query(
      `INSERT INTO payment_attempts (payment_id, status, raw_payload) VALUES ($1, $2, $3)`,
      [payment.rows[0].id, nextStatus, JSON.stringify(safePayload)]
    );
    await client.query(
      `UPDATE payment_webhook_events
       SET provider_order_id = $1, provider_transaction_id = $2, status = $3
       WHERE id = $4`,
      [
        providerOrderId,
        providerTransactionId,
        nextStatus,
        acceptedEvent.rows[0].id,
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
          `UPDATE appointments
           SET status = 'confirmed', booking_state = 'confirmed', version = version + 1,
               updated_at = NOW()
           WHERE id = $1 AND booking_state = 'payment_pending'`,
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
          `UPDATE appointments
           SET status = 'payment_failed', booking_state = 'payment_failed',
               version = version + 1, updated_at = NOW() WHERE id = $1`,
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

export async function refreshPaymentFromProvider(payment: any, force = false) {
  if (!config.phonePe.enabled || !payment) return payment;
  if (isTerminalPaymentStatus(payment.status) && payment.status !== 'verification_required')
    return payment;
  const updatedAt = parseDate(payment.updated_at);
  if (!force && updatedAt && Date.now() - updatedAt.getTime() < 60_000) return payment;

  const providerStatus = await getPhonePeOrderStatus(payment.merchant_transaction_id);
  const nextStatus = normalizePhonePeState(providerStatus.state);
  return updatePaymentStatus(
    payment.merchant_transaction_id,
    nextStatus,
    providerStatus,
    force ? 'phonepe.reconciliation' : 'phonepe.status_api'
  );
}

export async function reconcilePendingPayments(limit = 25) {
  if (!config.phonePe.enabled) return { checked: 0, changed: 0, exceptions: 0 };
  const pending = await query(
    `SELECT * FROM payments
     WHERE status IN ('created','pending','verification_required')
       AND updated_at < NOW() - INTERVAL '2 minutes'
     ORDER BY updated_at ASC, id ASC LIMIT $1`,
    [Math.min(100, Math.max(1, limit))]
  );
  let changed = 0;
  let exceptions = 0;
  for (const payment of pending.rows) {
    try {
      const refreshed = await refreshPaymentFromProvider(payment, true);
      if (refreshed?.status !== payment.status) changed += 1;
      if (refreshed?.status === 'verification_required' || (Date.now() - new Date(payment.created_at).getTime()) > 15 * 60_000) {
        const inserted = await query(
          `INSERT INTO payment_exceptions
           (payment_id, exception_type, severity, expected_snapshot, observed_snapshot)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (payment_id, exception_type) WHERE status <> 'resolved'
           DO UPDATE SET observed_snapshot = EXCLUDED.observed_snapshot, updated_at = NOW()
           RETURNING id`,
          [payment.id, refreshed?.status === 'verification_required' ? 'provider_mismatch' : 'pending_too_long',
            refreshed?.status === 'verification_required' ? 'critical' : 'warning',
            JSON.stringify({ amount_paisa: payment.amount_paisa, currency: payment.currency || 'INR' }),
            JSON.stringify({ status: refreshed?.status || payment.status, checked_at: new Date().toISOString() })]
        );
        if (inserted.rows[0]) exceptions += 1;
      }
    } catch (err) {
      await query(
        `INSERT INTO payment_exceptions (payment_id, exception_type, severity, observed_snapshot)
         VALUES ($1, 'provider_unavailable', 'warning', $2)
         ON CONFLICT (payment_id, exception_type) WHERE status <> 'resolved'
         DO UPDATE SET observed_snapshot = EXCLUDED.observed_snapshot, updated_at = NOW()`,
        [payment.id, JSON.stringify({ checked_at: new Date().toISOString(), error_code: 'PROVIDER_REQUEST_FAILED' })]
      );
      exceptions += 1;
    }
  }
  return { checked: pending.rows.length, changed, exceptions };
}

export async function listPaymentExceptions(status = 'open', limit = 50) {
  const result = await query(
    `SELECT pe.id, pe.payment_id, pe.exception_type, pe.severity, pe.status,
            pe.owner_staff_id, pe.resolution_notes, pe.created_at, pe.updated_at,
            p.merchant_transaction_id, p.amount, p.currency, p.status AS payment_status
     FROM payment_exceptions pe JOIN payments p ON p.id = pe.payment_id
     WHERE pe.status = $1 ORDER BY pe.severity DESC, pe.created_at ASC LIMIT $2`,
    [status, Math.min(100, Math.max(1, limit))]
  );
  return result.rows;
}

export async function requestPaymentRefund(input: { paymentId: string; amount: number; reason: string; idempotencyKey: string; actorStaffId: string }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const replay = await client.query('SELECT * FROM payment_refunds WHERE idempotency_key = $1', [input.idempotencyKey]);
    if (replay.rows[0]) { await client.query('COMMIT'); return replay.rows[0]; }
    const paymentResult = await client.query(`SELECT * FROM payments WHERE id = $1 FOR UPDATE`, [input.paymentId]);
    const payment = paymentResult.rows[0];
    if (!payment || !['success','refund_pending'].includes(payment.status)) {
      const error = new Error('Only provider-verified successful payments can be refunded') as Error & { status?: number; code?: string };
      error.status = 409; error.code = 'PAYMENT_NOT_REFUNDABLE'; throw error;
    }
    const totals = await client.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','processing','completed')), 0) AS reserved
       FROM payment_refunds WHERE payment_id = $1`, [input.paymentId]
    );
    validateRefundAmount(Number(payment.amount), Number(totals.rows[0].reserved), input.amount);
    const refund = await client.query(
      `INSERT INTO payment_refunds
       (payment_id, amount, currency, reason, idempotency_key, requested_by_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.paymentId, input.amount, payment.currency || 'INR', input.reason, input.idempotencyKey, input.actorStaffId]
    );
    await client.query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'payment.refund_requested', 'payment', $2, $3)`,
      [input.actorStaffId, input.paymentId, JSON.stringify({ refund_id: refund.rows[0].id, amount: input.amount, currency: payment.currency || 'INR' })]
    );
    await client.query('COMMIT');
    return refund.rows[0];
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
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
     WHERE ar.is_active = true
       AND (ar.effective_until IS NULL OR ar.effective_until >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
       ${doctorId ? 'AND ar.doctor_id = $1' : ''}
     ORDER BY ar.weekday ASC, ar.start_time ASC`,
    doctorId ? [doctorId] : []
  );
  return result.rows;
}

export async function createAvailabilityRule(input: {
  doctor_id: string;
  weekday: number;
  closed: boolean;
  start_time?: string;
  end_time?: string;
  slot_count?: number;
  effective_from: string;
  effective_until?: string;
  expected_version: number;
  actor_staff_id?: string;
}) {
  const slotMinutes = input.closed ? null : slotMinutesForCount(input.start_time, input.end_time, input.slot_count);
  const settings = await getAppointmentConfig();
  const endDate = input.effective_until || addClinicDays(input.effective_from, settings.maximum_booking_horizon_days);
  const affectedDates: string[] = [];
  const cursor = new Date(`${input.effective_from}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    if (cursor.getUTCDay() === input.weekday) affectedDates.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`calendar:${input.doctor_id}`]);
    await expireOldHolds(client);
    const versionResult = await client.query(
      `INSERT INTO doctor_schedule_versions (doctor_id) VALUES ($1)
       ON CONFLICT (doctor_id) DO UPDATE SET doctor_id = EXCLUDED.doctor_id
       RETURNING version`,
      [input.doctor_id]
    );
    if (Number(versionResult.rows[0]?.version || 1) !== input.expected_version) {
      const error = new Error('The calendar changed in another session. Reload before saving weekly hours.') as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'SCHEDULE_VERSION_CONFLICT';
      throw error;
    }
    if (affectedDates.length > 0) {
      const conflicts = await client.query(
        `SELECT
           (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date = ANY($2::date[])
             AND status IN ('awaiting_payment','payment_pending','confirmed','checked_in'))::int AS appointments,
           (SELECT COUNT(*) FROM appointment_holds WHERE doctor_id = $1 AND appointment_date = ANY($2::date[])
             AND status = 'active' AND expires_at > NOW())::int AS holds`,
        [input.doctor_id, affectedDates]
      );
      const appointmentCount = Number(conflicts.rows[0]?.appointments || 0);
      const holdCount = Number(conflicts.rows[0]?.holds || 0);
      if (appointmentCount > 0 || holdCount > 0) {
        const error = new Error(`Weekly hours cannot be replaced while ${appointmentCount} appointment(s) and ${holdCount} active hold(s) exist on affected dates.`) as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'RECURRING_SCHEDULE_CONFLICT';
        throw error;
      }
    }
    await client.query(
      `UPDATE doctor_availability_rules
       SET effective_until = ($3::date - 1), updated_at = NOW()
       WHERE doctor_id = $1 AND weekday = $2 AND is_active = true
         AND effective_from < $3 AND (effective_until IS NULL OR effective_until >= $3)`,
      [input.doctor_id, input.weekday, input.effective_from]
    );
    await client.query(
      `UPDATE doctor_availability_rules SET is_active = false, updated_at = NOW()
       WHERE doctor_id = $1 AND weekday = $2 AND is_active = true AND effective_from >= $3`,
      [input.doctor_id, input.weekday, input.effective_from]
    );
    let rule = null;
    if (!input.closed) {
      const inserted = await client.query(
        `INSERT INTO doctor_availability_rules
         (doctor_id, weekday,start_time,end_time,slot_minutes,effective_from,effective_until,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
        [input.doctor_id, input.weekday, input.start_time, input.end_time, slotMinutes, input.effective_from, input.effective_until || null]
      );
      rule = inserted.rows[0];
    }
    const nextVersion = await client.query(
      `UPDATE doctor_schedule_versions SET version = version + 1, updated_at = NOW() WHERE doctor_id = $1 RETURNING version`,
      [input.doctor_id]
    );
    await client.query(
      `INSERT INTO schedule_audit_events
       (doctor_id,actor_staff_id,action,after_state,reason,affected_dates,correlation_id)
       VALUES($1,$2,'schedule.weekday_replaced',$3,$4,$5::date[],gen_random_uuid())`,
      [input.doctor_id, input.actor_staff_id || null, JSON.stringify({ weekday: input.weekday, closed: input.closed, rule }), input.closed ? 'Regular weekday closed' : 'Regular weekday hours updated', affectedDates]
    );
    await client.query('COMMIT');
    return { ...rule, closed: input.closed, version: Number(nextVersion.rows[0]?.version) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
  conditions.push(`ce.status = 'active'`);
  const where = `WHERE ${conditions.join(' AND ')}`;
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
  const hasWholeDayBlock = input.overrides.some((item) => item.override_type === 'unavailable_whole_day');
  const hasCustomHours = input.overrides.some((item) => ['custom_hours', 'add_extra_hours'].includes(item.override_type));
  const hasPartialBlock = input.overrides.some((item) => item.override_type === 'block_time_range');
  const summary = summarizeAvailability(input.slots);

  if (hasWholeDayBlock) return 'unavailable';
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
  const [settings, availability, rules, overrides, appointments, versionResult, conflictsResult] = await Promise.all([
    getAppointmentConfig(),
    listDoctorAvailability(input.doctorId, input.from, input.to),
    listAvailabilityRules(input.doctorId),
    listCalendarOverrides({ doctorId: input.doctorId, from: input.from, to: input.to }),
    listAppointments({ doctorId: input.doctorId, from: input.from, to: input.to }),
    query(
      `INSERT INTO doctor_schedule_versions (doctor_id) VALUES ($1)
       ON CONFLICT (doctor_id) DO UPDATE SET doctor_id = EXCLUDED.doctor_id
       RETURNING version`,
      [input.doctorId]
    ),
    query(
      `SELECT id, status, reason, requested_change, created_at
       FROM schedule_conflict_cases
       WHERE doctor_id = $1 AND status IN ('open', 'ready')
       ORDER BY created_at DESC LIMIT 50`,
      [input.doctorId]
    ),
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
    version: Number(versionResult.rows[0]?.version || 1),
    pendingConflictCases: conflictsResult.rows,
    settings,
    warnings: appointmentConfigWarnings(settings),
    rules,
    overrides,
    appointments,
    availability,
    days,
  };
}

export async function getScheduleConflictCase(id: string, doctorId?: string) {
  const caseResult = await query(
    `SELECT scc.*, d.name AS doctor_name
     FROM schedule_conflict_cases scc
     JOIN doctors d ON d.id = scc.doctor_id
     WHERE scc.id = $1 ${doctorId ? 'AND scc.doctor_id = $2' : ''}`,
    doctorId ? [id, doctorId] : [id]
  );
  if (!caseResult.rows[0]) return null;
  const appointments = await query(
    `SELECT sca.appointment_id, sca.resolution, sca.notes, sca.resolved_at,
            a.appointment_number, a.doctor_id, a.appointment_date, a.start_time, a.end_time,
            a.status, p.full_name AS patient_name, p.phone
     FROM schedule_conflict_appointments sca
     JOIN appointments a ON a.id = sca.appointment_id
     JOIN patients p ON p.id = a.patient_id
     WHERE sca.case_id = $1
     ORDER BY a.appointment_date, a.start_time`,
    [id]
  );
  return {
    ...caseResult.rows[0],
    appointments: appointments.rows.map((row) => ({ ...row, phone: undefined, phone_masked: maskPhone(row.phone) })),
  };
}

export async function recordScheduleConflictResolutions(input: {
  caseId: string;
  resolutions: Array<{
    appointment_id: string;
    resolution: 'keep' | 'reschedule' | 'approved_transfer' | 'cancel_contact';
    notes: string;
  }>;
  actorStaffId?: string;
  doctorId?: string;
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const caseResult = await client.query(
      `SELECT * FROM schedule_conflict_cases
       WHERE id = $1 ${input.doctorId ? 'AND doctor_id = $2' : ''}
         AND status IN ('open', 'ready')
       FOR UPDATE`,
      input.doctorId ? [input.caseId, input.doctorId] : [input.caseId]
    );
    const conflictCase = caseResult.rows[0];
    if (!conflictCase) {
      const error = new Error('Open schedule conflict case not found') as Error & { status?: number; code?: string };
      error.status = 404;
      error.code = 'SCHEDULE_CONFLICT_NOT_FOUND';
      throw error;
    }
    const requestedDates: string[] = conflictCase.requested_change?.dates || [];
    for (const resolution of input.resolutions) {
      const appointmentResult = await client.query(
        `SELECT a.* FROM schedule_conflict_appointments sca
         JOIN appointments a ON a.id = sca.appointment_id
         WHERE sca.case_id = $1 AND sca.appointment_id = $2
         FOR UPDATE OF sca, a`,
        [input.caseId, resolution.appointment_id]
      );
      const appointment = appointmentResult.rows[0];
      if (!appointment) {
        const error = new Error('Appointment is not part of this conflict case') as Error & { status?: number; code?: string };
        error.status = 400;
        error.code = 'CONFLICT_APPOINTMENT_MISMATCH';
        throw error;
      }
      if (resolution.resolution === 'cancel_contact' && appointment.status !== 'cancelled') {
        const error = new Error('Cancel the appointment and complete patient contact before recording this resolution') as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'APPOINTMENT_CANCELLATION_REQUIRED';
        throw error;
      }
      if (resolution.resolution === 'approved_transfer' && appointment.doctor_id === conflictCase.doctor_id) {
        const error = new Error('Transfer the appointment to the approved doctor before recording this resolution') as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'APPOINTMENT_TRANSFER_REQUIRED';
        throw error;
      }
      if (
        resolution.resolution === 'reschedule' &&
        requestedDates.includes(formatClinicDate(appointment.appointment_date))
      ) {
        const error = new Error('Reschedule the appointment to a different date before recording this resolution') as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'APPOINTMENT_RESCHEDULE_REQUIRED';
        throw error;
      }
      await client.query(
        `UPDATE schedule_conflict_appointments
         SET resolution = $3, notes = $4, resolved_by_staff_id = $5, resolved_at = NOW()
         WHERE case_id = $1 AND appointment_id = $2`,
        [input.caseId, resolution.appointment_id, resolution.resolution, resolution.notes, input.actorStaffId || null]
      );
    }
    const unresolved = await client.query(
      `SELECT COUNT(*)::int AS count FROM schedule_conflict_appointments
       WHERE case_id = $1 AND resolution IS NULL`,
      [input.caseId]
    );
    const status = Number(unresolved.rows[0]?.count || 0) === 0 ? 'ready' : 'open';
    const updated = await client.query(
      `UPDATE schedule_conflict_cases SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [input.caseId, status]
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

export async function createCalendarOverride(input: {
  doctor_id?: string;
  exception_date: string;
  override_type: 'unavailable_whole_day' | 'custom_hours' | 'block_time_range' | 'add_extra_hours';
  start_time?: string;
  end_time?: string;
  slot_count?: number;
  reason?: string;
  public_note?: string;
  internal_note?: string;
}) {
  const available =
    input.override_type === 'custom_hours' || input.override_type === 'add_extra_hours';
  const slotMinutes = input.override_type === 'unavailable_whole_day'
    ? null
    : slotMinutesForCount(input.start_time, input.end_time, input.slot_count);
  const result = await query(
    `INSERT INTO calendar_exceptions
     (doctor_id, exception_date, override_type, start_time, end_time, slot_minutes, reason, public_note, internal_note, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.doctor_id || null,
      input.exception_date,
      input.override_type,
      input.override_type === 'unavailable_whole_day' ? null : input.start_time || null,
      input.override_type === 'unavailable_whole_day' ? null : input.end_time || null,
      slotMinutes,
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
  slot_count?: number;
  reason?: string;
  public_note?: string;
  internal_note?: string;
  expected_version: number;
  actor_staff_id?: string;
  resolved_conflict_case_id?: string;
}) {
  const uniqueDates = Array.from(new Set(input.dates)).sort();
  const slotMinutes = input.override_type === 'unavailable_whole_day'
    ? null
    : slotMinutesForCount(input.start_time, input.end_time, input.slot_count);
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
    for (const date of uniqueDates) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${input.doctor_id}:${date}`,
      ]);
    }
    await expireOldHolds(client);
    const versionResult = await client.query(
      `INSERT INTO doctor_schedule_versions (doctor_id) VALUES ($1)
       ON CONFLICT (doctor_id) DO UPDATE SET doctor_id = EXCLUDED.doctor_id
       RETURNING version`,
      [input.doctor_id]
    );
    const currentVersion = Number(versionResult.rows[0].version);
    if (currentVersion !== input.expected_version) {
      const error = new Error('The calendar changed in another session. Reload and review the latest schedule.') as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'SCHEDULE_VERSION_CONFLICT';
      throw error;
    }

    if (input.resolved_conflict_case_id) {
      const readyCase = await client.query(
        `SELECT id FROM schedule_conflict_cases
         WHERE id = $1 AND doctor_id = $2 AND status = 'ready'
           AND NOT EXISTS (
             SELECT 1 FROM schedule_conflict_appointments
             WHERE case_id = $1 AND resolution IS NULL
           )
         FOR UPDATE`,
        [input.resolved_conflict_case_id, input.doctor_id]
      );
      if (!readyCase.rows[0]) {
        const error = new Error('Resolve every affected appointment before applying this schedule change') as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'SCHEDULE_CONFLICT_NOT_READY';
        throw error;
      }
    }

    const activeHoldResult = await client.query(
      `SELECT appointment_date, COUNT(*)::int AS hold_count
       FROM appointment_holds
       WHERE doctor_id = $1
         AND appointment_date = ANY($2::date[])
         AND status = 'active'
         AND expires_at > NOW()
       GROUP BY appointment_date
       ORDER BY appointment_date ASC`,
      [input.doctor_id, uniqueDates]
    );
    const isReduction =
      input.override_type === 'unavailable_whole_day' ||
      input.override_type === 'block_time_range' ||
      input.override_type === 'custom_hours';
    if (isReduction && activeHoldResult.rows.length > 0) {
      const affected = activeHoldResult.rows
        .map((row) => `${formatClinicDate(row.appointment_date)} (${Number(row.hold_count)} hold)`)
        .join(', ');
      const error = new Error(
        `A patient is currently completing a booking on ${affected}. Retry after the slot hold expires or is converted.`
      ) as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'ACTIVE_SLOT_HOLDS';
      throw error;
    }

    const conflictResult = await client.query(
      `SELECT appointment_date, COUNT(*)::int AS appointment_count
       FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = ANY($2::date[])
         AND status IN ('awaiting_payment', 'payment_pending', 'confirmed', 'checked_in')
         AND ($3::uuid IS NULL OR id NOT IN (
           SELECT appointment_id FROM schedule_conflict_appointments
           WHERE case_id = $3 AND resolution IS NOT NULL
         ))
       GROUP BY appointment_date
       ORDER BY appointment_date ASC`,
      [input.doctor_id, uniqueDates, input.resolved_conflict_case_id || null]
    );
    const conflicted = conflictResult.rows.map((row) => ({
      date: formatClinicDate(row.appointment_date),
      appointment_count: Number(row.appointment_count || 0),
    }));

    if (conflicted.length > 0 && isReduction) {
      const appointmentRows = await client.query(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND appointment_date = ANY($2::date[])
           AND status IN ('awaiting_payment', 'payment_pending', 'confirmed', 'checked_in')`,
        [input.doctor_id, uniqueDates]
      );
      const correlationId = crypto.randomUUID();
      const conflictCase = await client.query(
        `INSERT INTO schedule_conflict_cases
         (doctor_id, requested_by_staff_id, requested_version, requested_change, reason, due_at, correlation_id)
         VALUES ($1, $2, $3, $4, $5, ($6::date + time '09:00') AT TIME ZONE 'Asia/Kolkata', $7)
         RETURNING *`,
        [input.doctor_id, input.actor_staff_id || null, currentVersion, JSON.stringify({ ...input, actor_staff_id: undefined }), input.reason, uniqueDates[0], correlationId]
      );
      for (const row of appointmentRows.rows) {
        await client.query(
          `INSERT INTO schedule_conflict_appointments (case_id, appointment_id) VALUES ($1, $2)`,
          [conflictCase.rows[0].id, row.id]
        );
      }
      await client.query(
        `INSERT INTO schedule_audit_events
         (doctor_id, actor_staff_id, action, after_state, reason, affected_dates, correlation_id)
         VALUES ($1, $2, 'schedule.change_pending_resolution', $3, $4, $5::date[], $6)`,
        [input.doctor_id, input.actor_staff_id || null, JSON.stringify({ conflict_case_id: conflictCase.rows[0].id, conflicted }), input.reason, uniqueDates, correlationId]
      );
      await client.query('COMMIT');
      return {
        created: [],
        skipped: [],
        conflicted,
        requiresResolution: true,
        conflictCase: conflictCase.rows[0],
        version: currentVersion,
      };
    }

    const available =
      input.override_type === 'custom_hours' || input.override_type === 'add_extra_hours';
    const created: any[] = [];
    const skipped: any[] = [];

    for (const date of uniqueDates) {
      if (['custom_hours', 'unavailable_whole_day'].includes(input.override_type)) {
        await client.query(
          `UPDATE calendar_exceptions
           SET status = 'superseded', updated_at = NOW()
           WHERE doctor_id = $1 AND exception_date = $2 AND status = 'active'`,
          [input.doctor_id, date]
        );
      }
      const result = await client.query(
        `INSERT INTO calendar_exceptions
         (doctor_id, exception_date, override_type, start_time, end_time, slot_minutes, reason, public_note, internal_note, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          input.doctor_id,
          date,
          input.override_type,
          input.override_type === 'unavailable_whole_day' ? null : input.start_time || null,
          input.override_type === 'unavailable_whole_day' ? null : input.end_time || null,
          slotMinutes,
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

    const correlationId = crypto.randomUUID();
    const nextVersionResult = await client.query(
      `UPDATE doctor_schedule_versions SET version = version + 1, updated_at = NOW()
       WHERE doctor_id = $1 RETURNING version`,
      [input.doctor_id]
    );
    await client.query(
      `INSERT INTO schedule_audit_events
       (doctor_id, actor_staff_id, action, after_state, reason, affected_dates, correlation_id)
       VALUES ($1, $2, 'schedule.change_applied', $3, $4, $5::date[], $6)`,
      [input.doctor_id, input.actor_staff_id || null, JSON.stringify({ override_type: input.override_type, created: created.map((item) => item.id) }), input.reason, uniqueDates, correlationId]
    );
    if (input.resolved_conflict_case_id) {
      await client.query(
        `UPDATE schedule_conflict_cases SET status = 'applied', updated_at = NOW() WHERE id = $1`,
        [input.resolved_conflict_case_id]
      );
    }

    await client.query('COMMIT');
    return {
      created,
      skipped,
      conflicted,
      requiresResolution: false,
      version: Number(nextVersionResult.rows[0].version),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function applyScheduleConflictCase(input: {
  caseId: string;
  expectedVersion: number;
  actorStaffId?: string;
  doctorId?: string;
}) {
  const result = await query(
    `SELECT * FROM schedule_conflict_cases
     WHERE id = $1 ${input.doctorId ? 'AND doctor_id = $2' : ''} AND status = 'ready'`,
    input.doctorId ? [input.caseId, input.doctorId] : [input.caseId]
  );
  const conflictCase = result.rows[0];
  if (!conflictCase) {
    const error = new Error('Ready schedule conflict case not found') as Error & { status?: number; code?: string };
    error.status = 404;
    error.code = 'SCHEDULE_CONFLICT_NOT_READY';
    throw error;
  }
  const requested = conflictCase.requested_change;
  return createCalendarOverridesBatch({
    doctor_id: conflictCase.doctor_id,
    dates: requested.dates,
    override_type: requested.override_type,
    start_time: requested.start_time,
    end_time: requested.end_time,
    slot_count: requested.slot_count,
    reason: requested.reason || conflictCase.reason,
    public_note: requested.public_note,
    internal_note: requested.internal_note,
    expected_version: input.expectedVersion,
    actor_staff_id: input.actorStaffId,
    resolved_conflict_case_id: input.caseId,
  });
}

export async function deleteCalendarOverride(
  id: string,
  expectedVersion: number,
  actorStaffId?: string,
  actorDoctorId?: string
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const lookup = await client.query('SELECT * FROM calendar_exceptions WHERE id = $1', [id]);
    if (!lookup.rows[0]) {
      const error = new Error('Calendar override not found') as Error & { status?: number };
      error.status = 404;
      throw error;
    }
    const doctorId = lookup.rows[0].doctor_id;
    const exceptionDate = formatClinicDate(lookup.rows[0].exception_date);
    if (!doctorId) {
      const error = new Error('Clinic-wide calendar changes require the global schedule workflow') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 409;
      error.code = 'GLOBAL_SCHEDULE_WORKFLOW_REQUIRED';
      throw error;
    }
    if (actorDoctorId && doctorId !== actorDoctorId) {
      const error = new Error('Doctors may only remove changes from their own calendar') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 403;
      error.code = 'DOCTOR_CALENDAR_SCOPE_DENIED';
      throw error;
    }
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`calendar:${doctorId}`]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${doctorId}:${exceptionDate}`,
    ]);
    await expireOldHolds(client);
    const existing = await client.query(
      `SELECT * FROM calendar_exceptions WHERE id = $1 AND status = 'active' FOR UPDATE`,
      [id]
    );
    if (!existing.rows[0]) {
      const error = new Error('This calendar change was already removed') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 409;
      error.code = 'CALENDAR_OVERRIDE_ALREADY_REMOVED';
      throw error;
    }
    const version = await client.query(
      `SELECT version FROM doctor_schedule_versions WHERE doctor_id = $1 FOR UPDATE`,
      [doctorId]
    );
    if (Number(version.rows[0]?.version || 1) !== expectedVersion) {
      const error = new Error('The calendar changed in another session. Reload before removing this change.') as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'SCHEDULE_VERSION_CONFLICT';
      throw error;
    }
    const result = await client.query(
      `UPDATE calendar_exceptions SET status = 'superseded', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (['custom_hours', 'add_extra_hours'].includes(existing.rows[0].override_type)) {
      const [effectiveSlots, activeAppointments, activeHolds] = await Promise.all([
        listSlotsWithDb(client, doctorId, exceptionDate),
        client.query(
          `SELECT id, start_time, end_time FROM appointments
           WHERE doctor_id = $1 AND appointment_date = $2
             AND status IN ('awaiting_payment', 'payment_pending', 'confirmed', 'checked_in')`,
          [doctorId, exceptionDate]
        ),
        client.query(
          `SELECT id, start_time, end_time FROM appointment_holds
           WHERE doctor_id = $1 AND appointment_date = $2
             AND status = 'active' AND expires_at > NOW()`,
          [doctorId, exceptionDate]
        ),
      ]);
      const isStillScheduled = (row: any) =>
        effectiveSlots.some(
          (slot) =>
            compactTime(slot.start_time) === compactTime(row.start_time) &&
            compactTime(slot.end_time) === compactTime(row.end_time)
        );
      const impactedAppointments = activeAppointments.rows.filter((row) => !isStillScheduled(row));
      const impactedHolds = activeHolds.rows.filter((row) => !isStillScheduled(row));
      if (impactedAppointments.length > 0 || impactedHolds.length > 0) {
        const error = new Error(
          `This change cannot be removed because it would leave ${impactedAppointments.length} appointment(s) and ${impactedHolds.length} active hold(s) outside the doctor's working hours.`
        ) as Error & { status?: number; code?: string };
        error.status = 409;
        error.code = 'SCHEDULE_REVERT_CONFLICT';
        throw error;
      }
    }

    const correlationId = crypto.randomUUID();
    await client.query(
      `UPDATE doctor_schedule_versions SET version = version + 1, updated_at = NOW() WHERE doctor_id = $1`,
      [doctorId]
    );
    await client.query(
      `INSERT INTO schedule_audit_events
       (doctor_id, actor_staff_id, action, before_state, reason, affected_dates, correlation_id)
       VALUES ($1, $2, 'schedule.change_superseded', $3, 'Removed by operator', ARRAY[$4::date], $5)`,
      [doctorId, actorStaffId || null, JSON.stringify(existing.rows[0]), exceptionDate, correlationId]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

type PackageOrderFilters = { status?: string; search?: string; cursor?: string; pageSize?: number };

function encodeOrderCursor(row: { created_at: unknown; id: string }): string {
  return Buffer.from(JSON.stringify([new Date(row.created_at as any).toISOString(), row.id])).toString('base64url');
}

function decodeOrderCursor(cursor?: string): [string, string] | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Array.isArray(value) || value.length !== 2 || !value.every((item) => typeof item === 'string')) return null;
    if (Number.isNaN(Date.parse(value[0])) || !/^[0-9a-f-]{36}$/i.test(value[1])) return null;
    return value as [string, string];
  } catch { return null; }
}

export async function listPackageOrders(filters: PackageOrderFilters = {}) {
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize || 25)));
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters.status) { values.push(filters.status); conditions.push(`po.status = $${values.length}`); }
  if (filters.search) {
    const normalized = filters.search.trim();
    values.push(`${normalized}%`);
    conditions.push(`(po.order_number ILIKE $${values.length} OR po.phone LIKE $${values.length} OR po.purchaser_name ILIKE $${values.length})`);
  }
  const decodedCursor = decodeOrderCursor(filters.cursor);
  if (filters.cursor && !decodedCursor) {
    const error = new Error('Invalid package order cursor') as Error & { status?: number; code?: string };
    error.status = 400; error.code = 'INVALID_CURSOR'; throw error;
  }
  if (decodedCursor) {
    values.push(decodedCursor[0], decodedCursor[1]);
    conditions.push(`(po.created_at, po.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`);
  }
  values.push(pageSize + 1);
  const result = await query(
    `SELECT po.id, po.order_number, po.purchaser_name, po.phone, po.preferred_date,
            po.total_amount, po.status, po.fulfilment_status, po.created_at,
            po.order_type, po.price_status,
            CASE WHEN po.order_type = 'custom_tests'
              THEN (SELECT COUNT(*)::int FROM custom_test_order_items ctoi WHERE ctoi.order_id = po.id)
              ELSE (SELECT COUNT(*)::int FROM package_order_items poi WHERE poi.order_id = po.id)
            END AS item_count,
            CASE WHEN po.order_type = 'custom_tests'
              THEN (SELECT ARRAY_AGG(ctoi.test_name_snapshot ORDER BY ctoi.sort_order) FROM custom_test_order_items ctoi WHERE ctoi.order_id = po.id)
              ELSE ARRAY[]::TEXT[]
            END AS test_names
     FROM package_orders po
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY po.created_at DESC, po.id DESC
     LIMIT $${values.length}`,
    values
  );
  const hasMore = result.rows.length > pageSize;
  const rows = result.rows.slice(0, pageSize).map((row) => ({
    ...row,
    phone: undefined,
    phone_masked: maskPhone(row.phone),
  }));
  return {
    data: rows,
    cursor: hasMore ? encodeOrderCursor(result.rows[pageSize - 1]) : null,
    filters: { status: filters.status || '', search: filters.search || '', pageSize },
    generatedAt: new Date().toISOString(),
  };
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

  const [webhooks, attempts, notifications, audits, refunds, exceptions] = await Promise.all([
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
    query(
      `SELECT id, 'refund' AS type, status, amount, currency, reason, requested_at AS created_at
       FROM payment_refunds WHERE payment_id = $1 ORDER BY requested_at DESC LIMIT 25`, [paymentId]
    ),
    query(
      `SELECT id, 'exception' AS type, exception_type AS action, status, severity, created_at
       FROM payment_exceptions WHERE payment_id = $1 ORDER BY created_at DESC LIMIT 25`, [paymentId]
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
    ...refunds.rows,
    ...exceptions.rows,
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
