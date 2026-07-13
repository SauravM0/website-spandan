export interface Doctor {
  id: string;
  name: string;
  slug: string;
  speciality: string;
  qualifications: string;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface PackageSummary {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  base_price: number;
  discounted_price: number | null;
  show_price_publicly: boolean;
  image_url: string | null;
  category: string;
  is_featured?: boolean;
  badge_text?: string | null;
  discount_label?: string | null;
  consultation_included?: boolean;
  fasting_required?: boolean;
  fasting_hours?: number | null;
  display_order: number;
  is_active: boolean;
}

export interface PackageDetail extends PackageSummary {
  description: string | null;
  prep_instructions: string | null;
  gallery_urls?: string[];
  test_category?: string | null;
  primary_doctor_id: string | null;
  tax_applicable?: boolean;
  tax_label?: string | null;
  tax_rate?: number;
  convenience_fee?: number;
  gateway_fee_policy?: string;
  purchase_status?: string;
  purchase_enabled?: boolean;
  available_days?: string[];
  date_optional?: boolean;
  blackout_dates?: string[];
  max_bookings_per_day?: number | null;
  preferred_date_required?: boolean;
  effective_from?: string | null;
  effective_until?: string | null;
  publication_status?: string;
  version: number;
  terms_text?: string | null;
  no_refund_text?: string | null;
  exclusions?: string | null;
  report_turnaround?: string | null;
  medical_disclaimer?: string | null;
  translations?: Record<string, unknown>;
  tests?: PackageTestSummary[];
}

export interface PackageTestSummary {
  id: string;
  test_name: string;
  test_category?: string | null;
  description?: string | null;
  sort_order: number;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  hold_id?: string;
}

export interface DoctorAvailability {
  date: string;
  slots: TimeSlot[];
}

export interface AppointmentHold {
  id: string;
  public_reference?: string;
  version: number;
  booking_state?: string;
  doctor_id: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  expires_at: string;
  status: string;
  fee_amount?: number;
  fee_currency?: 'INR';
  service_name?: string;
}

export interface Appointment {
  id: string;
  appointment_number: string | null;
  patient_id: string;
  doctor_id: string;
  appointment_type: string;
  consultation_mode: string;
  reason: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  amount_snapshot: number;
  tax_snapshot: number;
  fee_snapshot: number;
  payment_status: string;
}

export interface PackageOrder {
  id: string;
  order_number: string;
  contact_name: string | null;
  purchaser_name: string;
  phone: string;
  email: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  status: string;
  preferred_date: string | null;
  items?: PackageOrderItem[];
}

export interface PackageOrderItem {
  id: string;
  package_id: string;
  package_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Payment {
  id: string;
  internal_payment_number: string | null;
  order_id: string | null;
  appointment_id: string | null;
  provider: string;
  amount: number;
  status: string;
  merchant_transaction_id: string;
  provider_transaction_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface PaymentEvent {
  id: string;
  payment_id: string;
  event_type: string;
  processing_status: string;
  error: string | null;
  received_at: string;
}

export interface LeadEnquiry {
  id: string;
  patient_name: string;
  phone: string;
  email: string | null;
  preferred_date: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

export interface LeadDetail extends LeadEnquiry {
  doctor_id: string | null;
  package_id: string | null;
  referring_doctor_name: string | null;
  referring_doctor_phone: string | null;
  preferred_time_window: string | null;
  source_language: string;
  consent_given_at: string;
  history?: LeadStatusHistory[];
}

export interface LeadStatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_staff_id: string | null;
  changed_at: string;
}

export interface Notification {
  id: string;
  channel: string;
  template: string;
  destination: string;
  status: string;
  attempt_count: number;
  next_attempt_at: string | null;
  sent_at: string | null;
  error: string | null;
}

export interface DashboardMetrics {
  appointmentsToday: number;
  confirmedAppointments: number;
  awaitingPayment: number;
  checkedIn: number;
  completed: number;
  packagePurchases: number;
  paymentIssues: number;
  notificationFailures: number;
  expiredHolds: number;
  collectionsToday: number;
}

export type ActionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  priority: 'high' | 'medium' | 'normal';
};

export interface DashboardData {
  clinicDate: string;
  generatedAt: string;
  timezone: string;
  metrics: DashboardMetrics;
  actionItems: ActionItem[];
  todayAppointments: any[];
  paymentIssues: any[];
  notificationFailures: any[];
  warnings: string[];
}

export interface TodayQueueItem {
  id: string;
  patientName: string;
  time: string;
  doctorName: string;
  status: string;
}

export interface DashboardAlert {
  id: string;
  type: 'high' | 'medium' | 'normal';
  message: string;
  count?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  capabilities: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
  };
}
