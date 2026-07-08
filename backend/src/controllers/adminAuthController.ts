import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../config/database';
import { findStaffUserByEmail } from '../models';
import { badRequest, unauthorized } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth';

const roleCapabilities: Record<string, string[]> = {
  admin: [
    'admin.dashboard.read',
    'admin.calendar.read',
    'admin.calendar.write',
    'admin.appointments.read',
    'admin.appointments.write',
    'admin.package_orders.read',
    'admin.payments.read',
    'admin.notifications.read',
    'admin.notifications.write',
    'admin.leads.read',
    'admin.leads.write',
    'admin.packages.read',
    'admin.packages.write',
  ],
  staff: [
    'admin.dashboard.read',
    'admin.calendar.read',
    'admin.appointments.read',
    'admin.appointments.write',
    'admin.package_orders.read',
    'admin.notifications.read',
    'admin.leads.read',
    'admin.leads.write',
  ],
  doctor: [
    'admin.dashboard.read',
    'admin.calendar.read',
    'admin.appointments.read',
  ],
};

function capabilitiesForRole(role: string): string[] {
  return roleCapabilities[role] || roleCapabilities.staff;
}

function publicStaffUser(user: {
  id: string;
  email: string;
  full_name: string;
  role: string;
  doctor_id?: string | null;
}, sessionExpiresAt?: string | null) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    doctor_id: user.doctor_id,
    capabilities: capabilitiesForRole(user.role),
    session_expires_at: sessionExpiresAt || null,
  };
}

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
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    badRequest(res, 'Email and password are required');
    return;
  }

  const user = await findStaffUserByEmail(email);

  if (!user) {
    await auditLogin(req, 'auth.login_failed', null, email);
    unauthorized(res, 'Invalid email or password');
    return;
  }

  if (!user.is_active) {
    await auditLogin(req, 'auth.login_failed', user.id, email);
    unauthorized(res, 'Invalid email or password');
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await auditLogin(req, 'auth.login_failed', user.id, email);
    unauthorized(res, 'Invalid email or password');
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
    user: publicStaffUser(user),
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
    user: publicStaffUser(req.user, req.sessionExpiresAt),
  });
}
