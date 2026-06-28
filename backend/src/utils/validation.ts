import { z } from 'zod';

const indianPhoneRegex = /^(\+91)?[6-9]\d{9}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugRegex = /^[a-z0-9-]+$/;

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export const enquirySchema = z.object({
  package_id: z.string().regex(uuidRegex, 'Must be a valid UUID'),
  patient_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .transform(stripHtml),
  phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number (10 digits, optional +91 prefix)'),
  email: z.string().email('Must be a valid email address').nullable().optional(),
  referring_doctor_name: z.string().min(1).max(100).transform(stripHtml).nullable().optional(),
  referring_doctor_phone: z.string().regex(indianPhoneRegex, 'Must be a valid Indian phone number').nullable().optional(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
    .nullable().optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val + 'T00:00:00Z');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Date must be today or in the future'),
  preferred_time_window: z.string().max(50).nullable().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent must be exactly true' }) }),
  language: z.enum(['en', 'hi', 'mr'], { errorMap: () => ({ message: 'Language must be en, hi, or mr' }) }),
});

export const statusUpdateSchema = z.object({
  new_status: z.enum(['new', 'contacted', 'scheduled', 'completed', 'closed_no_response']),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
