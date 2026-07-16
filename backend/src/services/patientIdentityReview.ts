import { getClient, query } from '../config/database';
import { AppError } from '../utils/errors';

export type IdentityFactor = 'name' | 'date_of_birth' | 'phone' | 'authorized_identifier';
export type IdentityReviewOutcome = 'same_person' | 'different_person' | 'insufficient_evidence';

export function matchingIdentityFactors(
  left: { full_name: unknown; date_of_birth?: unknown; phone?: unknown },
  right: { full_name: unknown; date_of_birth?: unknown; phone?: unknown },
  authorizedIdentifierMatch = false
) {
  const factors: IdentityFactor[] = [];
  if (String(left.full_name).trim().toLowerCase() === String(right.full_name).trim().toLowerCase())
    factors.push('name');
  if (left.date_of_birth && String(left.date_of_birth) === String(right.date_of_birth))
    factors.push('date_of_birth');
  const normalizePhone = (value: unknown) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };
  const leftPhone = normalizePhone(left.phone);
  const rightPhone = normalizePhone(right.phone);
  if (leftPhone && leftPhone === rightPhone) factors.push('phone');
  if (authorizedIdentifierMatch) factors.push('authorized_identifier');
  return factors;
}

function maskPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `******${digits.slice(-4)}` : null;
}

async function detectedFactors(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  left: any,
  right: any
) {
  const identifier = await client.query(
    `SELECT 1 FROM patient_identifiers left_id JOIN patient_identifiers right_id
       ON right_id.system=left_id.system AND right_id.value_normalized=left_id.value_normalized
      AND right_id.status='active'
     WHERE left_id.patient_id=$1 AND right_id.patient_id=$2 AND left_id.status='active' LIMIT 1`,
    [left.id, right.id]
  );
  return matchingIdentityFactors(left, right, Boolean(identifier.rows[0]));
}

function patientReviewDto(row: any) {
  return {
    id: row.id,
    status: row.status,
    version: Number(row.version),
    reason_codes: row.reason_codes,
    created_at: row.created_at,
    candidate: {
      id: row.candidate_patient_id,
      full_name: row.candidate_name,
      date_of_birth: row.candidate_dob,
      phone_masked: maskPhone(row.candidate_phone),
      appointment_count: Number(row.candidate_appointments || 0),
      order_count: Number(row.candidate_orders || 0),
    },
    possible: {
      id: row.possible_patient_id,
      full_name: row.possible_name,
      date_of_birth: row.possible_dob,
      phone_masked: maskPhone(row.possible_phone),
      appointment_count: Number(row.possible_appointments || 0),
      order_count: Number(row.possible_orders || 0),
    },
  };
}

const reviewSelect = `
  SELECT review.*,
         candidate.full_name candidate_name,candidate.date_of_birth candidate_dob,candidate.phone candidate_phone,
         possible.full_name possible_name,possible.date_of_birth possible_dob,possible.phone possible_phone,
         (SELECT COUNT(*) FROM appointments WHERE patient_id=candidate.id) candidate_appointments,
         (SELECT COUNT(*) FROM appointments WHERE patient_id=possible.id) possible_appointments,
         (SELECT COUNT(DISTINCT order_id) FROM (
            SELECT order_id FROM package_order_items WHERE patient_id=candidate.id
            UNION ALL SELECT order_id FROM custom_test_order_items WHERE patient_id=candidate.id
          ) candidate_order_ids) candidate_orders,
         (SELECT COUNT(DISTINCT order_id) FROM (
            SELECT order_id FROM package_order_items WHERE patient_id=possible.id
            UNION ALL SELECT order_id FROM custom_test_order_items WHERE patient_id=possible.id
          ) possible_order_ids) possible_orders
    FROM patient_match_reviews review
    JOIN patients candidate ON candidate.id=review.candidate_patient_id
    JOIN patients possible ON possible.id=review.possible_patient_id`;

export async function listIdentityReviews(status = 'pending', limit = 50) {
  const result = await query(
    `${reviewSelect} WHERE review.status=$1 ORDER BY review.created_at,review.id LIMIT $2`,
    [status, Math.min(100, Math.max(1, limit))]
  );
  const data = [];
  for (const row of result.rows) {
    const dto: any = patientReviewDto(row);
    dto.detected_factors = await detectedFactors(
      { query },
      rowToPatient(row, 'candidate'),
      rowToPatient(row, 'possible')
    );
    data.push(dto);
  }
  return { data };
}

function rowToPatient(row: any, side: 'candidate' | 'possible') {
  return {
    id: row[`${side}_patient_id`],
    full_name: row[`${side}_name`],
    date_of_birth: row[`${side}_dob`],
    phone: row[`${side}_phone`],
  };
}

export async function resolveIdentityReview(input: {
  reviewId: string;
  outcome: IdentityReviewOutcome;
  canonicalPatientId?: string;
  confirmedFactors: IdentityFactor[];
  reason: string;
  expectedVersion: number;
  actorStaffId: string;
  idempotencyKey: string;
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const replay = await client.query(
      `SELECT response_snapshot FROM patient_identity_review_events
       WHERE review_id=$1 AND idempotency_key=$2`,
      [input.reviewId, input.idempotencyKey]
    );
    if (replay.rows[0]) {
      await client.query('COMMIT');
      return replay.rows[0].response_snapshot;
    }
    const reviewResult = await client.query(
      'SELECT * FROM patient_match_reviews WHERE id=$1 FOR UPDATE',
      [input.reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw new AppError(404, 'IDENTITY_REVIEW_NOT_FOUND', 'Identity review not found.');
    const lockedReplay = await client.query(
      `SELECT response_snapshot FROM patient_identity_review_events
       WHERE review_id=$1 AND idempotency_key=$2`,
      [input.reviewId, input.idempotencyKey]
    );
    if (lockedReplay.rows[0]) {
      await client.query('COMMIT');
      return lockedReplay.rows[0].response_snapshot;
    }
    if (review.status !== 'pending' || Number(review.version) !== input.expectedVersion) {
      throw new AppError(
        409,
        'IDENTITY_REVIEW_VERSION_CONFLICT',
        `Review is ${review.status} at version ${review.version}. Refresh before retrying.`
      );
    }
    const patients = await client.query(
      `SELECT id,full_name,date_of_birth,phone,archived_at FROM patients
       WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [[review.candidate_patient_id, review.possible_patient_id]]
    );
    if (patients.rows.length !== 2 || patients.rows.some((patient) => patient.archived_at)) {
      throw new AppError(
        409,
        'IDENTITY_REVIEW_PATIENT_UNAVAILABLE',
        'Both source records must remain active.'
      );
    }
    const candidate = patients.rows.find((patient) => patient.id === review.candidate_patient_id);
    const possible = patients.rows.find((patient) => patient.id === review.possible_patient_id);
    const detected = await detectedFactors(client, candidate, possible);
    const confirmed = [...new Set(input.confirmedFactors)];
    if (confirmed.some((factor) => !detected.includes(factor))) {
      throw new AppError(
        409,
        'IDENTITY_FACTOR_MISMATCH',
        'A confirmed factor does not currently match both source records.'
      );
    }
    let sourcePatientId: string | null = null;
    if (input.outcome === 'same_person') {
      if (
        !input.canonicalPatientId ||
        ![candidate.id, possible.id].includes(input.canonicalPatientId)
      ) {
        throw new AppError(
          400,
          'IDENTITY_CANONICAL_PATIENT_INVALID',
          'Choose one reviewed record as canonical.'
        );
      }
      if (confirmed.length < 2 || confirmed.some((factor) => !detected.includes(factor))) {
        throw new AppError(
          409,
          'IDENTITY_TWO_FACTOR_CONFIRMATION_REQUIRED',
          'Confirm at least two matching identity factors that are present on both records.'
        );
      }
      sourcePatientId = candidate.id === input.canonicalPatientId ? possible.id : candidate.id;
      const linkConflict = await client.query(
        `SELECT * FROM patient_redirects
         WHERE reversed_at IS NULL AND (source_patient_id=ANY($1::uuid[]) OR target_patient_id=ANY($1::uuid[]))
         FOR UPDATE`,
        [[candidate.id, possible.id]]
      );
      if (linkConflict.rows.length) {
        throw new AppError(
          409,
          'IDENTITY_LINK_CONFLICT',
          'One record already belongs to an identity group. Review the canonical record first.'
        );
      }
      await client.query(
        `INSERT INTO patient_redirects(source_patient_id,target_patient_id,reason,merged_by_staff_id)
         VALUES($1,$2,$3,$4)`,
        [sourcePatientId, input.canonicalPatientId, input.reason, input.actorStaffId]
      );
    }
    const updated = await client.query(
      `UPDATE patient_match_reviews
       SET status=$1,resolution=$1,canonical_patient_id=$2,confirmed_factors=$3,
           resolution_notes=$4,reviewed_by_staff_id=$5,reviewed_at=NOW(),version=version+1
       WHERE id=$6 AND version=$7 RETURNING *`,
      [
        input.outcome,
        input.outcome === 'same_person' ? input.canonicalPatientId : null,
        confirmed,
        input.reason,
        input.actorStaffId,
        input.reviewId,
        input.expectedVersion,
      ]
    );
    if (!updated.rows[0])
      throw new AppError(
        409,
        'IDENTITY_REVIEW_VERSION_CONFLICT',
        'Review changed during resolution.'
      );
    const response = {
      review_id: input.reviewId,
      status: input.outcome,
      version: Number(updated.rows[0].version),
      canonical_patient_id: input.outcome === 'same_person' ? input.canonicalPatientId : null,
      linked_source_patient_id: sourcePatientId,
      confirmed_factors: confirmed,
    };
    await client.query(
      `INSERT INTO patient_identity_review_events
         (review_id,idempotency_key,outcome,canonical_patient_id,confirmed_factors,reason,
          version_before,version_after,actor_staff_id,response_snapshot)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        input.reviewId,
        input.idempotencyKey,
        input.outcome,
        response.canonical_patient_id,
        confirmed,
        input.reason,
        input.expectedVersion,
        response.version,
        input.actorStaffId,
        JSON.stringify(response),
      ]
    );
    await client.query(
      `INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata)
       VALUES($1,'patient_identity_review.resolved','patient_match_review',$2,$3)`,
      [
        input.actorStaffId,
        input.reviewId,
        JSON.stringify({
          outcome: input.outcome,
          confirmed_factors: confirmed,
          canonical_patient_id: response.canonical_patient_id,
        }),
      ]
    );
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
