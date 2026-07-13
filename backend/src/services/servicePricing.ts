import { getClient, query } from '../config/database';

type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

export type ServicePriceInput = {
  code: string;
  name: string;
  description?: string | null;
  category: 'consultation' | 'counselling' | 'diagnostic' | 'other';
  doctor_id?: string | null;
  appointment_type?: 'new' | 'follow_up' | null;
  price: number;
  is_active?: boolean;
  is_public?: boolean;
  effective_from: string;
  change_reason: string;
};

export async function resolveServicePrice(
  db: Queryable,
  code: string,
  doctorId?: string | null,
  appointmentType?: string | null,
  publicOnly = false
) {
  const result = await db.query(
    `SELECT s.id, s.code, s.name, s.description, s.category, s.doctor_id,
            s.appointment_type, s.currency, s.is_active, s.is_public,
            h.price, h.version, h.effective_from, d.name AS doctor_name
     FROM billable_services s
     JOIN billable_service_price_history h ON h.service_id = s.id
     LEFT JOIN doctors d ON d.id = s.doctor_id
     WHERE s.code = $1 AND s.is_active = true
       AND h.effective_from <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       AND (s.doctor_id IS NULL OR s.doctor_id = $2::uuid)
       AND (s.appointment_type IS NULL OR s.appointment_type = $3)
       AND ($4::boolean = false OR s.is_public = true)
     ORDER BY (s.doctor_id IS NOT NULL) DESC, (s.appointment_type IS NOT NULL) DESC,
              h.effective_from DESC, h.version DESC
     LIMIT 1`,
    [code, doctorId || null, appointmentType || null, publicOnly]
  );
  if (!result.rows[0]) {
    const error = new Error(`No active price is configured for ${code}`) as Error & { status?: number; code?: string };
    error.status = 409;
    error.code = 'SERVICE_PRICE_NOT_CONFIGURED';
    throw error;
  }
  return result.rows[0];
}

export async function getPublicConsultationPrice(doctorId?: string, appointmentType?: string) {
  return resolveServicePrice({ query }, 'consultation', doctorId, appointmentType, true);
}

export async function listBillableServices() {
  const result = await query(
    `SELECT s.*, d.name AS doctor_name,
            COALESCE((SELECT json_agg(h ORDER BY h.version DESC)
                      FROM (SELECT version, price, effective_from, change_reason, changed_at
                            FROM billable_service_price_history
                            WHERE service_id = s.id ORDER BY version DESC LIMIT 10) h), '[]') AS price_history
     FROM billable_services s
     LEFT JOIN doctors d ON d.id = s.doctor_id
     ORDER BY s.category, s.name, d.name NULLS FIRST, s.appointment_type NULLS FIRST`
  );
  return result.rows;
}

export async function createBillableService(input: ServicePriceInput, actorStaffId: string) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO billable_services
       (code, name, description, category, doctor_id, appointment_type, price, is_active,
        is_public, effective_from, change_reason, created_by_staff_id, updated_by_staff_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING *`,
      [input.code, input.name, input.description || null, input.category, input.doctor_id || null,
       input.appointment_type || null, input.price, input.is_active ?? true, input.is_public ?? true,
       input.effective_from, input.change_reason, actorStaffId]
    );
    const service = result.rows[0];
    await client.query(
      `INSERT INTO billable_service_price_history
       (service_id, version, price, currency, effective_from, change_reason, changed_by_staff_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [service.id, service.version, service.price, service.currency, service.effective_from, service.change_reason, actorStaffId]
    );
    await client.query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'service_price.created', 'billable_service', $2, $3)`,
      [actorStaffId, service.id, JSON.stringify({ code: service.code, price: service.price, currency: service.currency })]
    );
    await client.query('COMMIT');
    return service;
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const conflict = new Error('A service already exists for this code, doctor, and appointment type') as Error & { status?: number };
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  } finally { client.release(); }
}

export async function updateBillableService(id: string, input: ServicePriceInput & { expected_version: number }, actorStaffId: string) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE billable_services SET
         code=$1, name=$2, description=$3, category=$4, doctor_id=$5, appointment_type=$6,
         price=$7, is_active=$8, is_public=$9, effective_from=$10, change_reason=$11,
         version=version+1, updated_by_staff_id=$12, updated_at=NOW()
       WHERE id=$13 AND version=$14 RETURNING *`,
      [input.code, input.name, input.description || null, input.category, input.doctor_id || null,
       input.appointment_type || null, input.price, input.is_active ?? true, input.is_public ?? true,
       input.effective_from, input.change_reason, actorStaffId, id, input.expected_version]
    );
    const service = result.rows[0];
    if (!service) {
      const conflict = new Error('This service was changed by another administrator. Refresh and try again.') as Error & { status?: number };
      conflict.status = 409;
      throw conflict;
    }
    await client.query(
      `INSERT INTO billable_service_price_history
       (service_id, version, price, currency, effective_from, change_reason, changed_by_staff_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [service.id, service.version, service.price, service.currency, service.effective_from, service.change_reason, actorStaffId]
    );
    await client.query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'service_price.updated', 'billable_service', $2, $3)`,
      [actorStaffId, service.id, JSON.stringify({ version: service.version, price: service.price, active: service.is_active, reason: service.change_reason })]
    );
    await client.query('COMMIT');
    return service;
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const conflict = new Error('A service already exists for this code, doctor, and appointment type') as Error & { status?: number };
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
  finally { client.release(); }
}
