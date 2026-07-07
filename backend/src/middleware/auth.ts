import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { findStaffUserByAuthId, StaffUser } from '../models';

export interface AuthenticatedRequest extends Request {
  user?: StaffUser;
}

const STAFF_CACHE_TTL_MS = 30_000;
const staffCache = new Map<string, { expiresAt: number; promise: Promise<StaffUser | null> }>();

function getCachedStaffUser(userId: string): Promise<StaffUser | null> {
  const cached = staffCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = findStaffUserByAuthId(userId).catch((err) => {
    staffCache.delete(userId);
    throw err;
  });
  staffCache.set(userId, {
    expiresAt: Date.now() + STAFF_CACHE_TTL_MS,
    promise,
  });
  return promise;
}

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie;
  if (!cookies) return undefined;

  const prefix = `${name}=`;
  const match = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

function getRequestToken(req: Request): string | undefined {
  const cookieToken = readCookie(req, config.adminSessionCookieName);
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }

  return undefined;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = getRequestToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; role?: string; doctor_id?: string };
    const user = await getCachedStaffUser(decoded.userId);
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = getRequestToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    getCachedStaffUser(decoded.userId).then((user) => {
      if (user && user.is_active) req.user = user;
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}
