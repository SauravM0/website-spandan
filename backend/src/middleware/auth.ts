import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { findStaffUserByAuthId, StaffUser } from '../models';
import { sendApiError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: StaffUser;
  sessionExpiresAt?: string | null;
  sessionId?: string;
  sessionAbsoluteExpiresAt?: string | null;
  stepUpVerifiedAt?: string | null;
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

type SessionIdentity = { userId: string; sid?: string; mfa?: boolean };

async function refreshMfaSession(identity: SessionIdentity) {
  if (!identity.sid || identity.mfa !== true) return null;
  const session = await import('../config/database').then(({ query }) =>
    query(
      `UPDATE staff_sessions SET
         last_seen_at=NOW(),
         idle_expires_at=LEAST(absolute_expires_at,NOW()+($3::text||' milliseconds')::interval)
       WHERE id=$1 AND staff_user_id=$2 AND revoked_at IS NULL
         AND idle_expires_at>NOW() AND absolute_expires_at>NOW()
         AND mfa_verified_at IS NOT NULL
       RETURNING id,idle_expires_at,absolute_expires_at,step_up_verified_at,mfa_verified_at`,
      [identity.sid, identity.userId, config.adminSessionIdleTimeoutMs]
    )
  );
  return session.rows[0] || null;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getRequestToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      role?: string;
      doctor_id?: string;
      exp?: number;
      sid?: string;
      mfa?: boolean;
    };
    if (!decoded.sid || decoded.mfa !== true) {
      sendApiError(res, 401, 'SESSION_UPGRADE_REQUIRED', 'Multi-factor login is required.');
      return;
    }
    const session = await refreshMfaSession(decoded);
    if (!session) {
      res.status(401).json({ error: 'Session expired or revoked' });
      return;
    }
    const user = await getCachedStaffUser(decoded.userId);
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }
    req.user = user;
    req.sessionExpiresAt = session.idle_expires_at;
    req.sessionAbsoluteExpiresAt = session.absolute_expires_at;
    req.stepUpVerifiedAt = session.step_up_verified_at;
    req.sessionId = decoded.sid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRecentStepUp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const verifiedAt = req.stepUpVerifiedAt ? new Date(req.stepUpVerifiedAt).getTime() : 0;
  if (!verifiedAt || Date.now() - verifiedAt > config.adminStepUpMaxAgeMs) {
    sendApiError(
      res,
      403,
      'STEP_UP_REQUIRED',
      'Recent multi-factor authentication is required for this action.'
    );
    return;
  }
  next();
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = getRequestToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      sid?: string;
      mfa?: boolean;
    };
    const session = await refreshMfaSession(decoded);
    if (!session || !decoded.sid) {
      next();
      return;
    }
    const user = await getCachedStaffUser(decoded.userId);
    if (user?.is_active) {
      req.user = user;
      req.sessionId = decoded.sid;
      req.sessionExpiresAt = session.idle_expires_at;
      req.sessionAbsoluteExpiresAt = session.absolute_expires_at;
      req.stepUpVerifiedAt = session.step_up_verified_at;
    }
    next();
  } catch {
    next();
  }
}
