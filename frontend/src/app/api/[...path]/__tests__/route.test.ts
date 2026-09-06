import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('same-origin API proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a controlled 503 response when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const request = new NextRequest('http://localhost:3000/api/auth/me');

    const response = await GET(request, { params: Promise.resolve({ path: ['auth', 'me'] }) });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toEqual(
      expect.objectContaining({
        code: 'UPSTREAM_UNAVAILABLE',
      })
    );
  });
});
