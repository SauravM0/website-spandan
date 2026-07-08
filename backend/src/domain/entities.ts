export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  doctor_id: string | null;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Doctor {
  id: string;
  name: string;
  slug: string;
  speciality: string;
  qualifications: string;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  discounted_price: number | null;
  show_price_publicly: boolean;
  prep_instructions: string | null;
  image_url: string | null;
  gallery_urls?: string[];
  category: string;
  test_category?: string | null;
  primary_doctor_id: string | null;
  display_order: number;
  is_active: boolean;
  is_featured?: boolean;
  tax_applicable?: boolean;
  tax_label?: string | null;
  tax_name?: string | null;
  tax_rate?: number;
  convenience_fee?: number;
  gateway_fee_policy?: string;
  purchase_status?: string;
  purchase_enabled?: boolean;
  badge_text?: string | null;
  discount_label?: string | null;
  available_days?: string[];
  date_optional?: boolean;
  blackout_dates?: string[];
  max_bookings_per_day?: number | null;
  preferred_date_required?: boolean;
  effective_start?: string | null;
  effective_end?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
  publication_status?: string;
  publish_status?: string | null;
  version: number;
  terms_text?: string | null;
  no_refund_text?: string | null;
  consultation_included?: boolean;
  fasting_required?: boolean;
  fasting_hours?: number | null;
  fasting_duration?: string | null;
  age_sex_applicability?: string | null;
  exclusions?: string | null;
  report_turnaround?: string | null;
  medical_disclaimer?: string | null;
  translations?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface PackageTest {
  id: string;
  package_id: string;
  test_name: string;
  test_category?: string | null;
  description?: string | null;
  sort_order: number;
  created_at: Date;
}

export interface AppointmentRequest {
  id: string;
  package_id: string | null;
  doctor_id: string | null;
  patient_name: string;
  phone: string;
  email: string | null;
  referring_doctor_name: string | null;
  referring_doctor_phone: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  message: string;
  status: string;
  version: number;
  archived_at?: Date | null;
  is_archived?: boolean;
  consent_given_at: Date;
  source_language: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeadStatusHistory {
  id: string;
  appointment_request_id: string;
  old_status: string | null;
  new_status: string;
  changed_by_staff_id: string | null;
  changed_at: Date;
}

export interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  exact_dob_known: boolean;
  age_years: number | null;
  age_months: number | null;
  age_days: number | null;
  gender: string | null;
  phone: string;
  email: string | null;
  address?: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  abha_number: string | null;
  aadhaar_last4: string | null;
  preferred_language: string;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

export interface PatientGuardian {
  id: string;
  patient_id: string;
  name: string;
  relation: string;
  phone: string | null;
  is_primary: boolean;
  created_at: Date;
}

export interface DoctorAvailabilityRule {
  id: string;
  doctor_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DoctorAvailabilityOverride {
  id: string;
  doctor_id: string | null;
  date: string;
  type: string;
  start_time: string | null;
  end_time: string | null;
  public_note: string | null;
  internal_note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentHold {
  id: string;
  patient_id: string | null;
  doctor_id: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  starts_at: Date | null;
  ends_at: Date | null;
  expires_at: Date;
  status: string;
  client_reference: string | null;
  patient_phone?: string;
  created_at: Date;
}

export interface Appointment {
  id: string;
  appointment_number: string | null;
  patient_id: string;
  doctor_id: string;
  hold_id: string | null;
  appointment_type: string;
  consultation_mode: string;
  reason: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  starts_at: Date | null;
  ends_at: Date | null;
  status: string;
  source: string;
  amount_snapshot: number;
  tax_snapshot: number;
  fee_snapshot: number;
  payment_status: string;
  reception_notes: string | null;
  created_by_staff_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PackageOrder {
  id: string;
  order_number: string;
  contact_patient_id: string | null;
  contact_name: string | null;
  purchaser_name: string;
  phone: string;
  email: string | null;
  preferred_language: string;
  source_language: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  tax_amount: number;
  gateway_fee: number;
  fee_amount: number;
  grand_total: number;
  total_amount: number;
  status: string;
  preferred_date: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PackageOrderItem {
  id: string;
  order_id: string;
  package_id: string;
  patient_id: string;
  package_name: string;
  package_name_snapshot: string | null;
  quantity: number;
  unit_price: number;
  base_price_snapshot: number | null;
  discounted_price_snapshot: number | null;
  tax_rate_snapshot: number;
  tax_amount: number;
  fee_amount: number;
  line_total: number;
  preparation_snapshot: string | null;
  created_at: Date;
}

export interface Payment {
  id: string;
  internal_payment_number: string | null;
  order_id: string | null;
  appointment_id: string | null;
  provider: string;
  mode: string | null;
  payment_method: string | null;
  amount: number;
  gateway_fee: number;
  status: string;
  merchant_order_id: string | null;
  merchant_transaction_id: string;
  provider_transaction_id: string | null;
  provider_reference: string | null;
  provider_state: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: Date;
  paid_at: Date | null;
  updated_at: Date;
}

export interface PaymentEvent {
  id: string;
  payment_id: string;
  event_type: string;
  provider_event_id: string | null;
  payload_redacted: Record<string, unknown>;
  payload_hash: string;
  received_at: Date;
  processed_at: Date | null;
  processing_status: string;
  error: string | null;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  pdf_url: string | null;
  pdf_storage_key: string | null;
  checksum: string | null;
  issued_at: Date | null;
  voided_at: Date | null;
  void_reason: string | null;
}

export interface NotificationOutbox {
  id: string;
  patient_id: string | null;
  appointment_id: string | null;
  order_id: string | null;
  payment_id: string | null;
  channel: string;
  template: string;
  destination: string;
  language: string;
  payload: Record<string, unknown>;
  status: string;
  attempt_count: number;
  next_attempt_at: Date;
  sent_at: Date | null;
  error: string | null;
}

export interface MediaAsset {
  id: string;
  type: string;
  title: string;
  alt_text: string | null;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: Date;
}

export interface AuditEvent {
  id: string;
  actor_staff_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_redacted: Record<string, unknown> | null;
  after_redacted: Record<string, unknown> | null;
  created_at: Date;
  ip_hash: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  excerpt: string;
  language: string;
  translation_group_id: string | null;
  cover_image_url: string | null;
  youtube_video_url: string | null;
  author_doctor_id: string | null;
  reviewer_staff_id?: string | null;
  reviewer_display_name?: string | null;
  reviewed_at?: Date | null;
  read_time_minutes?: number;
  content_format?: string;
  content_status?: string;
  withdrawn_at?: Date | null;
  category: string;
  tags: string[];
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicArticle extends Article {
  author_doctor_name: string | null;
  author_doctor_slug: string | null;
  author_doctor_speciality: string | null;
}

export interface LeadFilters {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
