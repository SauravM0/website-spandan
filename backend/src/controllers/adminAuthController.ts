import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../config/database';
import { findStaffUserByEmail } from '../models';
import { badRequest, unauthorized } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth';

function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: config.env === 'production' || config.adminSessionCookieSameSite === 'none',
    sameSite: config.adminSessionCookieSameSite,
    maxAge: config.adminSessionCookieMaxAgeMs,
    path: '/api',
  } as const;
}

async function auditLogin(req: Request, action: 'auth.login_success' | 'auth.login_failed', actorStaffId: string | null, email: string) {
  try {
    await query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'staff_user', $3, $4)`,
      [
        actorStaffId,
        action,
        actorStaffId,
        JSON.stringify({
          email,
          ip: req.ip,
          user_agent: req.get('user-agent') || null,
        }),
      ]
    );
  } catch {
    // Authentication must not depend on audit persistence.
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    badRequest(res, 'Email and password are required');
    return;
  }

  const user = await findStaffUserByEmail(email);

  if (!user) {
    await auditLogin(req, 'auth.login_failed', null, email);
    unauthorized(res, 'Invalid credentials');
    return;
  }

  if (!user.is_active) {
    await auditLogin(req, 'auth.login_failed', user.id, email);
    unauthorized(res, 'Account is disabled');
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await auditLogin(req, 'auth.login_failed', user.id, email);
    unauthorized(res, 'Invalid credentials');
    return;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, doctor_id: user.doctor_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  await auditLogin(req, 'auth.login_success', user.id, email);
  res.cookie(config.adminSessionCookieName, token, adminCookieOptions());
  res.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      doctor_id: user.doctor_id,
    },
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(config.adminSessionCookieName, {
    path: '/api',
    sameSite: config.adminSessionCookieSameSite,
    secure: config.env === 'production' || config.adminSessionCookieSameSite === 'none',
  });
  res.json({ success: true });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    unauthorized(res);
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      doctor_id: req.user.doctor_id,
    },
  });
}
