import type {
  Doctor,
  PackageSummary,
  PackageDetail,
  PackageTestSummary,
  DashboardData,
  AppointmentHold,
  Appointment,
  LeadEnquiry,
  LeadDetail,
  Notification,
  PaginatedResponse,
  AdminUser,
} from './types';
import { BROWSER_API_BASE, browserApiUrl } from './apiUrl';

const API_URL = BROWSER_API_BASE;
const DEFAULT_GET_CACHE_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 30_000;

type ApiErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        fieldErrors?: Record<string, string[]>;
      };
  message?: string;
  requestId?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    if (payload?.error && typeof payload.error === 'object') {
      this.code = payload.error.code;
      this.fieldErrors = payload.error.fieldErrors;
    }
  }
}

export function publicPaymentErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'PAYMENT_PROVIDER_DISABLED') return null;
  return 'Online payment is temporarily unavailable. Your request was saved; please contact the clinic to arrange payment.';
}

function apiErrorMessage(payload: ApiErrorPayload, status: number): string {
  if (typeof payload.error === 'string') return payload.error;

  const firstFieldError = payload.error?.fieldErrors
    ? Object.values(payload.error.fieldErrors).flat()[0]
    : undefined;
  if (firstFieldError) return firstFieldError;

  if (payload.error?.message) return payload.error.message;
  if (payload.message) return payload.message;
  return `HTTP ${status}`;
}

export function timeoutSignal(ms = DEFAULT_TIMEOUT_MS): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(new DOMException('Request timed out', 'TimeoutError')), ms);
  return ctrl.signal;
}

export function idempotencyKey(): string {
  return crypto.randomUUID();
}

async function safeRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      if (err instanceof ApiError && err.status < 500) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** attempt));
    }
  }
  throw new Error('Unreachable');
}

function handleAuthFailure(endpoint: string, status: number) {
  if (typeof window === 'undefined') return;
  if (status !== 401) return;
  if (!(endpoint.startsWith('/admin/') || endpoint === '/auth/me')) return;
  if (window.location.pathname === '/admin/login') return;
  window.location.replace('/admin/login');
}

// Cache the CSRF token
let csrfTokenPromise: Promise<string> | null = null;
const getCache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_URL}/csrf-token`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  return data.csrfToken;
}

function getCsrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().catch((err) => {
      csrfTokenPromise = null;
      throw err;
    });
  }
  return csrfTokenPromise;
}

function waitForStepUp(): Promise<void> {
  if (typeof window === 'undefined')
    return Promise.reject(new Error('Step-up requires a browser.'));
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('Step-up timed out.')), 120_000);
    const completed = () => finish();
    const cancelled = () => finish(new Error('Step-up was cancelled.'));
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      window.removeEventListener('admin-step-up-complete', completed);
      window.removeEventListener('admin-step-up-cancelled', cancelled);
      if (error) reject(error);
      else resolve();
    };
    window.addEventListener('admin-step-up-complete', completed, { once: true });
    window.addEventListener('admin-step-up-cancelled', cancelled, { once: true });
    window.dispatchEvent(new Event('admin-step-up-required'));
  });
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit & { signal?: AbortSignal },
  allowStepUpRetry = true
): Promise<T> {
  const { headers, ...restOptions } = options || {};
  const method = String(restOptions.method || 'GET').toUpperCase();
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const csrfToken = unsafe ? await getCsrfToken() : undefined;
  const isSensitiveGet = endpoint.startsWith('/auth/') || endpoint.startsWith('/admin/');
  const cacheKey =
    method === 'GET' && !isSensitiveGet ? `${endpoint}|${JSON.stringify(headers || {})}` : '';
  const cached = cacheKey ? getCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...headers,
    },
  });

  const promise = (async () => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      if (
        allowStepUpRetry &&
        endpoint !== '/auth/step-up' &&
        res.status === 403 &&
        error?.error?.code === 'STEP_UP_REQUIRED'
      ) {
        await waitForStepUp();
        return fetchAPI<T>(endpoint, options, false);
      }
      handleAuthFailure(endpoint, res.status);
      throw new ApiError(apiErrorMessage(error, res.status), res.status, error);
    }

    return res.json();
  })();

  if (cacheKey) {
    getCache.set(cacheKey, {
      expiresAt: Date.now() + DEFAULT_GET_CACHE_MS,
      promise,
    });
    promise.catch(() => getCache.delete(cacheKey));
  }

  return promise;
}

function authHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearApiCache(endpointPrefix?: string) {
  if (!endpointPrefix) {
    getCache.clear();
    return;
  }
  Array.from(getCache.keys()).forEach((key) => {
    if (key.startsWith(endpointPrefix)) getCache.delete(key);
  });
}

export async function getDoctors(activeOnly = true) {
  return fetchAPI<{ doctors: Doctor[] }>(`/doctors${activeOnly ? '' : '?all=true'}`);
}

export async function getDoctorBySlug(slug: string) {
  return fetchAPI<{ doctor: Doctor }>(`/doctors/${slug}`);
}

export async function getPackages(_activeOnly = true) {
  return fetchAPI<{ packages: PackageSummary[] }>('/packages');
}

export async function getPackageCommerceCatalog() {
  return fetchAPI<{ packages: PackageSummary[] }>('/package-orders/catalog');
}

export type DiagnosticTest = {
  id: string;
  source_number: number;
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  price: number;
  price_confirmed: boolean;
  preparation_instructions: string | null;
  sample_type: string | null;
  report_turnaround: string | null;
  requires_clinic_confirmation: boolean;
};

export async function getDiagnosticTests(filters: { search?: string; category?: string } = {}) {
  return fetchAPI<{ tests: DiagnosticTest[]; categories: string[]; total: number }>(
    `/diagnostic-tests${toQuery(filters)}`
  );
}

export async function createCustomTestOrder(data: {
  purchaser_name: string;
  phone: string;
  email?: string;
  preferred_date?: string;
  clinical_notes?: string;
  source_language?: 'en' | 'hi' | 'mr';
  consent: true;
  test_ids: string[];
  patient: {
    full_name: string;
    phone: string;
    email?: string;
    age_years?: number;
    gender?: string;
  };
}) {
  clearApiCache('/admin/operations/package-orders');
  return fetchAPI<{
    order: {
      id: string;
      order_number: string;
      status: string;
      price_status: 'pending' | 'confirmed';
      total_amount: number;
      test_count: number;
      payment_required: boolean;
    };
    message: string;
  }>('/custom-test-orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}

export type AdminDiagnosticTest = DiagnosticTest & {
  is_active: boolean;
  version: number;
  display_order: number;
  updated_at: string;
};

export async function getAdminDiagnosticTests(
  filters: { search?: string; category?: string } = {}
) {
  return fetchAPI<{ tests: AdminDiagnosticTest[] }>(`/admin/diagnostic-tests${toQuery(filters)}`);
}

export async function updateAdminDiagnosticTest(
  id: string,
  data: {
    expected_version: number;
    price: number;
    price_confirmed: boolean;
    is_active: boolean;
    preparation_instructions?: string | null;
  }
) {
  clearApiCache('/admin/diagnostic-tests');
  clearApiCache('/diagnostic-tests');
  return fetchAPI<{ test: AdminDiagnosticTest }>(
    `/admin/diagnostic-tests/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function getFeaturedPackages() {
  return fetchAPI<{ packages: PackageSummary[] }>('/packages/featured');
}

export async function getPackageBySlug(slug: string) {
  return fetchAPI<{ package: PackageDetail; tests: PackageTestSummary[] }>(`/packages/${slug}`);
}

export async function getArticles(publishedOnly = true) {
  return fetchAPI<{ articles: any[] }>(`/articles${publishedOnly ? '' : '?all=true'}`);
}

export async function getArticleBySlug(slug: string) {
  return fetchAPI<{ article: any }>(`/articles/${slug}`);
}

export async function submitEnquiry(data: {
  patient_name: string;
  phone: string;
  email?: string;
  package_id?: string;
  doctor_id?: string;
  message?: string;
  preferred_time_window?: string;
  preferred_date?: string;
  referring_doctor_name?: string;
  consent: boolean;
  language?: string;
  source_language?: string;
}) {
  return fetchAPI<{ enquiry: any; reference_id?: string }>('/enquiries', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey(),
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
}

export async function submitPrivacyRightsRequest(data: {
  request_type:
    | 'access'
    | 'correction'
    | 'consent_withdrawal'
    | 'export'
    | 'deletion'
    | 'restriction'
    | 'complaint';
  requester_name: string;
  contact_email?: string;
  contact_phone?: string;
  relationship: 'self' | 'parent_guardian' | 'authorised_proxy' | 'other';
  request_details: string;
}) {
  return fetchAPI<{ request: { reference_number: string; status: string }; message: string }>(
    '/privacy/rights-requests',
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify(data) }
  );
}

export async function getAdminPackages(token = '') {
  return fetchAPI<{ packages: any[] }>('/admin/packages', {
    headers: authHeaders(token),
  });
}

export async function getAdminPackagesFiltered(
  token: string | undefined,
  filters: {
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return fetchAPI<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/admin/packages${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
}

export async function getAdminPackageDetail(token: string | undefined, id: string) {
  return fetchAPI<{ package: any }>(`/admin/packages/${encodeURIComponent(id)}`, {
    headers: authHeaders(token),
  });
}

export async function updateAdminPackage(
  token: string | undefined,
  id: string,
  data: Record<string, unknown>,
  expectedVersion: number
) {
  clearApiCache('/admin/packages');
  return fetchAPI<{ package: any }>(`/admin/packages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ ...data, expected_version: expectedVersion }),
  });
}

export async function login(email: string, password: string) {
  return fetchAPI<{
    mfa: {
      required: true;
      challenge_id: string;
      expires_at: string;
      enrollment_required: boolean;
      secret?: string;
      otpauth_uri?: string;
    };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyAdminMfa(
  challengeId: string,
  input: { code?: string; recovery_code?: string }
) {
  return fetchAPI<{ user: AdminUser; recovery_codes?: string[] }>('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId, ...input }),
  });
}

export async function stepUpAdmin(input: { code?: string; recovery_code?: string }) {
  return fetchAPI<{ success: boolean; valid_for_seconds: number }>('/auth/step-up', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getAdminSessions() {
  return fetchAPI<{ sessions: Array<Record<string, unknown>> }>('/auth/sessions');
}

export async function revokeAdminSession(id: string, reason: string) {
  return fetchAPI<{ success: boolean; current_session_revoked: boolean }>(
    `/auth/sessions/${encodeURIComponent(id)}/revoke`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  return fetchAPI<{ success: boolean; sessions_revoked: boolean }>('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function logout() {
  return fetchAPI<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getAdminSession() {
  return fetchAPI<{ user: AdminUser }>('/auth/me');
}

export async function getPrivacyRightsRequests(status?: string) {
  return fetchAPI<{ data: any[]; cursor: string | null }>(
    `/admin/privacy-security/rights-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`
  );
}
export async function updatePrivacyRightsRequest(
  id: string,
  data: {
    expected_version: number;
    status: string;
    confirm_identity_verified?: boolean;
    decision_notes?: string;
    legal_hold?: boolean;
  }
) {
  clearApiCache('/admin/privacy-security/rights-requests');
  return fetchAPI<{ request: any }>(
    `/admin/privacy-security/rights-requests/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
}

export async function getEnquiries(
  token = '',
  filters: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    search?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const res = await fetchAPI<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/admin/leads${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
  return { enquiries: res.data, pagination: res };
}

export async function getEnquiryById(token: string | undefined, id: string) {
  const res = await fetchAPI<{
    lead: any;
    history: any[];
    notes: any[];
    allowed_actions: string[];
    version: number;
  }>(`/admin/leads/${id}`, {
    headers: authHeaders(token),
  });
  return {
    enquiry: res.lead,
    history: res.history || [],
    notes: res.notes || [],
    allowedActions: res.allowed_actions || [],
    version: res.version || 1,
  };
}

export async function updateEnquiryStatus(
  token: string | undefined,
  id: string,
  status: string,
  notes?: string,
  expectedVersion?: number
) {
  clearApiCache('/admin/leads');
  return fetchAPI<{ success: boolean; version: number }>(`/admin/leads/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({
      new_status: status,
      notes,
      expected_version: expectedVersion,
    }),
  });
}

export async function getAppointmentSlots(doctorId: string, date: string) {
  return fetchAPI<{ slots: any[] }>(
    `/appointments/slots?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`
  );
}

export async function getDoctorAvailability(doctorId: string, from: string, to: string) {
  return fetchAPI<{
    availability: Record<string, any[]>;
    days: Record<
      string,
      {
        date: string;
        status: 'open' | 'closed' | 'fully_booked' | 'past' | 'booking_not_open' | 'booking_closed';
        total_slots: number;
        available_slots: number;
        opening_time: string | null;
        closing_time: string | null;
      }
    >;
    timezone: string;
  }>(
    `/public/doctors/${encodeURIComponent(doctorId)}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export type PublicAppointmentConfig = {
  clinic_timezone: string;
  clinic_date: string;
  fee: number;
  currency: 'INR';
  service: { id: string; code: string; name: string; version: number };
  policy_version: string;
  consent_version: string;
  minimum_booking_notice_minutes: number;
  maximum_booking_horizon_days: number;
  hold_duration_minutes: number;
  arrival_buffer_instructions: string;
};

export async function getPublicAppointmentConfig(doctorId?: string, appointmentType?: string) {
  return fetchAPI<{ config: PublicAppointmentConfig }>(
    `/public/appointments/config${toQuery({ doctor_id: doctorId, appointment_type: appointmentType })}`
  );
}

export async function createAppointmentHold(data: {
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  patient_phone: string;
  appointment_type?: 'new' | 'follow_up';
}) {
  clearApiCache('/appointments');
  return fetchAPI<{ hold: AppointmentHold }>('/appointments/holds', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}

export async function bookAppointment(data: any) {
  clearApiCache('/admin/operations');
  clearApiCache('/appointments');
  return fetchAPI<{ appointment: Appointment }>('/appointments', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}

export async function createPackageOrder(data: any) {
  clearApiCache('/admin/operations');
  return fetchAPI<{ order: any }>('/package-orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}

export async function quotePackageOrder(data: {
  preferred_date?: string;
  items: Array<{ package_id: string; quantity?: number; preferred_date?: string }>;
}) {
  return fetchAPI<{ quote: any }>('/package-orders/quote', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createPayment(data: { order_id?: string; appointment_id?: string }) {
  clearApiCache('/admin/operations/payments');
  return fetchAPI<{ payment: any }>('/payments/create', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}

export async function getPaymentStatus(capability: string) {
  return fetchAPI<{ payment: any }>(`/public/payments/status/${encodeURIComponent(capability)}`);
}

export async function recoverAppointment(reference: string, phone: string) {
  return fetchAPI<{
    booking: {
      reference: string;
      state: string;
      expires_at: string;
      appointment_number: string | null;
      payment_status: string | null;
    };
  }>('/public/appointments/recover', {
    method: 'POST',
    body: JSON.stringify({ reference, phone }),
  });
}

export async function emailReceipt(capability: string) {
  return fetchAPI<{ receipt: any }>(`/public/receipts/${encodeURIComponent(capability)}/email`, {
    method: 'POST',
  });
}

export function getBackendAssetUrl(path?: string | null) {
  if (!path) return '';
  return browserApiUrl(path);
}

export async function getAdminDashboard(token = '') {
  return fetchAPI<{ dashboard: DashboardData }>('/admin/operations/dashboard', {
    headers: authHeaders(token),
  });
}

export type AppointmentSettings = {
  default_slot_minutes: number;
  minimum_booking_notice_minutes: number;
  maximum_booking_horizon_days: number;
  hold_duration_minutes: number;
  same_day_booking_allowed: boolean;
  cancellation_cutoff_hours: number;
  arrival_buffer_instructions: string;
};

export async function getAdminAppointmentSettings(token = '') {
  return fetchAPI<{ settings: AppointmentSettings; warnings: string[] }>(
    '/admin/operations/appointment-settings',
    {
      headers: authHeaders(token),
    }
  );
}

export async function updateAdminAppointmentSettings(
  token: string | undefined,
  data: Partial<AppointmentSettings>
) {
  clearApiCache('/admin/operations/appointment-settings');
  return fetchAPI<{ settings: AppointmentSettings; warnings: string[] }>(
    '/admin/operations/appointment-settings',
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }
  );
}

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getAdminAppointments(
  token = '',
  filters: {
    doctor_id?: string;
    status?: string;
    source?: string;
    from?: string;
    to?: string;
    search?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return fetchAPI<PaginatedResponse<Appointment>>(
    `/admin/operations/appointments${toQuery(filters)}`,
    {
      headers: authHeaders(token),
    }
  );
}

export async function getAdminAvailabilityRules(token = '', filters: { doctor_id?: string } = {}) {
  return fetchAPI<{ rules: any[] }>(`/admin/operations/availability-rules${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
}

export async function createAdminAvailabilityRule(token: string | undefined, data: any) {
  clearApiCache('/admin/operations/availability-rules');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ rule: any }>('/admin/operations/availability-rules', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function getAdminCalendarOverrides(
  token = '',
  filters: { doctor_id?: string; from?: string; to?: string } = {}
) {
  return fetchAPI<{ overrides: any[] }>(`/admin/operations/calendar-overrides${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
}

export async function getAdminCalendarView(
  token = '',
  filters: { doctor_id: string; from: string; to: string }
) {
  return fetchAPI<{ calendar: any }>(`/admin/operations/calendar-view${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
}

export async function createAdminCalendarOverride(token: string | undefined, data: any) {
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ override: any }>('/admin/operations/calendar-overrides', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function createAdminCalendarOverridesBatch(token: string | undefined, data: any) {
  clearApiCache('/admin/operations/calendar-view');
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{
    created: any[];
    skipped: any[];
    conflicted: Array<{ date: string; appointment_count: number }>;
    requiresResolution: boolean;
    conflictCase?: any;
    version: number;
  }>('/admin/operations/calendar-overrides/batch', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCalendarOverride(
  token: string | undefined,
  id: string,
  expectedVersion: number
) {
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ override: any }>(
    `/admin/operations/calendar-overrides/${encodeURIComponent(id)}?expected_version=${expectedVersion}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  );
}

export async function getAdminScheduleConflict(token: string | undefined, id: string) {
  return fetchAPI<{ conflictCase: any }>(
    `/admin/operations/schedule-conflicts/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) }
  );
}

export async function resolveAdminScheduleConflict(
  token: string | undefined,
  id: string,
  resolutions: Array<{ appointment_id: string; resolution: string; notes: string }>
) {
  clearApiCache('/admin/operations/calendar-view');
  return fetchAPI<{ conflictCase: any }>(
    `/admin/operations/schedule-conflicts/${encodeURIComponent(id)}/resolutions`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ resolutions }),
    }
  );
}

export async function applyAdminScheduleConflict(
  token: string | undefined,
  id: string,
  expectedVersion: number
) {
  clearApiCache('/admin/operations/calendar-view');
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/appointments/slots');
  clearApiCache('/public/doctors');
  return fetchAPI<any>(`/admin/operations/schedule-conflicts/${encodeURIComponent(id)}/apply`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ expected_version: expectedVersion }),
  });
}

export type AppointmentTransitionEvidence =
  | { kind: 'online'; payment_id: string }
  | { kind: 'cash'; amount: number; reference: string }
  | { kind: 'waiver'; approval_reason: string };

export async function transitionAdminAppointment(
  token: string | undefined,
  id: string,
  input: {
    action: string;
    expected_version: number;
    reason: string;
    evidence?: AppointmentTransitionEvidence;
  }
) {
  clearApiCache('/admin/operations');
  clearApiCache('/appointments/slots');
  clearApiCache('/public/doctors');
  return fetchAPI<{ appointment: any }>(
    `/admin/operations/appointments/${encodeURIComponent(id)}/transitions`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(input),
    }
  );
}

export async function rescheduleAdminAppointment(
  token: string | undefined,
  id: string,
  input: {
    doctor_id: string;
    appointment_date: string;
    start_time: string;
    expected_version: number;
    reason: string;
    cancel_if_unavailable?: boolean;
  }
) {
  clearApiCache('/admin/operations');
  clearApiCache('/appointments/slots');
  clearApiCache('/public/doctors');
  return fetchAPI<{ appointment: any }>(
    `/admin/operations/appointments/${encodeURIComponent(id)}/reschedule`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(input),
    }
  );
}

export async function getAdminPackageOrders(
  token = '',
  filters: { status?: string; search?: string; cursor?: string; pageSize?: number } = {},
  signal?: AbortSignal
) {
  return fetchAPI<{ data: any[]; cursor: string | null; filters: any; generatedAt: string }>(
    `/admin/operations/package-orders${toQuery(filters)}`,
    {
      headers: authHeaders(token),
      signal,
    }
  );
}

export async function getAdminPackageOrderDetail(token: string | undefined, id: string) {
  return fetchAPI<{ order: any; items: any[]; timeline: any[] }>(
    `/admin/operations/package-orders/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) }
  );
}

export async function transitionAdminPackageOrder(
  token: string | undefined,
  id: string,
  input: {
    action: string;
    expected_version: number;
    reason: string;
    scheduled_for?: string;
    fulfilment_notes?: string;
  }
) {
  clearApiCache('/admin/operations/package-orders');
  return fetchAPI<{ order: any }>(
    `/admin/operations/package-orders/${encodeURIComponent(id)}/transitions`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(input),
    }
  );
}

export async function assignAdminPackageOrder(
  token: string | undefined,
  id: string,
  input: { expected_version: number; due_at: string; reason: string }
) {
  clearApiCache('/admin/operations/package-orders');
  return fetchAPI<{ order: any }>(
    `/admin/operations/package-orders/${encodeURIComponent(id)}/assign`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(input),
    }
  );
}

export async function confirmAdminPackageOrderPrice(
  token: string | undefined,
  id: string,
  input: {
    expected_version: number;
    reason: string;
    items: Array<{ item_id: string; unit_price: number }>;
  }
) {
  clearApiCache('/admin/operations/package-orders');
  return fetchAPI<{ order: any }>(
    `/admin/operations/package-orders/${encodeURIComponent(id)}/price-confirmation`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(input),
    }
  );
}

export async function getAdminPayments(
  token: string | undefined,
  filters: {
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    provider?: string;
    entity?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return fetchAPI<{ payments: any[]; pagination?: any; summary?: any }>(
    `/admin/operations/payments${toQuery(filters)}`,
    {
      headers: authHeaders(token),
    }
  );
}

export type BillableService = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: 'consultation' | 'counselling' | 'diagnostic' | 'other';
  doctor_id: string | null;
  doctor_name: string | null;
  appointment_type: 'new' | 'follow_up' | null;
  price: number | string;
  currency: 'INR';
  is_active: boolean;
  is_public: boolean;
  effective_from: string;
  version: number;
  change_reason: string;
  price_history: any[];
};

export type BillableServiceInput = {
  code: string;
  name: string;
  description?: string | null;
  category: BillableService['category'];
  doctor_id?: string | null;
  appointment_type?: BillableService['appointment_type'];
  price: number;
  is_active: boolean;
  is_public: boolean;
  effective_from: string;
  change_reason: string;
};

export async function getAdminServicePricing() {
  return fetchAPI<{ services: BillableService[] }>('/admin/operations/service-pricing');
}

export async function createAdminServicePrice(data: BillableServiceInput) {
  clearApiCache('/admin/operations/service-pricing');
  return fetchAPI<{ service: BillableService }>('/admin/operations/service-pricing', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminServicePrice(
  id: string,
  data: BillableServiceInput & { expected_version: number }
) {
  clearApiCache('/admin/operations/service-pricing');
  return fetchAPI<{ service: BillableService }>(
    `/admin/operations/service-pricing/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
}

export async function getAdminPaymentDetail(token: string | undefined, id: string) {
  return fetchAPI<{ payment: any; events: any[] }>(
    `/admin/operations/payments/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) }
  );
}

export async function recheckAdminPayment(token: string | undefined, id: string) {
  clearApiCache('/admin/operations/payments');
  return fetchAPI<{ payment: any; events: any[] }>(
    `/admin/operations/payments/${encodeURIComponent(id)}/recheck`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
}

export async function requestAdminPaymentRefund(
  token: string | undefined,
  id: string,
  amount: number,
  reason: string
) {
  clearApiCache('/admin/operations/payments');
  return fetchAPI<{ refund: any; message: string }>(
    `/admin/operations/payments/${encodeURIComponent(id)}/refunds`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify({ amount, reason }),
    }
  );
}

export async function downloadAdminExport(
  token: string | undefined,
  kind: 'appointments' | 'payments',
  filters: Record<string, string | undefined> = {}
) {
  const res = await fetch(`${API_URL}/admin/operations/${kind}/export${toQuery(filters)}`, {
    credentials: 'include',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Export failed with HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${kind}-export.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function getAdminNotifications(
  token = '',
  filters: {
    status?: string;
    channel?: string;
    entity?: string;
    from?: string;
    to?: string;
    search?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return fetchAPI<{ notifications: any[]; pagination?: any; summary?: any }>(
    `/admin/operations/notifications${toQuery(filters)}`,
    {
      headers: authHeaders(token),
    }
  );
}

export async function getAdminNotificationDetail(token: string | undefined, id: string) {
  return fetchAPI<{ notification: any; history: any[] }>(
    `/admin/operations/notifications/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) }
  );
}

export async function retryAdminNotification(token: string | undefined, id: string) {
  clearApiCache('/admin/operations/notifications');
  return fetchAPI<{ notification: any }>(
    `/admin/operations/notifications/${encodeURIComponent(id)}/retry`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
}

export async function bulkRetryAdminNotifications(token: string | undefined, ids: string[]) {
  clearApiCache('/admin/operations/notifications');
  return fetchAPI<{
    results: Array<{ id: string; ok: boolean; notification?: any; message?: string }>;
  }>('/admin/operations/notifications/bulk-retry', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ ids }),
  });
}

export async function deadLetterAdminNotification(
  token: string | undefined,
  id: string,
  reason: string
) {
  clearApiCache('/admin/operations/notifications');
  return fetchAPI<{ notification: any }>(
    `/admin/operations/notifications/${encodeURIComponent(id)}/dead-letter`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }
  );
}

export async function getIntakeInvitation(token: string) {
  return fetchAPI<{ invitation: any }>(`/intake/${encodeURIComponent(token)}`);
}
export async function startIntakeVerification(token: string) {
  return fetchAPI<{ verification: any }>(`/intake/${encodeURIComponent(token)}/verification`, {
    method: 'POST',
    body: '{}',
  });
}
export async function confirmIntakeVerification(
  token: string,
  verification_id: string,
  code: string
) {
  return fetchAPI<{ session: any }>(`/intake/${encodeURIComponent(token)}/verification/confirm`, {
    method: 'POST',
    body: JSON.stringify({ verification_id, code }),
  });
}
export async function getIntakeDraft(token: string, session: string) {
  return fetchAPI<{ draft: any }>(`/intake/${encodeURIComponent(token)}/draft`, {
    headers: { Authorization: `Bearer ${session}` },
  });
}
export async function saveIntakeDraft(
  token: string,
  session: string,
  expected_version: number,
  data: Record<string, unknown>
) {
  return fetchAPI<{ draft: any }>(`/intake/${encodeURIComponent(token)}/draft`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${session}` },
    body: JSON.stringify({ expected_version, data }),
  });
}
export async function submitIntake(token: string, session: string, expected_version: number) {
  return fetchAPI<{ submission: any }>(`/intake/${encodeURIComponent(token)}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session}` },
    body: JSON.stringify({ expected_version }),
  });
}
export async function createIntakeInvitation(data: Record<string, unknown>) {
  return fetchAPI<{ invitation: any }>('/admin/intake/invitations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function getIntakeReviews(status?: string) {
  return fetchAPI<{ data: any[]; pagination: any }>(
    `/admin/intake/reviews${status ? `?status=${encodeURIComponent(status)}` : ''}`
  );
}
export async function getIntakeReview(id: string) {
  return fetchAPI<{ review: any }>(`/admin/intake/reviews/${encodeURIComponent(id)}`);
}
export async function updateIntakeReview(id: string, data: Record<string, unknown>) {
  clearApiCache('/admin/intake');
  return fetchAPI<{ review: any }>(`/admin/intake/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function searchAdminPatients(search = '', cursor?: string) {
  return fetchAPI<{ data: any[]; cursor: string | null }>(
    `/admin/patients${toQuery({ search, cursor, page_size: 25 })}`
  );
}
export async function getAdminPatient(id: string, signal?: AbortSignal) {
  const patientId = encodeURIComponent(id);
  const [summary, appointments, clinical] = await Promise.all([
    fetchAPI<any>(`/admin/patients/${patientId}/summary`, { signal }),
    fetchAPI<any>(`/admin/patients/${patientId}/appointments`, { signal }),
    fetchAPI<any>(`/admin/patients/${patientId}/clinical/timeline`, { signal }),
  ]);
  return { ...summary, ...appointments, ...clinical };
}
export async function openPatientEncounter(patientId: string, data: Record<string, unknown>) {
  return fetchAPI<{ encounter: any }>(
    `/admin/patients/${encodeURIComponent(patientId)}/encounters`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}
export async function closePatientEncounter(id: string, expected_version: number) {
  return fetchAPI<{ encounter: any }>(
    `/admin/patients/encounters/${encodeURIComponent(id)}/close`,
    { method: 'POST', body: JSON.stringify({ expected_version }) }
  );
}
export async function createClinicalResource(patientId: string, data: Record<string, unknown>) {
  return fetchAPI<{ resource: any }>(`/admin/patients/${encodeURIComponent(patientId)}/resources`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}
export async function getPatientMedications(patientId: string) {
  return fetchAPI<{ medications: any[] }>(`/admin/medications/${encodeURIComponent(patientId)}`);
}
export async function reportPatientMedication(patientId: string, data: Record<string, unknown>) {
  return fetchAPI<{ medication: any }>(`/admin/medications/${encodeURIComponent(patientId)}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}
export async function reconcilePatientMedication(
  patientId: string,
  id: string,
  data: Record<string, unknown>
) {
  return fetchAPI<{ medication: any }>(
    `/admin/medications/${encodeURIComponent(patientId)}/${encodeURIComponent(id)}/reconcile`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify(data) }
  );
}
export async function getObservationCatalog() {
  return fetchAPI<{ catalog: any[] }>('/admin/observations/catalog');
}
export async function getPatientObservations(patientId: string) {
  return fetchAPI<{ data: any[]; cursor: string | null; writesEnabled: boolean }>(
    `/admin/observations/${encodeURIComponent(patientId)}`
  );
}
export async function recordPatientObservation(patientId: string, data: Record<string, unknown>) {
  return fetchAPI<{ observation: any }>(`/admin/observations/${encodeURIComponent(patientId)}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}
export async function reviewPatientObservation(
  patientId: string,
  id: string,
  data: Record<string, unknown>
) {
  return fetchAPI<{ observation: any }>(
    `/admin/observations/${encodeURIComponent(patientId)}/${encodeURIComponent(id)}/review`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify(data) }
  );
}
export type DeviceImportInput = {
  filename: string;
  content: string;
  unit: 'mg/dL' | 'mmol/L';
  timezone: 'Asia/Kolkata';
  context: 'fasting' | 'post_meal' | 'random' | 'other';
};
export async function getDeviceImports(patientId: string) {
  return fetchAPI<{ data: any[]; writesEnabled: boolean }>(
    `/admin/device-integrations/${encodeURIComponent(patientId)}`
  );
}
export async function previewDeviceImport(patientId: string, data: DeviceImportInput) {
  return fetchAPI<any>(`/admin/device-integrations/${encodeURIComponent(patientId)}/preview`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  });
}
export async function commitDeviceImport(
  patientId: string,
  importId: string,
  data: DeviceImportInput
) {
  return fetchAPI<any>(
    `/admin/device-integrations/${encodeURIComponent(patientId)}/${encodeURIComponent(importId)}/commit`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: JSON.stringify(data) }
  );
}
export async function saveClinicalNote(patientId: string, data: Record<string, unknown>) {
  return fetchAPI<{ note: any }>(`/admin/patients/${encodeURIComponent(patientId)}/notes`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
export async function signClinicalNote(
  noteId: string,
  expected_version: number,
  confirm_patient_id: string
) {
  return fetchAPI<{ note: any }>(`/admin/patients/notes/${encodeURIComponent(noteId)}/sign`, {
    method: 'POST',
    body: JSON.stringify({ expected_version, confirm_patient_id }),
  });
}
export async function getMedicalDocuments(filters: Record<string, string | undefined> = {}) {
  return fetchAPI<{ data: any[]; cursor: string | null }>(`/admin/documents${toQuery(filters)}`);
}
export async function uploadMedicalDocument(metadata: Record<string, string>, file: File) {
  const csrf = await getCsrfToken();
  const res = await fetch(`${API_URL}/admin/documents/upload${toQuery(metadata)}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': file.type,
      'x-csrf-token': csrf,
      'Idempotency-Key': idempotencyKey(),
    },
    body: file,
    signal: timeoutSignal(60000),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new ApiError(apiErrorMessage(payload, res.status), res.status, payload);
  }
  return res.json();
}
export async function reviewMedicalDocument(
  id: string,
  expected_version: number,
  decision: 'review' | 'verify' | 'reject',
  notes: string
) {
  return fetchAPI<{ document: any }>(`/admin/documents/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify({ expected_version, decision, notes }),
  });
}
export async function downloadMedicalDocument(id: string, filename: string) {
  const res = await fetch(`${API_URL}/admin/documents/${encodeURIComponent(id)}/download`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Document is not available for download.');
  const url = URL.createObjectURL(await res.blob()),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
