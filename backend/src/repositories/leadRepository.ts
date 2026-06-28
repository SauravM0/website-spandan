import { getClient, query } from '../config/database';
import {
  AppointmentRequest,
  LeadFilters,
  LeadStatusHistory,
  PaginatedResult,
} from '../domain/entities';
import { buildInsert } from '../persistence/sqlBuilders';

export async function getAppointmentRequests(status?: string): Promise<AppointmentRequest[]> {
  let sql = 'SELECT * FROM appointment_requests';
  const params: string[] = [];

  if (status) {
    sql += ' WHERE status = $1';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';
  const result = await query(sql, params.length ? params : undefined);
  return result.rows;
}

export async function getAppointmentRequestById(id: string): Promise<any | null> {
  const result = await query(
    `SELECT ar.*, p.name as package_name, p.slug as package_slug,
            d.name as doctor_name, d.slug as doctor_slug
     FROM appointment_requests ar
     LEFT JOIN packages p ON ar.package_id = p.id
     LEFT JOIN doctors d ON ar.doctor_id = d.id
     WHERE ar.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createAppointmentRequest(
  data: Partial<AppointmentRequest>
): Promise<AppointmentRequest> {
  const statement = buildInsert('appointment_requests', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function createPublicEnquiryWithInitialHistory(data: {
  package_id: string;
  doctor_id: string | null;
  patient_name: string;
  phone: string;
  email: string | null;
  referring_doctor_name: string | null;
  referring_doctor_phone: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  source_language: string;
}): Promise<AppointmentRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const enquiryResult = await client.query(
      `INSERT INTO appointment_requests
       (package_id, doctor_id, patient_name, phone, email,
        referring_doctor_name, referring_doctor_phone,
        preferred_date, preferred_time_window,
        source_language, status, consent_given_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', NOW())
       RETURNING *`,
      [
        data.package_id,
        data.doctor_id,
        data.patient_name,
        data.phone,
        data.email,
        data.referring_doctor_name,
        data.referring_doctor_phone,
        data.preferred_date,
        data.preferred_time_window,
        data.source_language,
      ]
    );
    const enquiry = enquiryResult.rows[0];

    await client.query(
      `INSERT INTO lead_status_history
       (appointment_request_id, old_status, new_status, changed_by_staff_id)
       VALUES ($1, NULL, 'new', NULL)`,
      [enquiry.id]
    );

    await client.query('COMMIT');
    return enquiry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAppointmentRequestStatus(
  id: string,
  status: string,
  notes?: string,
  staffId?: string
): Promise<AppointmentRequest | null> {
  const setClause =
    notes !== undefined
      ? "status = $2, message = COALESCE(message || '') || $3, updated_at = NOW()"
      : 'status = $2, updated_at = NOW()';
  const params =
    notes !== undefined ? [id, status, '\n[Staff update: ' + notes + ']'] : [id, status];
  const result = await query(
    `UPDATE appointment_requests SET ${setClause} WHERE id = $1 RETURNING *`,
    params
  );

  if (result.rows[0] && staffId) {
    await createLeadStatusHistory({
      appointment_request_id: id,
      old_status: null,
      new_status: status,
      changed_by_staff_id: staffId,
    });
  }

  return result.rows[0] || null;
}

export async function createLeadStatusHistory(
  data: Partial<LeadStatusHistory>
): Promise<LeadStatusHistory> {
  const statement = buildInsert('lead_status_history', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function getLeadStatusHistory(requestId: string): Promise<LeadStatusHistory[]> {
  const result = await query(
    'SELECT * FROM lead_status_history WHERE appointment_request_id = $1 ORDER BY changed_at ASC',
    [requestId]
  );
  return result.rows;
}

export async function getLeadStatusHistoryWithStaffName(requestId: string): Promise<any[]> {
  const result = await query(
    `SELECT lsh.*, su.full_name as changed_by_name
     FROM lead_status_history lsh
     LEFT JOIN staff_users su ON lsh.changed_by_staff_id = su.id
     WHERE lsh.appointment_request_id = $1
     ORDER BY lsh.changed_at ASC`,
    [requestId]
  );
  return result.rows;
}

export async function getAppointmentRequestsFiltered(
  filters: LeadFilters
): Promise<PaginatedResult<AppointmentRequest>> {
  const conditions: string[] = [];
  const params: string[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`ar.status = $${paramIndex++}`);
    params.push(filters.status);
  }
  if (filters.from) {
    conditions.push(`ar.created_at >= $${paramIndex++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`ar.created_at <= $${paramIndex++}`);
    params.push(filters.to + 'T23:59:59Z');
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countResult = await query(`SELECT COUNT(*) FROM appointment_requests ar ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const offset = (filters.page - 1) * filters.pageSize;

  const dataResult = await query(
    `SELECT ar.*, p.name as package_name, d.name as doctor_name
     FROM appointment_requests ar
     LEFT JOIN packages p ON ar.package_id = p.id
     LEFT JOIN doctors d ON ar.doctor_id = d.id
     ${whereClause}
     ORDER BY ar.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, filters.pageSize, offset]
  );

  return {
    data: dataResult.rows,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil(total / filters.pageSize),
  };
}

export async function updateAppointmentRequestStatusWithHistory(
  id: string,
  newStatus: string,
  changedByStaffId: string | null
): Promise<AppointmentRequest | null> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      'SELECT status FROM appointment_requests WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const oldStatus = currentResult.rows[0].status;
    const updateResult = await client.query(
      'UPDATE appointment_requests SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id, newStatus]
    );

    await client.query(
      `INSERT INTO lead_status_history (appointment_request_id, old_status, new_status, changed_by_staff_id)
       VALUES ($1, $2, $3, $4)`,
      [id, oldStatus, newStatus, changedByStaffId]
    );

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
