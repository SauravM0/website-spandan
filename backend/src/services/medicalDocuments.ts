import crypto from 'crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import net from 'net';
import type { PoolClient } from 'pg';
import { config } from '../config';
import { getClient, query } from '../config/database';
import { AppError } from '../utils/errors';
import {
  assertPatientClinicalAccess,
  isClinicalAdministrator,
  type ClinicalActor,
  type SensitiveAccessLevel,
} from '../security/clinicalAuthorization';

type Actor = ClinicalActor;
const allowed: Record<string, readonly string[]> = {
  'application/pdf': ['25504446'],
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e470d0a1a0a'],
};
function key() {
  if (!config.documents.encryptionKey)
    throw new AppError(503, 'DOCUMENT_GOVERNANCE_REQUIRED', 'Document storage is not configured.');
  return crypto.createHash('sha256').update(config.documents.encryptionKey).digest();
}
function ensureEnabled() {
  if (!config.documents.enabled)
    throw new AppError(
      503,
      'DOCUMENT_GOVERNANCE_REQUIRED',
      'Medical document handling is awaiting governance approval.'
    );
  if (config.env === 'production' && config.documents.scannerMode !== 'clamav')
    throw new AppError(
      503,
      'DOCUMENT_SCANNER_REQUIRED',
      'An approved malware scanner is required in production.'
    );
}
function filename(value: string) {
  return (
    value
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/[\\/]/g, '_')
      .slice(0, 180) || 'document'
  );
}
function signatureOk(type: string, data: Buffer) {
  return Boolean(allowed[type]?.some((x) => data.subarray(0, x.length / 2).toString('hex') === x));
}
async function scopedPatient(
  client: PoolClient,
  patientId: string,
  actor: Actor,
  encounterId?: string,
  accessLevel: SensitiveAccessLevel = 'clinical'
) {
  await assertPatientClinicalAccess(client, patientId, actor, accessLevel, encounterId);
}
async function audit(
  c: PoolClient,
  a: Actor,
  action: string,
  id: string,
  metadata: Record<string, unknown> = {}
) {
  await c.query(
    `INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'medical_document',$3,$4)`,
    [a.id, action, id, JSON.stringify(metadata)]
  );
}
function encrypt(data: Buffer) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv('aes-256-gcm', key(), iv),
    body = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from('MDF1'), iv, cipher.getAuthTag(), body]);
}
function decrypt(data: Buffer) {
  if (data.subarray(0, 4).toString() !== 'MDF1') throw new Error('Invalid encrypted object');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), data.subarray(4, 16));
  decipher.setAuthTag(data.subarray(16, 32));
  return Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]);
}
function objectPath(storageKey: string) {
  return path.resolve(config.documents.storageDir, `${storageKey}.enc`);
}
async function clamScan(data: Buffer): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.documents.scannerHost,
      port: config.documents.scannerPort,
    });
    let response = '';
    const timer = setTimeout(
      () => socket.destroy(new Error('Scanner timeout')),
      config.documents.scannerTimeoutMs
    );
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < data.length; offset += 64 * 1024) {
        const chunk = data.subarray(offset, offset + 64 * 1024),
          length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
    socket.on('data', (chunk) => (response += chunk.toString()));
    socket.on('error', reject);
    socket.on('close', () => {
      clearTimeout(timer);
      if (response.includes('FOUND')) resolve(false);
      else if (response.includes('OK')) resolve(true);
      else reject(new Error('Invalid scanner response'));
    });
  });
}

export async function upload(
  patientId: string,
  input: any,
  data: Buffer,
  actor: Actor,
  idempotencyKey: string
) {
  ensureEnabled();
  if (!data.length || data.length > config.documents.maxBytes)
    throw new AppError(
      413,
      'DOCUMENT_SIZE_INVALID',
      `Document must be between 1 byte and ${config.documents.maxBytes} bytes.`
    );
  if (!allowed[input.media_type] || !signatureOk(input.media_type, data))
    throw new AppError(
      415,
      'DOCUMENT_TYPE_INVALID',
      'Only genuine PDF, JPEG, or PNG documents are accepted.'
    );
  const checksum = crypto.createHash('sha256').update(data).digest('hex'),
    requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(input) + checksum)
      .digest('hex'),
    storageKey = crypto.randomUUID();
  const client = await getClient();
  let finalPath = '';
  try {
    await client.query('BEGIN');
    const prior = await client.query(
      `SELECT i.request_hash,d.* FROM document_idempotency i JOIN document_references d ON d.id=i.document_id WHERE i.actor_staff_id=$1 AND i.key=$2`,
      [actor.id, idempotencyKey]
    );
    if (prior.rows[0]) {
      if (prior.rows[0].request_hash !== requestHash)
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used for different content.'
        );
      await client.query('COMMIT');
      return prior.rows[0];
    }
    await scopedPatient(client, patientId, actor, input.encounter_id);
    await mkdir(path.resolve(config.documents.storageDir), { recursive: true });
    finalPath = objectPath(storageKey);
    const temp = `${finalPath}.${crypto.randomUUID()}.tmp`;
    await writeFile(temp, encrypt(data), { flag: 'wx', mode: 0o600 });
    await rename(temp, finalPath);
    const result = await client.query(
      `INSERT INTO document_references(patient_id,encounter_id,category,original_filename,media_type,byte_size,checksum_sha256,storage_key,source,uploader_staff_id,authored_on,facility,confidentiality) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        patientId,
        input.encounter_id || null,
        input.category,
        filename(input.filename),
        input.media_type,
        data.length,
        checksum,
        storageKey,
        input.source,
        actor.id,
        input.authored_on || null,
        input.facility || null,
        input.confidentiality,
      ]
    );
    await client.query(`INSERT INTO document_processing_jobs(document_id,kind) VALUES($1,'scan')`, [
      result.rows[0].id,
    ]);
    await client.query(
      `INSERT INTO document_idempotency(actor_staff_id,key,request_hash,document_id) VALUES($1,$2,$3,$4)`,
      [actor.id, idempotencyKey, requestHash, result.rows[0].id]
    );
    await audit(client, actor, 'document.upload', result.rows[0].id, {
      patient_id: patientId,
      checksum,
      byte_size: data.length,
      source: input.source,
    });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    if (finalPath) await unlink(finalPath).catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
export async function list(
  filters: { patient_id?: string; status?: string; limit: number; cursor?: string },
  actor: Actor
) {
  ensureEnabled();
  const values: any[] = [
    filters.limit + 1,
    filters.patient_id || null,
    filters.status || null,
    filters.cursor || null,
    actor.role === 'doctor' ? actor.doctor_id : null,
    actor.id,
    isClinicalAdministrator(actor),
  ];
  const r = await query(
    `SELECT d.id,d.patient_id,p.full_name patient_name,d.category,d.original_filename,d.media_type,d.byte_size,d.checksum_sha256,d.source,d.authored_on,d.facility,d.confidentiality,d.status,d.rejection_code,d.review_notes,d.version,d.created_at,d.updated_at
       FROM document_references d JOIN patients p ON p.id=d.patient_id
      WHERE ($2::uuid IS NULL OR d.patient_id=$2)
        AND ($3::text IS NULL OR d.status=$3)
        AND ($4::timestamptz IS NULL OR d.created_at<$4)
        AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM encounters e WHERE e.patient_id=d.patient_id AND e.doctor_id=$5))
        AND ($7::boolean OR (p.confidentiality='normal' AND d.confidentiality='normal') OR EXISTS(
          SELECT 1 FROM patient_confidentiality_grants g
           WHERE g.patient_id=d.patient_id AND g.staff_user_id=$6 AND g.access_level='clinical'
             AND g.revoked_at IS NULL AND g.expires_at>NOW()
        ))
      ORDER BY d.created_at DESC,d.id DESC LIMIT $1`,
    values
  );
  const rows = r.rows.slice(0, filters.limit);
  return { data: rows, cursor: r.rows.length > filters.limit ? rows.at(-1)?.created_at : null };
}
export async function review(id: string, input: any, actor: Actor) {
  ensureEnabled();
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT d.* FROM document_references d WHERE d.id=$1 FOR UPDATE`,
      [id]
    );
    const row = current.rows[0];
    if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
    await scopedPatient(client, row.patient_id, actor, row.encounter_id);
    if (row.version !== input.expected_version || row.status !== 'awaiting_review')
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Document status changed. Refresh before reviewing.'
      );
    const status =
      input.decision === 'verify'
        ? 'verified'
        : input.decision === 'review'
          ? 'reviewed'
          : 'rejected';
    const rejection = input.decision === 'reject' ? 'REVIEW_REJECTED' : null;
    const r = await client.query(
      `UPDATE document_references SET status=$1,rejection_code=$2,review_notes=$3,reviewed_by_staff_id=$4,reviewed_at=CASE WHEN $1 IN ('reviewed','verified') THEN NOW() ELSE NULL END,version=version+1,updated_at=NOW() WHERE id=$5 AND version=$6 RETURNING *`,
      [status, rejection, input.notes || null, actor.id, id, input.expected_version]
    );
    await audit(client, actor, `document.${status}`, id, {
      patient_id: row.patient_id,
      reason: input.notes || null,
    });
    await client.query('COMMIT');
    return r.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
export async function download(id: string, actor: Actor, expectedPatientId?: string) {
  ensureEnabled();
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const r = await client.query(`SELECT * FROM document_references WHERE id=$1`, [id]),
      row = r.rows[0];
    if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
    if (expectedPatientId && row.patient_id !== expectedPatientId)
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
    await scopedPatient(client, row.patient_id, actor, row.encounter_id, 'document_content');
    if (!['awaiting_review', 'reviewed', 'verified'].includes(row.status))
      throw new AppError(
        409,
        'DOCUMENT_NOT_CLEARED',
        'This file is not available until malware scanning succeeds.'
      );
    await audit(client, actor, 'document.download', id, { patient_id: row.patient_id });
    await client.query('COMMIT');
    return { ...row, data: decrypt(await readFile(objectPath(row.storage_key))) };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
export async function processJobs() {
  if (!config.documents.enabled) return;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const job = (
      await client.query(
        `SELECT j.*,d.storage_key,d.media_type FROM document_processing_jobs j JOIN document_references d ON d.id=j.document_id WHERE j.kind='scan' AND j.status IN ('pending','failed') AND j.available_at<=NOW() ORDER BY j.created_at FOR UPDATE SKIP LOCKED LIMIT 1`
      )
    ).rows[0];
    if (!job) {
      await client.query('COMMIT');
      return;
    }
    await client.query(
      `UPDATE document_processing_jobs SET status='running',locked_at=NOW(),attempts=attempts+1 WHERE id=$1`,
      [job.id]
    );
    let clean = false;
    try {
      const bytes = decrypt(await readFile(objectPath(job.storage_key)));
      if (!signatureOk(job.media_type, bytes)) throw new Error('Stored type signature mismatch');
      clean =
        config.documents.scannerMode === 'clamav'
          ? await clamScan(bytes)
          : config.documents.scannerMode === 'development';
      if (config.documents.scannerMode === 'disabled') throw new Error('Scanner disabled');
    } catch (e) {
      const attempts = job.attempts + 1,
        status = attempts >= 5 ? 'dead_letter' : 'failed';
      await client.query(
        `UPDATE document_processing_jobs SET status=$1,last_error_code='SCAN_UNAVAILABLE',available_at=NOW()+($2||' minutes')::interval,updated_at=NOW() WHERE id=$3`,
        [status, String(2 ** attempts), job.id]
      );
      await client.query('COMMIT');
      return;
    }
    await client.query(
      `UPDATE document_processing_jobs SET status='succeeded',updated_at=NOW() WHERE id=$1`,
      [job.id]
    );
    await client.query(
      `UPDATE document_references SET status=$1,rejection_code=$2,version=version+1,updated_at=NOW() WHERE id=$3`,
      [clean ? 'awaiting_review' : 'rejected', clean ? null : 'MALWARE_OR_UNSAFE', job.document_id]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
