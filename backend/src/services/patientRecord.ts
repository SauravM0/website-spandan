import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { getClient, query } from '../config/database';
import { config } from '../config';
import { AppError } from '../utils/errors';
import {
  assertPatientClinicalAccess,
  isClinicalAdministrator,
  restrictedClinicalPredicate,
  type ClinicalActor,
} from '../security/clinicalAuthorization';

type Actor = ClinicalActor;
const clinicalTypes = [
  'condition',
  'allergy',
  'medication',
  'observation',
  'diagnostic_report',
  'document',
  'prescription',
  'procedure',
  'care_plan',
] as const;
export type ClinicalResourceType = (typeof clinicalTypes)[number];

function requireClinicalGovernance() {
  if (!config.patientRecord.clinicalWritesEnabled)
    throw new AppError(
      503,
      'CLINICAL_GOVERNANCE_REQUIRED',
      'Clinical authoring is not enabled. Required governance approvals have not been recorded.'
    );
}
async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
async function audit(
  client: PoolClient,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  after: Record<string, unknown> = {}
) {
  await client.query(
    `INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)`,
    [actor.id, action, entityType, entityId, JSON.stringify(after)]
  );
}
function scopeSql(actor: Actor, alias = 'e') {
  return actor.role === 'doctor'
    ? { sql: ` AND ${alias}.doctor_id = $2`, params: [actor.doctor_id] }
    : { sql: '', params: [] as unknown[] };
}

export async function searchPatients(
  search: string,
  pageSize: number,
  actor: Actor,
  cursor?: string
) {
  const term = search.trim();
  const result = await query(
    `SELECT p.id,p.full_name,p.date_of_birth,p.age_years,p.gender,p.preferred_language,p.confidentiality,p.updated_at,
            RIGHT(regexp_replace(p.phone,'\\D','','g'),4) AS phone_last4,
            EXISTS(SELECT 1 FROM patient_match_reviews mr WHERE (mr.candidate_patient_id=p.id OR mr.possible_patient_id=p.id) AND mr.status='pending') AS duplicate_warning
       FROM patients p
      WHERE p.archived_at IS NULL
        AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM encounters e WHERE e.patient_id=p.id AND e.doctor_id=$4))
        AND ($5::boolean OR p.confidentiality='normal' OR EXISTS(
          SELECT 1 FROM patient_confidentiality_grants g
           WHERE g.patient_id=p.id AND g.staff_user_id=$6 AND g.access_level='clinical'
             AND g.revoked_at IS NULL AND g.expires_at>NOW()
        ))
        AND ($1='' OR p.full_name ILIKE '%'||$1||'%' OR RIGHT(regexp_replace(p.phone,'\\D','','g'),4)=$1
        OR EXISTS(SELECT 1 FROM patient_identifiers pi WHERE pi.patient_id=p.id AND pi.status='active' AND pi.value_normalized ILIKE '%'||LOWER($1)||'%'))
        AND ($2::timestamptz IS NULL OR p.updated_at < $2)
      ORDER BY p.updated_at DESC,p.id DESC LIMIT $3`,
    [
      term,
      cursor || null,
      pageSize + 1,
      actor.role === 'doctor' ? actor.doctor_id : null,
      isClinicalAdministrator(actor),
      actor.id,
    ]
  );
  const rows = result.rows.slice(0, pageSize);
  return {
    data: rows,
    cursor: result.rows.length > pageSize ? rows[rows.length - 1].updated_at : null,
  };
}

export async function getPatientSummary(id: string, actor: Actor) {
  const patient = await query(
    `SELECT id,full_name,date_of_birth,exact_dob_known,age_years,age_months,age_days,gender,preferred_language,confidentiality,version,created_at,updated_at FROM patients WHERE id=$1 AND archived_at IS NULL`,
    [id]
  );
  if (!patient.rows[0]) throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
  await assertPatientClinicalAccess({ query }, id, actor);
  const [identifiers, relationships] = await Promise.all([
    query(
      `SELECT id,system,display_masked,status,source,valid_from,valid_until FROM patient_identifiers WHERE patient_id=$1 ORDER BY created_at DESC`,
      [id]
    ),
    query(
      `SELECT id,full_name,relationship,access_status,created_at FROM patient_relationships WHERE patient_id=$1 ORDER BY created_at DESC`,
      [id]
    ),
  ]);
  return {
    patient: patient.rows[0],
    identifiers: identifiers.rows,
    relationships: relationships.rows,
  };
}

export async function getPatientAppointments(id: string, actor: Actor) {
  await assertPatientClinicalAccess({ query }, id, actor);
  const scope = scopeSql(actor, 'a');
  const result = await query(
    `SELECT a.id,a.appointment_date,a.start_time,a.end_time,a.status,a.booking_state,a.appointment_type,
            a.payment_status,a.doctor_id,d.name doctor_name,a.reschedule_count,a.last_rescheduled_at,
            COALESCE((
              SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
                'id',event.id,'outcome',event.outcome,'reason',event.reason,
                'before',event.before_snapshot,'after',event.after_snapshot,'created_at',event.created_at
              ) ORDER BY event.created_at,event.id)
              FROM appointment_reschedule_events event WHERE event.appointment_id=a.id
            ),'[]'::jsonb) AS reschedule_history,
            a.created_at,a.updated_at
       FROM appointments a JOIN doctors d ON d.id=a.doctor_id
      WHERE a.patient_id=$1${scope.sql}
      ORDER BY a.appointment_date DESC,a.start_time DESC,a.id DESC LIMIT 100`,
    [id, ...scope.params]
  );
  return { appointments: result.rows };
}

export async function getPatientClinical(id: string, actor: Actor) {
  await assertPatientClinicalAccess({ query }, id, actor);
  const scope = scopeSql(actor);
  const actorParameter = 2 + scope.params.length;
  const restrictedResources = restrictedClinicalPredicate(actor, 'cr', 'p', actorParameter);
  const restrictedNotes = restrictedClinicalPredicate(actor, 'n', 'p', actorParameter);
  const [encounters, resources, notes] = await Promise.all([
    query(
      `SELECT e.id,e.patient_id,e.appointment_id,e.doctor_id,e.status,e.type,e.started_at,e.ended_at,e.version,e.created_at,e.updated_at,d.name doctor_name
         FROM encounters e JOIN doctors d ON d.id=e.doctor_id
        WHERE e.patient_id=$1${scope.sql}
        ORDER BY COALESCE(e.started_at,e.created_at) DESC LIMIT 100`,
      [id, ...scope.params]
    ),
    query(
      `SELECT cr.id,cr.patient_id,cr.encounter_id,cr.resource_type,cr.status,cr.verification_status,
              cr.code_system,cr.code,cr.display,cr.value,cr.source,cr.confidentiality,cr.version,cr.authored_at
         FROM clinical_resources cr JOIN patients p ON p.id=cr.patient_id
        WHERE cr.patient_id=$1
          AND (cr.encounter_id IS NULL OR EXISTS(SELECT 1 FROM encounters e WHERE e.id=cr.encounter_id${scope.sql}))
          ${restrictedResources.sql}
        ORDER BY cr.authored_at DESC LIMIT 200`,
      [id, ...scope.params, ...restrictedResources.params]
    ),
    query(
      `SELECT n.id,n.note_id,n.encounter_id,n.version,n.state,n.confidentiality,n.author_staff_id,
              n.signed_at,n.created_at,n.amendment_reason
         FROM clinical_note_versions n JOIN patients p ON p.id=n.patient_id
        WHERE n.patient_id=$1
          AND EXISTS(SELECT 1 FROM encounters e WHERE e.id=n.encounter_id${scope.sql})
          ${restrictedNotes.sql}
        ORDER BY n.created_at DESC LIMIT 100`,
      [id, ...scope.params, ...restrictedNotes.params]
    ),
  ]);
  return {
    encounters: encounters.rows,
    resources: resources.rows,
    notes: notes.rows,
    clinicalWritesEnabled: config.patientRecord.clinicalWritesEnabled,
  };
}

export async function createEncounter(patientId: string, input: any, actor: Actor) {
  requireClinicalGovernance();
  return tx(async (client) => {
    if (actor.role === 'doctor' && actor.doctor_id !== input.doctor_id)
      throw new AppError(
        403,
        'CLINICAL_SCOPE_DENIED',
        'Doctors may only open their own encounters'
      );
    const patient = await client.query(
      'SELECT id FROM patients WHERE id=$1 AND archived_at IS NULL FOR SHARE',
      [patientId]
    );
    if (!patient.rows[0]) throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    if (input.appointment_id) {
      const appointment = await client.query(
        'SELECT id FROM appointments WHERE id=$1 AND patient_id=$2 AND doctor_id=$3',
        [input.appointment_id, patientId, input.doctor_id]
      );
      if (!appointment.rows[0])
        throw new AppError(
          409,
          'ENCOUNTER_CONTEXT_MISMATCH',
          'Appointment does not match this patient and clinician'
        );
    }
    const result = await client.query(
      `INSERT INTO encounters(patient_id,appointment_id,doctor_id,status,type,started_at,opened_by_staff_id) VALUES($1,$2,$3,'in_progress',$4,COALESCE($5,NOW()),$6) RETURNING *`,
      [
        patientId,
        input.appointment_id || null,
        input.doctor_id,
        input.type,
        input.started_at || null,
        actor.id,
      ]
    );
    await audit(client, actor, 'encounter.open', 'encounter', result.rows[0].id, {
      patient_id: patientId,
    });
    return result.rows[0];
  });
}

export async function closeEncounter(id: string, expectedVersion: number, actor: Actor) {
  requireClinicalGovernance();
  return tx(async (client) => {
    const scope = scopeSql(actor);
    const result = await client.query(
      `UPDATE encounters e SET status='finished',ended_at=NOW(),closed_by_staff_id=$1,version=version+1,updated_at=NOW() WHERE e.id=$2 AND e.version=$3 AND e.status='in_progress'${scope.sql.replace('$2', '$4')} RETURNING e.*`,
      [actor.id, id, expectedVersion, ...scope.params]
    );
    if (!result.rows[0])
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Encounter changed or is no longer open. Refresh before retrying.'
      );
    await audit(client, actor, 'encounter.close', 'encounter', id);
    return result.rows[0];
  });
}

export async function createResource(
  patientId: string,
  input: any,
  actor: Actor,
  idempotencyKey: string
) {
  requireClinicalGovernance();
  return tx(async (client) => {
    await assertPatientClinicalAccess(client, patientId, actor, 'clinical', input.encounter_id);
    const prior = await client.query(
      'SELECT response FROM patient_record_idempotency WHERE actor_staff_id=$1 AND key=$2',
      [actor.id, idempotencyKey]
    );
    if (prior.rows[0]) return prior.rows[0].response;
    if (input.encounter_id) {
      const doctorScope = actor.role === 'doctor' ? ' AND e.doctor_id=$3' : '';
      const e = await client.query(
        `SELECT e.id FROM encounters e WHERE e.id=$1 AND e.patient_id=$2${doctorScope}`,
        [input.encounter_id, patientId, ...(actor.role === 'doctor' ? [actor.doctor_id] : [])]
      );
      if (!e.rows[0])
        throw new AppError(
          403,
          'CLINICAL_SCOPE_DENIED',
          'Encounter is outside your clinical context'
        );
    }
    const result = await client.query(
      `INSERT INTO clinical_resources(patient_id,encounter_id,resource_type,status,verification_status,code_system,code,display,value,original_text,source,confidentiality,authored_by_staff_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        patientId,
        input.encounter_id || null,
        input.resource_type,
        input.status,
        input.verification_status,
        input.code_system || null,
        input.code || null,
        input.display,
        JSON.stringify(input.value || {}),
        input.original_text || null,
        input.source,
        input.confidentiality,
        actor.id,
      ]
    );
    await audit(client, actor, 'clinical_resource.create', input.resource_type, result.rows[0].id, {
      patient_id: patientId,
      source: input.source,
      verification_status: input.verification_status,
    });
    await client.query(
      'INSERT INTO patient_record_idempotency(actor_staff_id,key,operation,response) VALUES($1,$2,$3,$4)',
      [actor.id, idempotencyKey, 'clinical_resource.create', JSON.stringify(result.rows[0])]
    );
    return result.rows[0];
  });
}

export async function saveNote(patientId: string, input: any, actor: Actor) {
  requireClinicalGovernance();
  return tx(async (client) => {
    await assertPatientClinicalAccess(client, patientId, actor, 'clinical', input.encounter_id);
    const doctorScope = actor.role === 'doctor' ? ' AND e.doctor_id=$3' : '';
    const e = await client.query(
      `SELECT e.id FROM encounters e WHERE e.id=$1 AND e.patient_id=$2${doctorScope}`,
      [input.encounter_id, patientId, ...(actor.role === 'doctor' ? [actor.doctor_id] : [])]
    );
    if (!e.rows[0])
      throw new AppError(
        403,
        'CLINICAL_SCOPE_DENIED',
        'Encounter is outside your clinical context'
      );
    const noteId = input.note_id || crypto.randomUUID();
    if (input.expected_version === 0) {
      const created = await client.query(
        `INSERT INTO clinical_note_versions(note_id,patient_id,encounter_id,version,state,confidentiality,body,author_staff_id) VALUES($1,$2,$3,1,'draft',$4,$5,$6) RETURNING *`,
        [noteId, patientId, input.encounter_id, input.confidentiality, input.body, actor.id]
      );
      await audit(client, actor, 'clinical_note.draft', 'clinical_note', noteId);
      return created.rows[0];
    }
    const updated = await client.query(
      `UPDATE clinical_note_versions SET body=$1,confidentiality=$2 WHERE note_id=$3 AND version=$4 AND state='draft' AND author_staff_id=$5 RETURNING *`,
      [input.body, input.confidentiality, noteId, input.expected_version, actor.id]
    );
    if (!updated.rows[0])
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Draft changed, was signed, or belongs to another author'
      );
    return updated.rows[0];
  });
}

export async function signNote(
  noteId: string,
  expectedVersion: number,
  confirmedPatientId: string,
  actor: Actor
) {
  requireClinicalGovernance();
  return tx(async (client) => {
    await assertPatientClinicalAccess(client, confirmedPatientId, actor);
    const result = await client.query(
      `UPDATE clinical_note_versions SET state='signed',signed_at=NOW() WHERE note_id=$1 AND version=$2 AND state='draft' AND author_staff_id=$3 AND patient_id=$4 RETURNING *`,
      [noteId, expectedVersion, actor.id, confirmedPatientId]
    );
    if (!result.rows[0])
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Patient confirmation failed, or this draft changed or belongs to another author'
      );
    await audit(client, actor, 'clinical_note.sign', 'clinical_note', noteId);
    return result.rows[0];
  });
}

export async function amendNote(noteId: string, input: any, actor: Actor) {
  requireClinicalGovernance();
  return tx(async (client) => {
    const current = await client.query(
      `SELECT * FROM clinical_note_versions WHERE note_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE`,
      [noteId]
    );
    const row = current.rows[0];
    if (row)
      await assertPatientClinicalAccess(
        client,
        row.patient_id,
        actor,
        'clinical',
        row.encounter_id
      );
    if (!row || row.state === 'draft' || row.version !== input.expected_version)
      throw new AppError(409, 'VERSION_CONFLICT', 'Refresh the signed note before amending');
    const result = await client.query(
      `INSERT INTO clinical_note_versions(note_id,patient_id,encounter_id,version,state,confidentiality,body,author_staff_id,amendment_reason,signed_at) VALUES($1,$2,$3,$4,'amended',$5,$6,$7,$8,NOW()) RETURNING *`,
      [
        noteId,
        row.patient_id,
        row.encounter_id,
        row.version + 1,
        input.confidentiality,
        input.body,
        actor.id,
        input.reason,
      ]
    );
    await audit(client, actor, 'clinical_note.amend', 'clinical_note', noteId, {
      reason: input.reason,
      version: row.version + 1,
    });
    return result.rows[0];
  });
}
