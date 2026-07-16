import { AppError } from '../utils/errors';

export type ClinicalActor = {
  id: string;
  role: string;
  doctor_id: string | null;
};

export type SensitiveAccessLevel = 'clinical' | 'document_content';
type Queryable = {
  query: (...args: any[]) => Promise<{ rows: any[] }>;
};

export const isClinicalAdministrator = (actor: ClinicalActor): boolean =>
  actor.role === 'admin' || actor.role === 'system_admin';

export async function assertPatientClinicalAccess(
  client: Queryable,
  patientId: string,
  actor: ClinicalActor,
  accessLevel: SensitiveAccessLevel = 'clinical',
  encounterId?: string | null
): Promise<void> {
  const result = await client.query(
    `SELECT p.id
       FROM patients p
      WHERE p.id=$1 AND p.archived_at IS NULL
        AND ($5::uuid IS NULL OR EXISTS (
          SELECT 1 FROM encounters requested_encounter
           WHERE requested_encounter.patient_id=p.id AND requested_encounter.id=$5
        ))
        AND (
          $3::boolean
          OR (
            ($4::uuid IS NULL OR EXISTS (
              SELECT 1 FROM encounters e
               WHERE e.patient_id=p.id AND e.doctor_id=$4
                 AND ($5::uuid IS NULL OR e.id=$5)
            ))
            AND (
              p.confidentiality='normal'
              OR EXISTS (
                SELECT 1 FROM patient_confidentiality_grants g
                 WHERE g.patient_id=p.id AND g.staff_user_id=$2
                   AND g.access_level=$6::text
                   AND g.revoked_at IS NULL AND g.expires_at>NOW()
              )
            )
          )
        )`,
    [
      patientId,
      actor.id,
      isClinicalAdministrator(actor),
      actor.role === 'doctor' ? actor.doctor_id : null,
      encounterId || null,
      accessLevel,
    ]
  );
  if (!result.rows[0]) {
    throw new AppError(
      403,
      accessLevel === 'document_content'
        ? 'DOCUMENT_CONTENT_SCOPE_DENIED'
        : 'CLINICAL_SCOPE_DENIED',
      'This patient or encounter is outside your authorized context.'
    );
  }
}

export function restrictedClinicalPredicate(
  actor: ClinicalActor,
  confidentialityAlias: string,
  patientAlias: string,
  actorParameter: number
): { sql: string; params: unknown[] } {
  if (isClinicalAdministrator(actor)) return { sql: '', params: [] };
  return {
    sql: ` AND (${confidentialityAlias}.confidentiality='normal' OR EXISTS (
      SELECT 1 FROM patient_confidentiality_grants g
       WHERE g.patient_id=${patientAlias}.id AND g.staff_user_id=$${actorParameter}
         AND g.access_level='clinical' AND g.revoked_at IS NULL AND g.expires_at>NOW()
    ))`,
    params: [actor.id],
  };
}
