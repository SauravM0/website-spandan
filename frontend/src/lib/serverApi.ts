import { connection } from 'next/server';
import { getInternalApiBase } from './apiUrl';

export async function serverApiGet<T>(
  endpoint: string,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    // Private service discovery exists at container runtime, not during the image build.
    await connection();
    const res = await fetch(`${getInternalApiBase()}${endpoint}`, init);
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

/**
 * Same fetch, but the caller learns whether the backend actually answered.
 *
 * `serverApiGet` collapses "the service is down" and "there is no such record"
 * into the same empty value, which makes detail pages render a 404 during an
 * outage. Anything that would otherwise call notFound() should use this and
 * only 404 when the backend responded and genuinely had no match.
 */
export type ApiResult<T> = { ok: boolean; data: T };

export async function serverApiTry<T>(
  endpoint: string,
  fallback: T,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    await connection();
    const res = await fetch(`${getInternalApiBase()}${endpoint}`, init);
    if (!res.ok) return { ok: false, data: fallback };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, data: fallback };
  }
}
