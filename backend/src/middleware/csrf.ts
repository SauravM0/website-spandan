import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_HEADER = 'x-csrf-token';
const tokenStore = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of tokenStore.entries()) {
    if (now > expiry) tokenStore.delete(token);
  }
}, 10 * 60 * 1000);

export function generateAndStoreCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, Date.now() + 60 * 60 * 1000);
  return token;
}

export function getCsrfToken(_req: Request, res: Response): void {
  const token = generateAndStoreCsrfToken();
  res.json({ csrfToken: token });
}

export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const tokenFromHeader = req.headers[CSRF_HEADER] as string;
  if (!tokenFromHeader) {
    res.status(403).json({ error: 'Missing CSRF token' });
    return;
  }

  if (!tokenStore.has(tokenFromHeader)) {
    res.status(403).json({ error: 'Invalid or expired CSRF token' });
    return;
  }

  tokenStore.delete(tokenFromHeader);
  next();
}
