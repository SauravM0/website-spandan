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
  appointment_type: z.enum(['new', 'follow_up']).optional(),
});

const billableServiceFields = z.object({
  code: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(120).transform(stripHtml),
  description: z.string().max(500).transform(stripHtml).nullable().optional(),
  category: z.enum(['consultation', 'counselling', 'diagnostic', 'other']),
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID').nullable().optional(),
  appointment_type: z.enum(['new', 'follow_up']).nullable().optional(),
  price: z.coerce.number().min(0).max(10000000).multipleOf(0.01),
  is_active: z.boolean().optional(),
  is_public: z.boolean().optional(),
  effective_from: dateSchema,
  change_reason: z.string().min(5).max(300).transform(stripHtml),
});

export const billableServiceCreateSchema = billableServiceFields;
export const billableServiceUpdateSchema = billableServiceFields.extend({
  expected_version: z.number().int().positive(),
});
export const billableServiceParamsSchema = z.object({
  id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
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
  expected_version: z.number().int().positive().optional(),
  consent: z.object({
    accepted: z.literal(true),
    purpose: z.literal('appointment_booking_and_payment'),
    version: z.string().min(3).max(100).transform(stripHtml),
    policy_version: z.string().min(3).max(100).transform(stripHtml),
    language: languageSchema,
  }),
  reception_notes: z.string().max(1000).transform(stripHtml).optional(),
});

export const bookingRecoverySchema = z.object({
  reference: z.string().min(8).max(120).transform(stripHtml),
  phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number'),
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

export const diagnosticTestFiltersSchema = z.object({
  search: z.string().max(100).transform(stripHtml).optional(),
  category: z.string().max(80).transform(stripHtml).optional(),
});

export const customTestOrderSchema = z.object({
  purchaser_name: z.string().min(2).max(100).transform(stripHtml),
  phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number'),
  email: z.string().email().optional(),
  preferred_date: dateSchema.optional(),
  clinical_notes: z.string().max(1000).transform(stripHtml).optional(),
  source_language: languageSchema.optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent must be exactly true' }) }),
  test_ids: z
    .array(z.string().regex(uuidRegex, 'Must be a valid UUID'))
    .min(1, 'Select at least one diagnostic test')
    .max(30, 'A custom package can contain up to 30 tests')
    .refine((ids) => new Set(ids).size === ids.length, 'Tests must not be duplicated'),
  patient: patientSchema,
});

export const diagnosticTestUpdateSchema = z.object({
  expected_version: z.number().int().positive(),
  price: z.coerce.number().min(0).max(1000000).multipleOf(0.01),
  price_confirmed: z.boolean(),
  is_active: z.boolean(),
  preparation_instructions: z.string().max(1000).transform(stripHtml).nullable().optional(),
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

const appointmentTransitionEvidenceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('online'),
    payment_id: z.string().regex(uuidRegex, 'Must be a valid payment UUID'),
  }),
  z.object({
    kind: z.literal('cash'),
    amount: z.number().positive().max(1_000_000),
    reference: z.string().trim().min(2).max(120).transform(stripHtml),
  }),
  z.object({
    kind: z.literal('waiver'),
    approval_reason: z.string().trim().min(10).max(500).transform(stripHtml),
  }),
]);

export const appointmentTransitionSchema = z.object({
  action: z.enum([
    'confirm',
    'check_in',
    'complete',
    'cancel',
    'mark_no_show',
    'mark_payment_failed',
  ]),
  expected_version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500).transform(stripHtml),
  evidence: appointmentTransitionEvidenceSchema.optional(),
});

export const appointmentRescheduleSchema = z.object({
  doctor_id: z.string().regex(uuidRegex, 'Must be a valid doctor UUID'),
  appointment_date: dateSchema,
  start_time: timeSchema,
  expected_version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500).transform(stripHtml),
  cancel_if_unavailable: z.boolean().optional().default(false),
});

export const adminPackageOrderFiltersSchema = z.object({
  status: z
    .enum([
      'submitted',
      'price_review',
      'awaiting_payment',
      'paid',
      'scheduled',
      'collection_pending',
      'processing',
      'ready',
      'fulfilled',
      'cancelled',
      'refund_pending',
      'refunded',
    ])
    .optional(),
  search: z.string().trim().max(120).transform(stripHtml).optional(),
  cursor: z.string().max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const packageOrderTransitionSchema = z.object({
  action: z.enum([
    'start_price_review',
    'request_payment',
    'schedule',
    'mark_collection_pending',
    'start_processing',
    'mark_ready',
    'fulfill',
    'cancel',
    'request_refund',
    'mark_refunded',
  ]),
  expected_version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500).transform(stripHtml),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
  fulfilment_notes: z.string().trim().max(1000).transform(stripHtml).optional(),
});

export const packageOrderAssignmentSchema = z.object({
  expected_version: z.number().int().positive(),
  due_at: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(500).transform(stripHtml),
});

export const packageOrderPriceConfirmationSchema = z.object({
  expected_version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500).transform(stripHtml),
  items: z
    .array(
      z.object({
        item_id: z.string().regex(uuidRegex, 'Must be a valid item UUID'),
        unit_price: z.number().positive().max(1_000_000),
      })
    )
    .min(1)
    .max(100),
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
  sort: z
    .enum(['date_desc', 'date_asc', 'updated_desc', 'updated_asc', 'amount_desc', 'amount_asc'])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminPaymentParamsSchema = z.object({
  id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

export const adminPaymentRefundSchema = z.object({
  amount: z.coerce.number().positive().multipleOf(0.01).max(10000000),
  reason: z.string().min(10).max(500).transform(stripHtml),
});

export const adminPaymentExceptionFiltersSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
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

export const calendarOverrideDeleteQuerySchema = z.object({
  expected_version: z.coerce.number().int().positive(),
});

export const scheduleConflictParamsSchema = z.object({
  id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

export const scheduleConflictResolutionSchema = z.object({
  resolutions: z
    .array(
      z.object({
        appointment_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
        resolution: z.enum(['keep', 'reschedule', 'approved_transfer', 'cancel_contact']),
        notes: z.string().min(3).max(500).transform(stripHtml),
      })
    )
    .min(1)
    .max(50),
});

export const scheduleConflictApplySchema = z.object({
  expected_version: z.number().int().positive(),
});

export const availabilityRuleWriteSchema = z
  .object({
    doctor_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
    weekday: z.number().int().min(0).max(6),
    closed: z.boolean(),
    start_time: timeSchema.optional(),
    end_time: timeSchema.optional(),
    slot_count: z.number().int().min(1).max(100).optional(),
    effective_from: dateSchema,
    effective_until: dateSchema.optional(),
    expected_version: z.number().int().positive(),
  })
  .refine(
    (value) => value.closed || Boolean(value.start_time && value.end_time && value.slot_count),
    {
      message: 'start_time, end_time, and slot_count are required for an open weekday',
      path: ['start_time'],
    }
  );

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
    slot_count: z.number().int().min(1).max(100).optional(),
    reason: z.string().min(3).max(120).transform(stripHtml),
    public_note: z.string().max(240).transform(stripHtml).optional(),
    internal_note: z.string().max(500).transform(stripHtml).optional(),
    expected_version: z.number().int().positive(),
  })
  .refine(
    (value) =>
      value.override_type === 'unavailable_whole_day' ||
      Boolean(value.start_time && value.end_time && value.slot_count),
    {
      message: 'start_time, end_time, and slot_count are required for open hours',
      path: ['start_time'],
    }
  );

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type AppointmentConfigInput = z.infer<typeof appointmentConfigSchema>;
