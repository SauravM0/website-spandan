const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Cache the CSRF token
let csrfTokenPromise: Promise<string> | null = null;

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
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getDoctors(activeOnly = true) {
  return fetchAPI<{ doctors: any[] }>(`/doctors${activeOnly ? '' : '?all=true'}`);
}

export async function getDoctorBySlug(slug: string) {
  return fetchAPI<{ doctor: any }>(`/doctors/${slug}`);
}

export async function getPackages(activeOnly = true) {
  return fetchAPI<{ packages: any[] }>(`/packages${activeOnly ? '' : '?all=true'}`);
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
  source_language?: string;
}) {
  const csrfToken = await getCsrfToken();
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
  return fetchAPI<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getEnquiries(token: string, status?: string) {
  const query = status ? `?status=${status}` : '';
  const res = await fetchAPI<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }>(`/admin/leads${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { enquiries: res.data };
}

export async function getEnquiryById(token: string, id: string) {
  const res = await fetchAPI<{ lead: any; history: any[] }>(`/admin/leads/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { enquiry: res.lead, history: res.history || [] };
}

export async function updateEnquiryStatus(token: string, id: string, status: string, notes?: string) {
  return fetchAPI<{ success: boolean }>(`/admin/leads/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_status: status }),
  });
}
