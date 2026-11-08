import type { NextRequest } from 'next/server';
import { buildInternalApiUrl } from '@/lib/apiUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Forwarding-trust headers are stripped from client requests.
 *
 * The backend runs behind `trust proxy` and keys rate limiting and audit
 * records off the forwarded address, so letting a caller supply its own
 * `x-forwarded-*` would let it choose the identity it is limited and logged
 * under. This route sets the ones the backend should see, just below.
 */
const REQUEST_HEADERS_TO_REMOVE = [
  'connection',
  'content-length',
  'host',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'forwarded',
];
const RESPONSE_HEADERS_TO_REMOVE = ['connection', 'content-encoding', 'content-length', 'transfer-encoding'];

type RouteContext = { params: Promise<{ path: string[] }> };

/** Matches the server-render deadline in `lib/serverApi.ts`. */
const UPSTREAM_TIMEOUT_MS = 4000;

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const upstreamUrl = buildInternalApiUrl(path.join('/'), request.nextUrl.search);
  const headers = new Headers(request.headers);
  REQUEST_HEADERS_TO_REMOVE.forEach((header) => headers.delete(header));
  headers.set('x-forwarded-host', request.nextUrl.host);
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
    // Without a deadline a hung backend holds this route handler open and, under
    // load, exhausts the server's request workers.
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  };
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch (error) {
    console.error('API upstream unavailable', {
      method: request.method,
      path: request.nextUrl.pathname,
      cause: error instanceof Error ? error.message : 'Unknown connection error',
    });
    return new Response(
      JSON.stringify({
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'The backend service is temporarily unavailable. Please try again shortly.',
        },
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }
    );
  }
  const responseHeaders = new Headers(upstream.headers);
  RESPONSE_HEADERS_TO_REMOVE.forEach((header) => responseHeaders.delete(header));
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
