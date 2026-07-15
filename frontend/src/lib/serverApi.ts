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
