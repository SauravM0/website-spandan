import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getClient, query } from '../config/database';
import { findStaffUserByEmail } from '../models';
import { AppError } from '../utils/errors';
import { hashTelemetry } from '../utils/redaction';

const dummyPasswordHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7O0Hzi4fR5q4Wg7W8YwYVn1lGQmKJ8K';

type RequestContext = { ip?: string; userAgent?: string };

const contextHashes = (context: RequestContext) => ({
  ipHash: hashTelemetry(context.ip),
  userAgentHash: hashTelemetry(context.userAgent),
});

export const authenticationFingerprint = (scope: 'account' | 'ip', value: string): string =>
  crypto.createHash('sha256').update(`${scope}:${value.trim().toLowerCase()}`).digest('hex');

const throttleKeys = (email: string, ip: string | undefined) => [
  { scope: 'account' as const, key: authenticationFingerprint('account', email) },
  { scope: 'ip' as const, key: authenticationFingerprint('ip', ip || 'unknown') },
];

async function assertNotThrottled(email: string, ip?: string): Promise<void> {
  const keys = throttleKeys(email, ip).map((item) => item.key);
  const result = await query(
    `SELECT 1 FROM staff_login_throttles
     WHERE throttle_key = ANY($1::char(64)[]) AND blocked_until > NOW() LIMIT 1`,
    [keys]
  );
  if (result.rows[0])
    throw new AppError(429, 'LOGIN_THROTTLED', 'Too many attempts. Try again later.');
}

async function recordFailure(email: string, ip?: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const item of throttleKeys(email, ip)) {
      const result = await client.query(
        `INSERT INTO staff_login_throttles(throttle_key,scope,failure_count)
         VALUES($1,$2,1)
         ON CONFLICT(throttle_key) DO UPDATE SET
           failure_count = CASE WHEN staff_login_throttles.window_started_at < NOW() - INTERVAL '15 minutes'
             THEN 1 ELSE staff_login_throttles.failure_count + 1 END,
           window_started_at = CASE WHEN staff_login_throttles.window_started_at < NOW() - INTERVAL '15 minutes'
             THEN NOW() ELSE staff_login_throttles.window_started_at END,
           updated_at = NOW()
         RETURNING failure_count`,
        [item.key, item.scope]
      );
      const failures = Number(result.rows[0].failure_count);
      const blockMinutes = failures >= 10 ? 60 : failures >= 8 ? 15 : failures >= 5 ? 1 : 0;
      if (blockMinutes) {
        await client.query(
          `UPDATE staff_login_throttles
           SET blocked_until = GREATEST(COALESCE(blocked_until,NOW()), NOW() + ($2::text || ' minutes')::interval), updated_at=NOW()
           WHERE throttle_key=$1`,
          [item.key, blockMinutes]
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function sessionToken(user: any, sessionId: string, absoluteExpiresAt: Date): string {
  return jwt.sign(
    { userId: user.id, sid: sessionId, role: user.role, doctor_id: user.doctor_id },
    config.jwtSecret,
    { expiresIn: Math.max(1, Math.floor((absoluteExpiresAt.getTime() - Date.now()) / 1_000)) }
  );
}

async function createSession(client: any, user: any, context: RequestContext) {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const idleExpiresAt = new Date(now.getTime() + config.adminSessionIdleTimeoutMs);
  const absoluteExpiresAt = new Date(now.getTime() + config.adminSessionCookieMaxAgeMs);
  const hashes = contextHashes(context);
  await client.query(
    `INSERT INTO staff_sessions
       (id,staff_user_id,expires_at,idle_expires_at,absolute_expires_at,ip_hash,user_agent_hash)
     VALUES($1,$2,$3,$4,$3,$5,$6)`,
    [sessionId, user.id, absoluteExpiresAt, idleExpiresAt, hashes.ipHash, hashes.userAgentHash]
  );
  return {
    sessionId,
    token: sessionToken(user, sessionId, absoluteExpiresAt),
    idleExpiresAt,
    absoluteExpiresAt,
  };
}

export async function loginAdmin(email: string, password: string, context: RequestContext) {
  await assertNotThrottled(email, context.ip);
  const user = (await findStaffUserByEmail(email)) as any;
  const passwordValid = await bcrypt.compare(password, user?.password_hash || dummyPasswordHash);
  if (
    !user ||
    !user.is_active ||
    !passwordValid ||
    !['admin', 'system_admin'].includes(user.role)
  ) {
    await recordFailure(email, context.ip);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await createSession(client, user, context);
    await client.query(
      `DELETE FROM staff_login_throttles WHERE throttle_key = ANY($1::char(64)[])`,
      [throttleKeys(email, context.ip).map((item) => item.key)]
    );
    await client.query('COMMIT');
    return { user, session };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listSessions(staffUserId: string, currentSessionId?: string) {
  const result = await query(
    `SELECT id,created_at,last_seen_at,idle_expires_at,absolute_expires_at,revoked_at,revoke_reason
     FROM staff_sessions WHERE staff_user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [staffUserId]
  );
  return result.rows.map((row) => ({ ...row, current: row.id === currentSessionId }));
}

export async function changeAdminPassword(
  staffUserId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 12 || newPassword.length > 128) {
    throw new AppError(400, 'PASSWORD_POLICY_FAILED', 'New password must be 12 to 128 characters.');
  }
  if (currentPassword === newPassword) {
    throw new AppError(
      400,
      'PASSWORD_REUSE',
      'New password must differ from the current password.'
    );
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT password_hash FROM staff_users WHERE id=$1 AND is_active=TRUE FOR UPDATE`,
      [staffUserId]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new AppError(401, 'CURRENT_PASSWORD_INVALID', 'Current password is incorrect.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query(`UPDATE staff_users SET password_hash=$2,updated_at=NOW() WHERE id=$1`, [
      staffUserId,
      passwordHash,
    ]);
    await client.query(
      `UPDATE staff_sessions
       SET revoked_at=COALESCE(revoked_at,NOW()),revoke_reason='password_changed'
       WHERE staff_user_id=$1 AND revoked_at IS NULL`,
      [staffUserId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeOwnSession(staffUserId: string, sessionId: string, reason: string) {
  const result = await query(
    `UPDATE staff_sessions SET revoked_at=COALESCE(revoked_at,NOW()),revoke_reason=$3
     WHERE id=$1 AND staff_user_id=$2 AND revoked_at IS NULL RETURNING id`,
    [sessionId, staffUserId, reason]
  );
  if (!result.rows[0]) throw new AppError(404, 'SESSION_NOT_FOUND', 'Active session not found.');
}
