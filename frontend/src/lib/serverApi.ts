export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function serverApiGet<T>(
  endpoint: string,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, init);
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}
