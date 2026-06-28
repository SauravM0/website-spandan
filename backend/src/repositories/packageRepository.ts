import { query } from '../config/database';
import { Doctor, Package, PackageTest } from '../domain/entities';
import { buildInsert, buildUpdate } from '../persistence/sqlBuilders';

const ADMIN_PACKAGE_FIELDS = [
  'name',
  'slug',
  'short_description',
  'description',
  'base_price',
  'discounted_price',
  'show_price_publicly',
  'prep_instructions',
  'image_url',
  'category',
  'primary_doctor_id',
  'display_order',
  'is_active',
] as const;

export async function getPackages(activeOnly = true): Promise<Package[]> {
  const sql = activeOnly
    ? 'SELECT * FROM packages WHERE is_active = true ORDER BY display_order ASC'
    : 'SELECT * FROM packages ORDER BY display_order ASC';
  const result = await query(sql);
  return result.rows;
}

export async function getPackagesPublic(): Promise<any[]> {
  const result = await query('SELECT * FROM packages_public ORDER BY display_order ASC');
  return result.rows;
}

export async function getPackageBySlug(slug: string): Promise<Package | null> {
  const result = await query('SELECT * FROM packages WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

export async function getPackageById(id: string): Promise<Package | null> {
  const result = await query('SELECT * FROM packages WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getFeaturedPackages(): Promise<Package[]> {
  const result = await query(
    'SELECT * FROM packages WHERE is_active = true ORDER BY display_order ASC LIMIT 6'
  );
  return result.rows;
}

export async function getFeaturedPackagesPublic(): Promise<any[]> {
  const result = await query('SELECT * FROM packages_public ORDER BY display_order ASC LIMIT 6');
  return result.rows;
}

export async function createPackage(data: Partial<Package>): Promise<Package> {
  const statement = buildInsert('packages', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function updatePackage(id: string, data: Partial<Package>): Promise<Package | null> {
  const statement = buildUpdate('packages', id, data);
  if (!statement) return null;

  const result = await query(statement.sql, statement.values);
  return result.rows[0] || null;
}

export async function updatePackageAdmin(
  id: string,
  data: Record<string, unknown>
): Promise<Package | null> {
  const updates: Record<string, unknown> = {};

  for (const field of ADMIN_PACKAGE_FIELDS) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  const statement = buildUpdate('packages', id, updates);
  if (!statement) return null;

  const result = await query(statement.sql, statement.values);
  return result.rows[0] || null;
}

export async function deletePackage(id: string): Promise<boolean> {
  const result = await query('DELETE FROM packages WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getPackageTests(packageId: string): Promise<PackageTest[]> {
  const result = await query(
    'SELECT * FROM package_tests WHERE package_id = $1 ORDER BY sort_order ASC',
    [packageId]
  );
  return result.rows;
}

export async function createPackageTest(data: Partial<PackageTest>): Promise<PackageTest> {
  const statement = buildInsert('package_tests', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function deletePackageTest(id: string): Promise<boolean> {
  const result = await query('DELETE FROM package_tests WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function isPackageActive(packageId: string): Promise<boolean> {
  const result = await query('SELECT id FROM packages WHERE id = $1 AND is_active = true', [
    packageId,
  ]);
  return result.rows.length > 0;
}

export async function getPrimaryDoctorByPackageId(packageId: string): Promise<Doctor | null> {
  const result = await query(
    `SELECT d.* FROM doctors d
     INNER JOIN packages p ON p.primary_doctor_id = d.id
     WHERE p.id = $1 AND p.is_active = true`,
    [packageId]
  );
  return result.rows[0] || null;
}
