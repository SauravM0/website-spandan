const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const DEFAULT_GET_CACHE_MS = 15_000;

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

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { headers, ...restOptions } = options || {};
  const method = String(restOptions.method || 'GET').toUpperCase();
  const cacheKey = method === 'GET' ? `${endpoint}|${JSON.stringify(headers || {})}` : '';
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
  return fetchAPI<{ doctors: any[] }>(`/doctors${activeOnly ? '' : '?all=true'}`);
}

export async function getDoctorBySlug(slug: string) {
  return fetchAPI<{ doctor: any }>(`/doctors/${slug}`);
}

export async function getPackages(_activeOnly = true) {
  return fetchAPI<{ packages: any[] }>('/packages');
}

export async function getPackageCommerceCatalog() {
  return fetchAPI<{ packages: any[] }>('/package-orders/catalog');
}

export async function getFeaturedPackages() {
  return fetchAPI<{ packages: any[] }>('/packages/featured');
}

export async function getPackageBySlug(slug: string) {
  return fetchAPI<{ package: any; tests: any[] }>(`/packages/${slug}`);
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
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
}

export async function getAdminPackages(token: string) {
  return fetchAPI<{ packages: any[] }>('/admin/packages', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function login(email: string, password: string) {
  return fetchAPI<{ user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return fetchAPI<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getAdminSession() {
  return fetchAPI<{ user: any }>('/auth/me');
}

export async function getEnquiries(token: string, status?: string) {
  const query = status ? `?status=${status}` : '';
  const res = await fetchAPI<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/admin/leads${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { enquiries: res.data };
}

export async function getEnquiryById(token: string, id: string) {
  const res = await fetchAPI<{ lead: any; history: any[]; notes: any[] }>(`/admin/leads/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { enquiry: res.lead, history: res.history || [], notes: res.notes || [] };
}

export async function updateEnquiryStatus(
  token: string,
  id: string,
  status: string,
  notes?: string
) {
  clearApiCache('/admin/leads');
  return fetchAPI<{ success: boolean }>(`/admin/leads/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_status: status, notes }),
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

export async function createAppointmentHold(data: {
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  patient_phone: string;
}) {
  clearApiCache('/appointments');
  return fetchAPI<{ hold: any }>('/appointments/holds', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function bookAppointment(data: any) {
  clearApiCache('/admin/operations');
  clearApiCache('/appointments');
  return fetchAPI<{ appointment: any }>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createPackageOrder(data: any) {
  clearApiCache('/admin/operations');
  return fetchAPI<{ order: any }>('/package-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createPayment(data: { order_id?: string; appointment_id?: string }) {
  clearApiCache('/admin/operations/payments');
  return fetchAPI<{ payment: any }>('/payments/create', {
    method: 'POST',
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

export async function getAdminDashboard(token: string) {
  return fetchAPI<{ dashboard: any }>('/admin/operations/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
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

export async function getAdminAppointmentSettings(token: string) {
  return fetchAPI<{ settings: AppointmentSettings; warnings: string[] }>(
    '/admin/operations/appointment-settings',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function updateAdminAppointmentSettings(
  token: string,
  data: Partial<AppointmentSettings>
) {
  clearApiCache('/admin/operations/appointment-settings');
  return fetchAPI<{ settings: AppointmentSettings; warnings: string[] }>(
    '/admin/operations/appointment-settings',
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }
  );
}

function toQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getAdminAppointments(
  token: string,
  filters: { doctor_id?: string; status?: string; from?: string; to?: string; search?: string } = {}
) {
  return fetchAPI<{ appointments: any[] }>(`/admin/operations/appointments${toQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getAdminAvailabilityRules(
  token: string,
  filters: { doctor_id?: string } = {}
) {
  return fetchAPI<{ rules: any[] }>(`/admin/operations/availability-rules${toQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createAdminAvailabilityRule(token: string, data: any) {
  clearApiCache('/admin/operations/availability-rules');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ rule: any }>('/admin/operations/availability-rules', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getAdminCalendarOverrides(
  token: string,
  filters: { doctor_id?: string; from?: string; to?: string } = {}
) {
  return fetchAPI<{ overrides: any[] }>(`/admin/operations/calendar-overrides${toQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createAdminCalendarOverride(token: string, data: any) {
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ override: any }>('/admin/operations/calendar-overrides', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCalendarOverride(token: string, id: string) {
  clearApiCache('/admin/operations/calendar-overrides');
  clearApiCache('/public/doctors');
  clearApiCache('/appointments/slots');
  return fetchAPI<{ override: any }>(
    `/admin/operations/calendar-overrides/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function updateAdminAppointmentStatus(token: string, id: string, status: string) {
  clearApiCache('/admin/operations');
  clearApiCache('/appointments/slots');
  clearApiCache('/public/doctors');
  return fetchAPI<{ appointment: any }>(
    `/admin/operations/appointments/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }
  );
}

export async function getAdminPackageOrders(token: string) {
  return fetchAPI<{ orders: any[] }>('/admin/operations/package-orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getAdminPayments(
  token: string,
  filters: { status?: string; from?: string; to?: string; search?: string } = {}
) {
  return fetchAPI<{ payments: any[] }>(`/admin/operations/payments${toQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function downloadAdminExport(
  token: string,
  kind: 'appointments' | 'payments',
  filters: Record<string, string | undefined> = {}
) {
  const res = await fetch(`${API_URL}/admin/operations/${kind}/export${toQuery(filters)}`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
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

export async function getAdminNotifications(token: string) {
  return fetchAPI<{ notifications: any[] }>('/admin/operations/notifications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function retryAdminNotification(token: string, id: string) {
  clearApiCache('/admin/operations/notifications');
  return fetchAPI<{ notification: any }>(
    `/admin/operations/notifications/${encodeURIComponent(id)}/retry`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}
