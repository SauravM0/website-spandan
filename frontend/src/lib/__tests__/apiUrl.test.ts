import { describe, expect, it } from 'vitest';
import { BROWSER_API_BASE, browserApiUrl, buildInternalApiUrl, getInternalApiBase } from '../apiUrl';

describe('production API routing', () => {
  it('keeps browser requests on the same origin', () => {
    expect(BROWSER_API_BASE).toBe('/api');
    expect(browserApiUrl('/admin/appointments')).toBe('/api/admin/appointments');
    expect(browserApiUrl('/api/public/receipts/abc')).toBe('/api/public/receipts/abc');
    expect(browserApiUrl('/apiary/status')).toBe('/api/apiary/status');
  });

  it('requires a server-only API address in production', () => {
    expect(() => getInternalApiBase({ NODE_ENV: 'production' })).toThrow('INTERNAL_API_URL is required');
  });

  it('accepts a private runtime address and preserves query parameters', () => {
    const environment = { NODE_ENV: 'production', INTERNAL_API_URL: 'http://backend.internal:4000/api/' };
    expect(getInternalApiBase(environment)).toBe('http://backend.internal:4000/api');
    expect(buildInternalApiUrl('packages/heart health', '?page=2', environment).toString())
      .toBe('http://backend.internal:4000/api/packages/heart%20health?page=2');
  });

  it('rejects malformed or credential-bearing internal addresses', () => {
    expect(() => getInternalApiBase({ INTERNAL_API_URL: 'ftp://backend/api' })).toThrow('http or https');
    expect(() => getInternalApiBase({ INTERNAL_API_URL: 'http://user:secret@backend/api' })).toThrow('credentials');
    expect(() => getInternalApiBase({ INTERNAL_API_URL: 'http://backend/v1' })).toThrow('end with /api');
  });

  it('does not allow a proxy path to escape the API prefix', () => {
    expect(() => buildInternalApiUrl('../health', '', { INTERNAL_API_URL: 'http://backend/api' }))
      .toThrow('traversal');
  });
});
