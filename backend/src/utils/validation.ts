import { z } from 'zod';

const indianPhoneRegex = /^(\+91)?[6-9]\d{9}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugRegex = /^[a-z0-9-]+$/;
const languageSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.split('-')[0] : value),
  z.enum(['en', 'hi', 'mr'], { errorMap: () => ({ message: 'Language must be en, hi, or mr' }) })
);

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export const enquirySchema = z.object({
  package_id: z.string().regex(uuidRegex, 'Must be a valid UUID').nullable().optional(),
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID').nullable().optional(),
  patient_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .transform(stripHtml),
  phone: z
    .string()
    .regex(
      indianPhoneRegex,
      'Must be a valid Indian phone number (10 digits, optional +91 prefix)'
    ),
  email: z.string().email('Must be a valid email address').nullable().optional(),
  referring_doctor_name: z.string().min(1).max(100).transform(stripHtml).nullable().optional(),
  referring_doctor_phone: z
    .string()
    .regex(indianPhoneRegex, 'Must be a valid Indian phone number')
    .nullable()
    .optional(),
  preferred_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
    .nullable()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val + 'T00:00:00Z');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Date must be today or in the future'),
  preferred_time_window: z.string().max(50).nullable().optional(),
  message: z.string().max(1000).transform(stripHtml).nullable().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent must be exactly true' }) }),
  language: languageSchema.optional(),
  source_language: languageSchema.optional(),
});

export const statusUpdateSchema = z.object({
  new_status: z.enum(['new', 'contacted', 'scheduled', 'completed', 'closed_no_response']),
  notes: z.string().max(1000).transform(stripHtml).optional(),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:mm or HH:mm:ss format');

export const availabilityQuerySchema = z
  .object({
    doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
    date: dateSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine((value) => Boolean(value.date || (value.from && value.to)), {
    message: 'Provide either date or from and to',
    path: ['date'],
  });

export const doctorAvailabilityParamsSchema = z.object({
  id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

export const slotHoldSchema = z.object({
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
  appointment_date: dateSchema,
  start_time: timeSchema,
  patient_phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number'),
});

const patientSchema = z.object({
  full_name: z.string().min(2).max(100).transform(stripHtml),
  phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number'),
  email: z.string().email().optional(),
  date_of_birth: dateSchema.optional(),
  age_years: z.number().int().min(0).max(130).optional(),
  gender: z.string().max(30).optional(),
  address: z.string().max(500).transform(stripHtml).optional(),
  guardian: z
    .object({
      full_name: z.string().min(2).max(100).transform(stripHtml),
      phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number'),
      relationship: z.string().max(50).transform(stripHtml).optional(),
    })
    .optional(),
});

export const appointmentSchema = z.object({
  hold_id: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
  appointment_date: dateSchema,
  start_time: timeSchema,
  appointment_type: z.enum(['new', 'follow_up']).optional(),
  patient: patientSchema,
  reception_notes: z.string().max(1000).transform(stripHtml).optional(),
});

export const packageOrderSchema = z.object({
  purchaser_name: z.string().min(2).max(100).transform(stripHtml),
  phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number'),
  email: z.string().email().optional(),
  preferred_date: dateSchema.optional(),
  source_language: languageSchema.optional(),
  items: z
    .array(
      z.object({
        package_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
        patient: patientSchema,
        quantity: z.number().int().min(1).max(20).optional(),
        preferred_date: dateSchema.optional(),
      })
    )
    .min(1)
    .max(20),
});

export const packageQuoteSchema = z.object({
  preferred_date: dateSchema.optional(),
  items: z
    .array(
      z.object({
        package_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
        quantity: z.number().int().min(1).max(20).optional(),
        preferred_date: dateSchema.optional(),
      })
    )
    .min(1)
    .max(20),
});

export const paymentCreateSchema = z
  .object({
    order_id: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
    appointment_id: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
  })
  .refine((value) => Boolean(value.order_id || value.appointment_id), {
    message: 'order_id or appointment_id is required',
    path: ['order_id'],
  });

export const appointmentConfigSchema = z
  .object({
    default_slot_minutes: z.number().int().min(30).max(30).optional(),
    minimum_booking_notice_minutes: z.number().int().min(0).max(1440).optional(),
    maximum_booking_horizon_days: z.number().int().min(1).max(180).optional(),
    hold_duration_minutes: z.number().int().min(5).max(1440).optional(),
    same_day_booking_allowed: z.boolean().optional(),
    cancellation_cutoff_hours: z.number().int().min(0).max(168).optional(),
    arrival_buffer_instructions: z.string().max(500).transform(stripHtml).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one appointment setting is required',
    path: ['request'],
  });

export const adminAppointmentFiltersSchema = z.object({
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
  status: z
    .enum([
      'awaiting_payment',
      'payment_pending',
      'confirmed',
      'checked_in',
      'completed',
      'cancelled',
      'no_show',
      'payment_failed',
    ])
    .optional(),
  source: z.enum(['public', 'admin']).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  search: z.string().max(120).transform(stripHtml).optional(),
  sort: z.enum(['date_desc', 'date_asc', 'created_desc', 'created_asc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminPaymentFiltersSchema = z.object({
  status: z
    .enum([
      'created',
      'pending',
      'success',
      'failed',
      'expired',
      'verification_required',
      'refunded',
      'disputed',
    ])
    .optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  search: z.string().max(120).transform(stripHtml).optional(),
  provider: z.string().max(40).transform(stripHtml).optional(),
  entity: z.enum(['appointment', 'package_order']).optional(),
  sort: z.enum(['date_desc', 'date_asc', 'updated_desc', 'updated_asc', 'amount_desc', 'amount_asc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminPaymentParamsSchema = z.object({
  id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

export const adminNotificationFiltersSchema = z.object({
  status: z
    .enum([
      'queued',
      'sending',
      'sent',
      'failed',
      'skipped_no_destination',
      'retrying',
      'permanent_failure',
      'manual_follow_up',
    ])
    .optional(),
  channel: z.string().max(40).transform(stripHtml).optional(),
  entity: z.enum(['appointment', 'package_order', 'payment']).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  search: z.string().max(120).transform(stripHtml).optional(),
  sort: z.enum(['date_desc', 'date_asc', 'updated_desc', 'updated_asc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminNotificationParamsSchema = z.object({
  id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

export const adminNotificationBulkRetrySchema = z.object({
  ids: z.array(z.string().regex(uuidRegex, 'Must be a valid UUID')).min(1).max(25),
});

export const adminNotificationDeadLetterSchema = z.object({
  reason: z.string().min(3).max(500).transform(stripHtml),
});

export const adminCalendarViewQuerySchema = z.object({
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
  from: dateSchema,
  to: dateSchema,
});

export const calendarOverrideBatchSchema = z
  .object({
    doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
    dates: z.array(dateSchema).min(1).max(31),
    override_type: z.enum([
      'unavailable_whole_day',
      'custom_hours',
      'block_time_range',
      'add_extra_hours',
    ]),
    start_time: timeSchema.optional(),
    end_time: timeSchema.optional(),
    reason: z.string().max(120).transform(stripHtml).optional(),
    public_note: z.string().max(240).transform(stripHtml).optional(),
    internal_note: z.string().max(500).transform(stripHtml).optional(),
    allow_conflicts: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.override_type === 'unavailable_whole_day' ||
      Boolean(value.start_time && value.end_time),
    {
      message: 'start_time and end_time are required for time-based overrides',
      path: ['start_time'],
    }
  );

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type AppointmentConfigInput = z.infer<typeof appointmentConfigSchema>;
