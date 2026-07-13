import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { sendApiError } from '../utils/errors';

const CSRF_HEADER = 'x-csrf-token';
const TOKEN_TTL_MS = 60 * 60 * 1000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function sign(value: string): string {
  return crypto.createHmac('sha256', config.jwtSecret).update(value).digest('base64url');
}

export function generateCsrfToken(now = Date.now()): string {
  const payload = `${now}.${crypto.randomBytes(24).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidCsrfToken(token: string, now = Date.now()): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
  const issuedAt = Number(parts[0]);
  return Number.isFinite(issuedAt) && issuedAt <= now && now - issuedAt <= TOKEN_TTL_MS;
}

export function getCsrfToken(_req: Request, res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ csrfToken: generateCsrfToken() });
}

/** Protects unsafe requests only when browser cookie authentication is present. */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || !readCookie(req, config.adminSessionCookieName)) {
    next();
    return;
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try { requestOrigin = new URL(referer).origin; } catch { requestOrigin = undefined; }
  }
  if (!requestOrigin || !config.corsOrigins.includes(requestOrigin.replace(/\/+$/, ''))) {
    sendApiError(res, 403, 'CSRF_ORIGIN_REJECTED', 'Request origin is not allowed');
    return;
  }

  const token = req.get(CSRF_HEADER);
  if (!token || !isValidCsrfToken(token)) {
    sendApiError(res, 403, 'CSRF_TOKEN_INVALID', 'Missing, invalid, or expired CSRF token');
    return;
  }
  next();
}
