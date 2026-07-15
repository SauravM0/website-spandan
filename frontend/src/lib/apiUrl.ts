export const BROWSER_API_BASE = '/api';

const LOCAL_API_URL = 'http://127.0.0.1:4000/api';

type ApiEnvironment = {
  INTERNAL_API_URL?: string;
  NODE_ENV?: string;
};

export function getInternalApiBase(environment: ApiEnvironment = process.env): string {
  const configured = environment.INTERNAL_API_URL?.trim();
  if (!configured) {
    if (environment.NODE_ENV === 'production') {
      throw new Error('INTERNAL_API_URL is required in production');
    }
    return LOCAL_API_URL;
  }

  const parsed = new URL(configured);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('INTERNAL_API_URL must use http or https');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      'INTERNAL_API_URL must not contain credentials, query parameters, or fragments'
    );
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');
  if (!pathname.endsWith('/api')) {
    throw new Error('INTERNAL_API_URL must end with /api');
  }
  parsed.pathname = pathname;
  return parsed.toString().replace(/\/$/, '');
}

export function buildInternalApiUrl(
  path: string,
  search = '',
  environment: ApiEnvironment = process.env
): URL {
  const segments = path.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('API path cannot contain traversal segments');
  }
  const normalizedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
  const url = new URL(`${getInternalApiBase(environment)}/${normalizedPath}`);
  url.search = search;
  return url;
}

export function browserApiUrl(path: string): string {
  if (!path) return BROWSER_API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path === '/api' || path.startsWith('/api/') ? path.slice(4) : path;
  return `${BROWSER_API_BASE}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}
