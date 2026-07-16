import type { Request, Response } from 'express';
import { config } from '../config';
import { query } from '../config/database';
import type { AuthenticatedRequest } from '../middleware/auth';
import { permissionsForRole } from '../security/permissions';
import { authenticationFingerprint } from '../security/authSecurity';
import {
  beginAdminLogin,
  changeAdminPassword,
  completeAdminMfa,
  listSessions,
  revokeOwnSession,
  verifyStepUp,
} from '../services/adminAuth';
import { AppError, badRequest, unauthorized } from '../utils/errors';
import { hashTelemetry } from '../utils/redaction';

function publicStaffUser(
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    doctor_id?: string | null;
  },
  sessionExpiresAt?: string | null
) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    doctor_id: user.doctor_id,
    capabilities: permissionsForRole(user.role),
    session_expires_at: sessionExpiresAt || null,
  };
}

function adminCookieOptions(maxAge = config.adminSessionCookieMaxAgeMs) {
  return {
    httpOnly: true,
    secure: config.env === 'production' || config.adminSessionCookieSameSite === 'none',
    sameSite: config.adminSessionCookieSameSite,
    maxAge,
    path: '/api',
  } as const;
}

function clearAdminCookie(res: Response): void {
  res.clearCookie(config.adminSessionCookieName, {
    path: '/api',
    sameSite: config.adminSessionCookieSameSite,
    secure: config.env === 'production' || config.adminSessionCookieSameSite === 'none',
  });
}

async function auditAuthentication(
  req: Request,
  action: string,
  actorStaffId: string | null,
  metadata: Record<string, unknown> = {}
) {
  await query(
    `INSERT INTO audit_log (actor_staff_id,action,entity_type,entity_id,metadata)
     VALUES($1,$2,'staff_user',$1,$3)`,
    [
      actorStaffId,
      action,
      JSON.stringify({
        request_id: (req.res as Response | undefined)?.locals.requestId,
        ip_hash: hashTelemetry(req.ip),
        user_agent_hash: hashTelemetry(req.get('user-agent')),
        ...metadata,
      }),
    ]
  ).catch(() => undefined);
}

const requestContext = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export async function login(req: Request, res: Response): Promise<void> {
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) {
    badRequest(res, 'Email and password are required');
    return;
  }
  try {
    const challenge = await beginAdminLogin(email, password, requestContext(req));
    await auditAuthentication(req, 'auth.password_verified', null, {
      account_hash: authenticationFingerprint('account', email),
      enrollment_required: challenge.enrollmentRequired,
    });
    res.status(202).json({
      mfa: {
        required: true,
        challenge_id: challenge.challengeId,
        expires_at: challenge.expiresAt,
        enrollment_required: challenge.enrollmentRequired,
        ...(challenge.secret
          ? { secret: challenge.secret, otpauth_uri: challenge.otpauthUri }
          : {}),
      },
    });
  } catch (error) {
    await auditAuthentication(req, 'auth.login_failed', null, {
      account_hash: authenticationFingerprint('account', email),
      error_code: error instanceof AppError ? error.code : 'LOGIN_FAILED',
    });
    throw error;
  }
}

export async function completeMfa(req: Request, res: Response): Promise<void> {
  const challengeId = String(req.body.challenge_id || '');
  const code = String(req.body.code || '');
  const recoveryCode = req.body.recovery_code ? String(req.body.recovery_code) : undefined;
  if (!challengeId || (!code && !recoveryCode)) {
    badRequest(res, 'Challenge and authentication code are required');
    return;
  }
  try {
    const result = await completeAdminMfa(challengeId, code, recoveryCode, requestContext(req));
    await auditAuthentication(req, 'auth.login_success', result.user.id, {
      mfa: true,
      recovery_used: result.recoveryUsed,
      enrollment_completed: Boolean(result.recoveryCodes),
    });
    res.cookie(
      config.adminSessionCookieName,
      result.session.token,
      adminCookieOptions(result.session.absoluteExpiresAt.getTime() - Date.now())
    );
    res.json({
      user: publicStaffUser(result.user, result.session.idleExpiresAt.toISOString()),
      ...(result.recoveryCodes ? { recovery_codes: result.recoveryCodes } : {}),
    });
  } catch (error) {
    await auditAuthentication(req, 'auth.mfa_failed', null, {
      error_code: error instanceof AppError ? error.code : 'MFA_FAILED',
    });
    throw error;
  }
}

export async function stepUp(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id || !req.sessionId) {
    unauthorized(res);
    return;
  }
  try {
    const result = await verifyStepUp(
      req.user.id,
      req.sessionId,
      String(req.body.code || ''),
      req.body.recovery_code ? String(req.body.recovery_code) : undefined
    );
    await auditAuthentication(req, 'auth.step_up_success', req.user.id, {
      recovery_used: result.recoveryUsed,
    });
    res.json({ success: true, valid_for_seconds: Math.floor(config.adminStepUpMaxAgeMs / 1_000) });
  } catch (error) {
    await auditAuthentication(req, 'auth.step_up_failed', req.user.id, {
      error_code: error instanceof AppError ? error.code : 'STEP_UP_FAILED',
    });
    throw error;
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.sessionId)
    await query(
      `UPDATE staff_sessions SET revoked_at=COALESCE(revoked_at,NOW()),revoke_reason='logout' WHERE id=$1`,
      [req.sessionId]
    );
  await auditAuthentication(req, 'auth.logout', req.user?.id || null);
  clearAdminCookie(res);
  res.json({ success: true });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    unauthorized(res);
    return;
  }
  res.json({
    user: publicStaffUser(req.user, req.sessionExpiresAt),
    session: {
      id: req.sessionId,
      idle_expires_at: req.sessionExpiresAt,
      absolute_expires_at: req.sessionAbsoluteExpiresAt,
      step_up_verified_at: req.stepUpVerifiedAt,
    },
  });
}

export async function sessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    unauthorized(res);
    return;
  }
  res.json({ sessions: await listSessions(req.user.id, req.sessionId) });
}

export async function revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    unauthorized(res);
    return;
  }
  await revokeOwnSession(req.user.id, req.params.id, String(req.body.reason || 'admin_revoked'));
  await auditAuthentication(req, 'auth.session_revoked', req.user.id, {
    revoked_session_hash: hashTelemetry(req.params.id),
  });
  if (req.params.id === req.sessionId) clearAdminCookie(res);
  res.json({ success: true, current_session_revoked: req.params.id === req.sessionId });
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    unauthorized(res);
    return;
  }
  const currentPassword = String(req.body.current_password || '');
  const newPassword = String(req.body.new_password || '');
  if (!currentPassword || !newPassword) {
    badRequest(res, 'Current and new passwords are required');
    return;
  }
  try {
    await changeAdminPassword(req.user.id, currentPassword, newPassword);
    await auditAuthentication(req, 'auth.password_changed', req.user.id);
    clearAdminCookie(res);
    res.json({ success: true, sessions_revoked: true });
  } catch (error) {
    await auditAuthentication(req, 'auth.password_change_failed', req.user.id, {
      error_code: error instanceof AppError ? error.code : 'PASSWORD_CHANGE_FAILED',
    });
    throw error;
  }
}
