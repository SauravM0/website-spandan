import type { Doctor, PackageSummary, PackageDetail, PackageTestSummary, DashboardData, AppointmentHold, Appointment, LeadEnquiry, LeadDetail, Notification, PaginatedResponse, AdminUser } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const DEFAULT_GET_CACHE_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 30_000;

type ApiErrorPayload = {
  error?: string | {
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

async function safeRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 500
): Promise<T> {
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

async function fetchAPI<T>(endpoint: string, options?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const { headers, ...restOptions } = options || {};
  const method = String(restOptions.method || 'GET').toUpperCase();
  const isSensitiveGet = endpoint.startsWith('/auth/') || endpoint.startsWith('/admin/');
  const cacheKey = method === 'GET' && !isSensitiveGet ? `${endpoint}|${JSON.stringify(headers || {})}` : '';
  const cached = cacheKey ? getCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  const promise = (async () => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
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
  const csrfToken = await getCsrfToken();
  csrfTokenPromise = null;
  return fetchAPI<{ enquiry: any; reference_id?: string }>('/enquiries', {
    method: 'POST',
    headers: {
      'x-csrf-token': csrfToken,
      'Idempotency-Key': idempotencyKey(),
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
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
  return fetchAPI<{ user: AdminUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  const csrfToken = await getCsrfToken();
  csrfTokenPromise = null;
  return fetchAPI<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    headers: {
      'x-csrf-token': csrfToken,
    },
  });
}

export async function getAdminSession() {
  return fetchAPI<{ user: AdminUser }>('/auth/me');
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
  const res = await fetchAPI<{ lead: any; history: any[]; notes: any[]; allowed_actions: string[]; version: number }>(`/admin/leads/${id}`, {
    headers: authHeaders(token),
  });
  return { enquiry: res.lead, history: res.history || [], notes: res.notes || [], allowedActions: res.allowed_actions || [], version: res.version || 1 };
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
  return fetchAPI<{ availability: Record<string, any[]> }>(
    `/public/doctors/${encodeURIComponent(doctorId)}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export type PublicAppointmentConfig = {
  clinic_timezone: string;
  clinic_date: string;
  fee: number;
  currency: 'INR';
  policy_version: string;
  consent_version: string;
  minimum_booking_notice_minutes: number;
  maximum_booking_horizon_days: number;
  hold_duration_minutes: number;
  arrival_buffer_instructions: string;
};

export async function getPublicAppointmentConfig() {
  return fetchAPI<{ config: PublicAppointmentConfig }>('/public/appointments/config');
}

export async function createAppointmentHold(data: {
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  patient_phone: string;
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

export async function quotePackageOrder(data: { preferred_date?: string; items: Array<{ package_id: string; quantity?: number; preferred_date?: string }> }) {
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

export async function getPaymentStatus(transactionId: string) {
  return fetchAPI<{ payment: any }>(`/payments/${encodeURIComponent(transactionId)}/status`);
}

export async function emailReceipt(receiptId: string, email?: string) {
  return fetchAPI<{ receipt: any }>(`/public/receipts/${encodeURIComponent(receiptId)}/email`, {
    method: 'POST',
    body: JSON.stringify(email ? { email } : {}),
  });
}

export function getBackendAssetUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/api') ? path.slice(4) : path}`;
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
  return fetchAPI<PaginatedResponse<Appointment>>(`/admin/operations/appointments${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
}

export async function getAdminAvailabilityRules(
  token = '',
  filters: { doctor_id?: string } = {}
) {
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
    requiresConfirmation: boolean;
  }>('/admin/operations/calendar-overrides/batch', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCalendarOverride(token: string | undefined, id: string) {
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ override: any }>(
    `/admin/operations/calendar-overrides/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  );
}

export async function updateAdminAppointmentStatus(token: string | undefined, id: string, status: string) {
  clearApiCache('/admin/operations');
  clearApiCache('/appointments/slots');
  clearApiCache('/public/doctors');
  return fetchAPI<{ appointment: any }>(
    `/admin/operations/appointments/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify({ status }),
    }
  );
}

export async function getAdminPackageOrders(token = '') {
  return fetchAPI<{ orders: any[] }>('/admin/operations/package-orders', {
    headers: authHeaders(token),
  });
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
  return fetchAPI<{ payments: any[]; pagination?: any; summary?: any }>(`/admin/operations/payments${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
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
  return fetchAPI<{ notifications: any[]; pagination?: any; summary?: any }>(`/admin/operations/notifications${toQuery(filters)}`, {
    headers: authHeaders(token),
  });
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
  return fetchAPI<{ results: Array<{ id: string; ok: boolean; notification?: any; message?: string }> }>(
    '/admin/operations/notifications/bulk-retry',
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ ids }),
    }
  );
}

export async function deadLetterAdminNotification(token: string | undefined, id: string, reason: string) {
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

/** Server component helper: GET with timeout, no auth or CSRF. */
export async function serverApiGet<T>(endpoint: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    next: { revalidate },
    signal: timeoutSignal(),
  });
  if (!res.ok) {
    throw new Error(`Server fetch failed: ${endpoint} (${res.status})`);
  }
  return res.json();
}
