import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getClient, query } from '../config/database';
import { findStaffUserByEmail } from '../models';
import { AppError } from '../utils/errors';
import { hashTelemetry } from '../utils/redaction';
import {
  authenticationFingerprint,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  generateRecoveryCodes,
  recoveryCodeHash,
  verifyTotp,
} from '../security/authSecurity';

const dummyPasswordHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7O0Hzi4fR5q4Wg7W8YwYVn1lGQmKJ8K';
const challengeTtlMs = 5 * 60 * 1000;

type RequestContext = { ip?: string; userAgent?: string };

const contextHashes = (context: RequestContext) => ({
  ipHash: hashTelemetry(context.ip),
  userAgentHash: hashTelemetry(context.userAgent),
});

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

export async function beginAdminLogin(email: string, password: string, context: RequestContext) {
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

  const enrollmentRequired = !user.mfa_enabled_at || !user.mfa_secret_encrypted;
  const secret = enrollmentRequired ? generateMfaSecret() : null;
  const hashes = contextHashes(context);
  const result = await query(
    `INSERT INTO staff_auth_challenges
       (staff_user_id,purpose,pending_secret_encrypted,expires_at,ip_hash,user_agent_hash)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id,expires_at`,
    [
      user.id,
      enrollmentRequired ? 'enrollment' : 'login',
      secret
        ? encryptMfaSecret(secret, config.mfaEncryptionKey, config.mfaEncryptionKeyVersion)
        : null,
      new Date(Date.now() + challengeTtlMs),
      hashes.ipHash,
      hashes.userAgentHash,
    ]
  );
  return {
    challengeId: result.rows[0].id,
    expiresAt: result.rows[0].expires_at,
    enrollmentRequired,
    ...(secret
      ? {
          secret,
          otpauthUri: `otpauth://totp/${encodeURIComponent(`Spandan Clinic:${user.email}`)}?secret=${secret}&issuer=${encodeURIComponent('Spandan Clinic')}`,
        }
      : {}),
  };
}

function sessionToken(user: any, sessionId: string, absoluteExpiresAt: Date): string {
  return jwt.sign(
    { userId: user.id, sid: sessionId, role: user.role, doctor_id: user.doctor_id, mfa: true },
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
       (id,staff_user_id,expires_at,idle_expires_at,absolute_expires_at,mfa_verified_at,ip_hash,user_agent_hash)
     VALUES($1,$2,$3,$4,$3,NOW(),$5,$6)`,
    [sessionId, user.id, absoluteExpiresAt, idleExpiresAt, hashes.ipHash, hashes.userAgentHash]
  );
  return {
    sessionId,
    token: sessionToken(user, sessionId, absoluteExpiresAt),
    idleExpiresAt,
    absoluteExpiresAt,
  };
}

export async function completeAdminMfa(
  challengeId: string,
  code: string,
  recoveryCode: string | undefined,
  context: RequestContext
) {
  const client = await getClient();
  let email = '';
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT c.*,u.email,u.full_name,u.role,u.doctor_id,u.is_active,
              u.mfa_secret_encrypted,u.mfa_enabled_at,u.last_mfa_counter
       FROM staff_auth_challenges c JOIN staff_users u ON u.id=c.staff_user_id
       WHERE c.id=$1 FOR UPDATE`,
      [challengeId]
    );
    const challenge = result.rows[0];
    email = challenge?.email || '';
    const hashes = contextHashes(context);
    if (
      !challenge ||
      !challenge.is_active ||
      challenge.completed_at ||
      new Date(challenge.expires_at) <= new Date() ||
      challenge.attempt_count >= 5 ||
      challenge.ip_hash !== hashes.ipHash ||
      challenge.user_agent_hash !== hashes.userAgentHash
    )
      throw new AppError(401, 'MFA_CHALLENGE_INVALID', 'MFA challenge is invalid or expired.');
    if (challenge.purpose === 'enrollment' && challenge.mfa_enabled_at) {
      throw new AppError(401, 'MFA_CHALLENGE_INVALID', 'MFA enrollment is already complete.');
    }

    let verifiedCounter: number | null = null;
    let recoveryUsed = false;
    const encryptedSecret =
      challenge.purpose === 'enrollment'
        ? challenge.pending_secret_encrypted
        : challenge.mfa_secret_encrypted;
    if (recoveryCode && challenge.purpose === 'login') {
      const consumed = await client.query(
        `UPDATE staff_mfa_recovery_codes SET used_at=NOW()
         WHERE staff_user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id`,
        [challenge.staff_user_id, recoveryCodeHash(challenge.staff_user_id, recoveryCode)]
      );
      recoveryUsed = Boolean(consumed.rows[0]);
    } else {
      const secret = decryptMfaSecret(
        encryptedSecret,
        config.mfaEncryptionKey,
        config.mfaEncryptionKeyVersion
      );
      verifiedCounter = verifyTotp(secret, code, challenge.last_mfa_counter);
    }
    if (!recoveryUsed && verifiedCounter === null) {
      await client.query(
        `UPDATE staff_auth_challenges SET attempt_count=attempt_count+1 WHERE id=$1`,
        [challengeId]
      );
      await client.query('COMMIT');
      await recordFailure(email, context.ip).catch(() => undefined);
      throw new AppError(401, 'MFA_CODE_INVALID', 'Invalid authentication code.');
    }

    let recoveryCodes: string[] | undefined;
    if (challenge.purpose === 'enrollment') {
      recoveryCodes = generateRecoveryCodes();
      await client.query(
        `UPDATE staff_users SET mfa_secret_encrypted=$2,mfa_enabled_at=NOW(),last_mfa_counter=$3
         WHERE id=$1`,
        [challenge.staff_user_id, challenge.pending_secret_encrypted, verifiedCounter]
      );
      await client.query(
        `UPDATE staff_sessions SET revoked_at=COALESCE(revoked_at,NOW()),revoke_reason='mfa_enrolled'
         WHERE staff_user_id=$1 AND revoked_at IS NULL`,
        [challenge.staff_user_id]
      );
      for (const recovery of recoveryCodes) {
        await client.query(
          `INSERT INTO staff_mfa_recovery_codes(staff_user_id,code_hash) VALUES($1,$2)`,
          [challenge.staff_user_id, recoveryCodeHash(challenge.staff_user_id, recovery)]
        );
      }
    } else if (verifiedCounter !== null) {
      await client.query(`UPDATE staff_users SET last_mfa_counter=$2 WHERE id=$1`, [
        challenge.staff_user_id,
        verifiedCounter,
      ]);
    }
    await client.query(`UPDATE staff_auth_challenges SET completed_at=NOW() WHERE id=$1`, [
      challengeId,
    ]);
    const session = await createSession(client, challenge, context);
    await client.query(
      `DELETE FROM staff_login_throttles WHERE throttle_key = ANY($1::char(64)[])`,
      [throttleKeys(email, context.ip).map((item) => item.key)]
    );
    await client.query('COMMIT');
    return { user: challenge, session, recoveryCodes, recoveryUsed };
  } catch (error) {
    if (!(error instanceof AppError && error.code === 'MFA_CODE_INVALID')) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyStepUp(
  staffUserId: string,
  sessionId: string,
  code: string,
  recoveryCode?: string
): Promise<{ recoveryUsed: boolean }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT mfa_secret_encrypted,last_mfa_counter FROM staff_users
       WHERE id=$1 AND is_active=TRUE FOR UPDATE`,
      [staffUserId]
    );
    const user = result.rows[0];
    if (!user?.mfa_secret_encrypted) throw new AppError(403, 'MFA_REQUIRED', 'MFA is required.');
    let recoveryUsed = false;
    let counter: number | null = null;
    if (recoveryCode) {
      const consumed = await client.query(
        `UPDATE staff_mfa_recovery_codes SET used_at=NOW()
         WHERE staff_user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id`,
        [staffUserId, recoveryCodeHash(staffUserId, recoveryCode)]
      );
      recoveryUsed = Boolean(consumed.rows[0]);
    } else {
      counter = verifyTotp(
        decryptMfaSecret(
          user.mfa_secret_encrypted,
          config.mfaEncryptionKey,
          config.mfaEncryptionKeyVersion
        ),
        code,
        user.last_mfa_counter
      );
    }
    if (!recoveryUsed && counter === null)
      throw new AppError(401, 'MFA_CODE_INVALID', 'Invalid authentication code.');
    if (counter !== null)
      await client.query(`UPDATE staff_users SET last_mfa_counter=$2 WHERE id=$1`, [
        staffUserId,
        counter,
      ]);
    const updated = await client.query(
      `UPDATE staff_sessions SET step_up_verified_at=NOW()
       WHERE id=$1 AND staff_user_id=$2 AND revoked_at IS NULL
         AND idle_expires_at>NOW() AND absolute_expires_at>NOW() RETURNING id`,
      [sessionId, staffUserId]
    );
    if (!updated.rows[0]) throw new AppError(401, 'SESSION_EXPIRED', 'Session expired.');
    await client.query('COMMIT');
    return { recoveryUsed };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listSessions(staffUserId: string, currentSessionId?: string) {
  const result = await query(
    `SELECT id,created_at,last_seen_at,idle_expires_at,absolute_expires_at,revoked_at,revoke_reason,
            mfa_verified_at,step_up_verified_at
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
