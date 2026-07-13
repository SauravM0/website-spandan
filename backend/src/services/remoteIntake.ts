import crypto from 'crypto';
import { config } from '../config';
import { getClient, query } from '../config/database';
import { AppError } from '../utils/errors';

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const hmacKey = crypto.createHash('sha256').update(config.intake.encryptionKey).digest();

const hash = (value: string) => crypto.createHmac('sha256', hmacKey).update(value).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

function encrypt(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', hmacKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decrypt<T>(value: string): T {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', hmacKey, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) as T;
}

function maskContact(type: string, contact: string) {
  if (type === 'email') {
    const [name, domain] = contact.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  const digits = contact.replace(/\D/g, '');
  return `******${digits.slice(-4)}`;
}

async function audit(db: { query: (text: string, params?: any[]) => Promise<any> }, action: string, entityId: string, actor: string | null, metadata = {}) {
  await db.query(`INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,'intake',$3,$4)`, [actor, action, entityId, JSON.stringify(metadata)]);
}

export async function createInvitation(input: any, actorStaffId: string) {
  const token = randomToken();
  const contact = String(input.contact).trim().toLowerCase();
  const expiresAt = new Date(Date.now() + Math.min(168, Math.max(1, input.expires_in_hours || config.intake.tokenTtlHours)) * 3600000);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO intake_invitations
       (token_hash, doctor_id, consultation_mode, contact_type, contact_ciphertext, contact_fingerprint, preferred_language,
        earliest_preference_at, latest_preference_at, expires_at, created_by_staff_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, doctor_id, consultation_mode, preferred_language, expires_at, status, created_at`,
      [hash(token), input.doctor_id, input.consultation_mode, input.contact_type, encrypt(contact), hash(contact), input.preferred_language || 'en', input.earliest_preference_at || null, input.latest_preference_at || null, expiresAt, actorStaffId]
    );
    await audit(client, 'intake.invitation.created', result.rows[0].id, actorStaffId, { consultation_mode: input.consultation_mode, expires_at: expiresAt });
    await client.query('COMMIT');
    return { ...result.rows[0], link: `${config.frontendUrl}/intake/${token}` };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function invitationForToken(token: string) {
  const result = await query(`SELECT * FROM intake_invitations WHERE token_hash=$1`, [hash(token)]);
  const invitation = result.rows[0];
  if (!invitation) throw new AppError(404, 'INTAKE_LINK_UNAVAILABLE', 'This intake link is unavailable. Please contact the clinic.');
  if (invitation.status === 'revoked' || new Date(invitation.expires_at) <= new Date()) throw new AppError(410, 'INTAKE_LINK_UNAVAILABLE', 'This intake link is no longer active. Please contact the clinic.');
  return invitation;
}

export async function getInvitationPublic(token: string) {
  const row = await invitationForToken(token);
  return { consultation_mode: row.consultation_mode, preferred_language: row.preferred_language, expires_at: row.expires_at, status: row.status, contact_hint: maskContact(row.contact_type, decrypt<string>(row.contact_ciphertext)) };
}

export async function startVerification(token: string, risk: { ip?: string; userAgent?: string }) {
  const invitation = await invitationForToken(token);
  const recent = await query(`SELECT created_at FROM verified_contact_sessions WHERE invitation_id=$1 ORDER BY created_at DESC LIMIT 1`, [invitation.id]);
  if (recent.rows[0] && Date.now() - new Date(recent.rows[0].created_at).getTime() < 60000) throw new AppError(429, 'OTP_COOLDOWN', 'Please wait before requesting another code.');
  const otp = String(crypto.randomInt(100000, 1000000));
  const result = await query(
    `INSERT INTO verified_contact_sessions (invitation_id,challenge_hash,challenge_expires_at,resend_available_at,ip_hash,user_agent_hash)
     VALUES ($1,$2,NOW()+INTERVAL '10 minutes',NOW()+INTERVAL '1 minute',$3,$4) RETURNING id, challenge_expires_at, resend_available_at`,
    [invitation.id, hash(`${invitation.id}:${otp}`), risk.ip ? hash(risk.ip) : null, risk.userAgent ? hash(risk.userAgent) : null]
  );
  await audit({ query }, 'intake.verification.requested', invitation.id, null, { session_id: result.rows[0].id });
  return { session_id: result.rows[0].id, expires_at: result.rows[0].challenge_expires_at, resend_available_at: result.rows[0].resend_available_at, ...(config.env !== 'production' ? { development_code: otp } : {}) };
}

export async function verifyContact(token: string, verificationId: string, code: string) {
  const invitation = await invitationForToken(token);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT * FROM verified_contact_sessions WHERE id=$1 AND invitation_id=$2 FOR UPDATE`, [verificationId, invitation.id]);
    const session = found.rows[0];
    if (!session || session.locked_at || session.attempt_count >= MAX_ATTEMPTS) throw new AppError(429, 'OTP_LOCKED', 'Verification is locked. Please contact the clinic.');
    if (new Date(session.challenge_expires_at) <= new Date()) throw new AppError(410, 'OTP_EXPIRED', 'The verification code has expired.');
    if (!crypto.timingSafeEqual(Buffer.from(session.challenge_hash), Buffer.from(hash(`${invitation.id}:${code}`)))) {
      await client.query(`UPDATE verified_contact_sessions SET attempt_count=attempt_count+1, locked_at=CASE WHEN attempt_count+1 >= $2 THEN NOW() END, updated_at=NOW() WHERE id=$1`, [session.id, MAX_ATTEMPTS]);
      await client.query('COMMIT');
      throw new AppError(401, 'OTP_INVALID', 'The verification code is incorrect.');
    }
    const sessionToken = randomToken();
    await client.query(`UPDATE verified_contact_sessions SET session_token_hash=$2, verified_at=NOW(), session_expires_at=NOW()+INTERVAL '30 minutes', updated_at=NOW() WHERE id=$1`, [session.id, hash(sessionToken)]);
    await audit(client, 'intake.contact.verified', invitation.id, null, { session_id: session.id });
    await client.query('COMMIT');
    return { session_token: sessionToken, expires_in_seconds: SESSION_TTL_MS / 1000 };
  } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { client.release(); }
}

async function authorize(token: string, sessionToken: string) {
  const invitation = await invitationForToken(token);
  const result = await query(`SELECT id FROM verified_contact_sessions WHERE invitation_id=$1 AND session_token_hash=$2 AND verified_at IS NOT NULL AND session_expires_at>NOW() AND locked_at IS NULL`, [invitation.id, hash(sessionToken)]);
  if (!result.rows[0]) throw new AppError(401, 'INTAKE_SESSION_EXPIRED', 'Your secure session expired. Verify your contact again.');
  return invitation;
}

export async function loadDraft(token: string, sessionToken: string) {
  const invitation = await authorize(token, sessionToken);
  const result = await query(`SELECT id,version,state,encrypted_payload,field_provenance,updated_at FROM intake_submissions WHERE invitation_id=$1 ORDER BY version DESC LIMIT 1`, [invitation.id]);
  const row = result.rows[0];
  return row ? { id: row.id, version: row.version, state: row.state, data: decrypt(row.encrypted_payload), field_provenance: row.field_provenance, updated_at: row.updated_at } : { version: 0, state: 'draft', data: {} };
}

export async function saveDraft(token: string, sessionToken: string, payload: any, expectedVersion: number) {
  const invitation = await authorize(token, sessionToken);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT * FROM intake_submissions WHERE invitation_id=$1 ORDER BY version DESC LIMIT 1 FOR UPDATE`, [invitation.id]);
    const row = current.rows[0];
    if (Number(row?.version || 0) !== expectedVersion) throw new AppError(409, 'DRAFT_CONFLICT', 'This form changed in another session. Reload before continuing.');
    const nextVersion = expectedVersion + 1;
    if (row) await client.query(`UPDATE intake_submissions SET state='superseded', updated_at=NOW() WHERE id=$1`, [row.id]);
    const encrypted = encrypt(payload);
    const saved = await client.query(`INSERT INTO intake_submissions (invitation_id,version,state,encrypted_payload,payload_digest,field_provenance) VALUES ($1,$2,'draft',$3,$4,$5) RETURNING id,version,state,updated_at`, [invitation.id, nextVersion, encrypted, hash(JSON.stringify(payload)), JSON.stringify(Object.fromEntries(Object.keys(payload).map((key) => [key, 'patient'])))]);
    await audit(client, 'intake.draft.saved', invitation.id, null, { version: nextVersion });
    await client.query('COMMIT'); return saved.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function submit(token: string, sessionToken: string, expectedVersion: number) {
  const invitation = await authorize(token, sessionToken);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT * FROM intake_submissions WHERE invitation_id=$1 ORDER BY version DESC LIMIT 1 FOR UPDATE`, [invitation.id]);
    const row = current.rows[0];
    if (!row || row.version !== expectedVersion || row.state !== 'draft') throw new AppError(409, 'SUBMISSION_CONFLICT', 'Reload the form before submitting.');
    const data = decrypt<any>(row.encrypted_payload);
    const required = ['full_name','date_of_birth','reason','consent'];
    const missing = required.filter((key) => !data[key]);
    if (missing.length) throw new AppError(400, 'INTAKE_INCOMPLETE', 'Complete the required fields before submitting.', Object.fromEntries(missing.map((key) => [key, ['Required']])));
    await client.query(`UPDATE intake_submissions SET state='submitted',consent_version='remote-intake-v1',submitted_at=NOW(),updated_at=NOW() WHERE id=$1`, [row.id]);
    await client.query(`INSERT INTO intake_reviews (invitation_id,submission_id) VALUES ($1,$2)
      ON CONFLICT (invitation_id) DO UPDATE SET submission_id=EXCLUDED.submission_id,status='pending',version=intake_reviews.version+1,updated_at=NOW()`, [invitation.id, row.id]);
    await client.query(`UPDATE intake_invitations SET status='submitted',updated_at=NOW() WHERE id=$1`, [invitation.id]);
    await audit(client, 'intake.submitted', invitation.id, null, { version: row.version });
    await client.query('COMMIT'); return { status: 'submitted', reference: invitation.id.slice(0, 8).toUpperCase() };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function createUploadIntent(token: string, sessionToken: string, input: any) {
  const invitation = await authorize(token, sessionToken);
  if (!ALLOWED_MIMES.has(input.mime_type) || input.size_bytes > 10485760) throw new AppError(400, 'UPLOAD_REJECTED', 'Only PDF, JPG, or PNG files up to 10 MB are accepted.');
  const id = crypto.randomUUID(); const objectKey = `intake-quarantine/${invitation.id}/${id}`;
  await query(`INSERT INTO intake_uploads (id,invitation_id,object_key,original_name_ciphertext,declared_mime,declared_size) VALUES ($1,$2,$3,$4,$5,$6)`, [id, invitation.id, objectKey, encrypt(input.file_name), input.mime_type, input.size_bytes]);
  return { upload_id: id, status: 'pending_upload', upload_url: config.intake.uploadBaseUrl ? `${config.intake.uploadBaseUrl}/${objectKey}` : null, expires_in_seconds: 900 };
}

export async function listReviews(filters: any) {
  const page = Math.max(1, Number(filters.page || 1)); const size = Math.min(50, Math.max(1, Number(filters.page_size || 20))); const offset = (page - 1) * size;
  const status = filters.status || null;
  const [rows, count] = await Promise.all([
    query(`SELECT r.*,i.consultation_mode,i.preferred_language,i.expires_at,d.name doctor_name,s.version submission_version FROM intake_reviews r JOIN intake_invitations i ON i.id=r.invitation_id JOIN doctors d ON d.id=i.doctor_id JOIN intake_submissions s ON s.id=r.submission_id WHERE ($1::text IS NULL OR r.status=$1) ORDER BY r.due_at,r.created_at LIMIT $2 OFFSET $3`, [status,size,offset]),
    query(`SELECT COUNT(*)::int total FROM intake_reviews WHERE ($1::text IS NULL OR status=$1)`, [status])
  ]);
  return { data: rows.rows, pagination: { page, page_size: size, total: count.rows[0].total } };
}

export async function getReview(id: string) {
  const result = await query(`SELECT r.*,i.consultation_mode,i.preferred_language,i.expires_at,s.encrypted_payload,s.version submission_version,s.field_provenance FROM intake_reviews r JOIN intake_invitations i ON i.id=r.invitation_id JOIN intake_submissions s ON s.id=r.submission_id WHERE r.id=$1`, [id]);
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Intake review not found');
  const row = result.rows[0]; return { ...row, data: decrypt(row.encrypted_payload), encrypted_payload: undefined };
}

export async function updateReview(id: string, input: any, actor: string) {
  const result = await query(`UPDATE intake_reviews SET status=$2,missing_information=$3,decision_note=$4,reviewed_by_staff_id=$5,reviewed_at=CASE WHEN $2 IN ('accepted','declined') THEN NOW() ELSE reviewed_at END,version=version+1,updated_at=NOW() WHERE id=$1 AND version=$6 RETURNING *`, [id,input.status,input.missing_information || [],input.decision_note || null,actor,input.expected_version]);
  if (!result.rows[0]) throw new AppError(409, 'REVIEW_CONFLICT', 'This review changed. Refresh before continuing.');
  await audit({ query }, 'intake.review.updated', result.rows[0].invitation_id, actor, { review_id: id, status: input.status });
  return result.rows[0];
}

export async function revokeInvitation(id: string, reason: string, actor: string) {
  const result = await query(`UPDATE intake_invitations SET status='revoked',revoked_at=NOW(),revoked_by_staff_id=$2,revoke_reason=$3,updated_at=NOW() WHERE id=$1 AND status='active' RETURNING id,status`, [id,actor,reason]);
  if (!result.rows[0]) throw new AppError(409, 'INVITATION_NOT_ACTIVE', 'Only active invitations can be revoked.');
  await audit({ query }, 'intake.invitation.revoked', id, actor, { reason }); return result.rows[0];
}
