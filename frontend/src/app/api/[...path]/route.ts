import type { NextRequest } from 'next/server';
import { buildInternalApiUrl } from '@/lib/apiUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUEST_HEADERS_TO_REMOVE = ['connection', 'content-length', 'host'];
const RESPONSE_HEADERS_TO_REMOVE = ['connection', 'content-encoding', 'content-length', 'transfer-encoding'];

type RouteContext = { params: Promise<{ path: string[] }> };

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
