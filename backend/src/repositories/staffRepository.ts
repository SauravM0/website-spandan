import { query } from '../config/database';
import { StaffUser } from '../domain/entities';
import { buildInsert } from '../persistence/sqlBuilders';

export async function findStaffUserByAuthId(id: string): Promise<StaffUser | null> {
  const result = await query('SELECT * FROM staff_users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function findStaffUserByEmail(email: string): Promise<(StaffUser & { password_hash: string }) | null> {
  const result = await query('SELECT * FROM staff_users WHERE email = $1', [email.toLowerCase().trim()]);
  return result.rows[0] || null;
}

export async function createStaffUser(data: Partial<StaffUser>): Promise<StaffUser> {
  const statement = buildInsert('staff_users', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function getStaffUsers(activeOnly = true): Promise<StaffUser[]> {
  const sql = activeOnly
    ? 'SELECT * FROM staff_users WHERE is_active = true ORDER BY full_name ASC'
    : 'SELECT * FROM staff_users ORDER BY full_name ASC';
  const result = await query(sql);
  return result.rows;
}
