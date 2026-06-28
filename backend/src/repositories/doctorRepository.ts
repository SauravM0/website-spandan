import { query } from '../config/database';
import { Doctor } from '../domain/entities';
import { buildInsert, buildUpdate } from '../persistence/sqlBuilders';

export async function getDoctors(activeOnly = true): Promise<Doctor[]> {
  const sql = activeOnly
    ? 'SELECT * FROM doctors WHERE is_active = true ORDER BY name ASC'
    : 'SELECT * FROM doctors ORDER BY name ASC';
  const result = await query(sql);
  return result.rows;
}

export async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  const result = await query('SELECT * FROM doctors WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

export async function getDoctorById(id: string): Promise<Doctor | null> {
  const result = await query('SELECT * FROM doctors WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getDoctorBriefById(
  id: string
): Promise<{ name: string; speciality: string; slug: string } | null> {
  const result = await query(
    'SELECT name, speciality, slug FROM doctors WHERE id = $1 AND is_active = true',
    [id]
  );
  return result.rows[0] || null;
}

export async function createDoctor(data: Partial<Doctor>): Promise<Doctor> {
  const statement = buildInsert('doctors', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor | null> {
  const statement = buildUpdate('doctors', id, data);
  if (!statement) return null;

  const result = await query(statement.sql, statement.values);
  return result.rows[0] || null;
}

export async function deleteDoctor(id: string): Promise<boolean> {
  const result = await query('DELETE FROM doctors WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
