import { query, getClient } from '../config/database';
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
  'gallery_urls',
  'category',
  'test_category',
  'primary_doctor_id',
  'display_order',
  'is_active',
  'is_featured',
  'tax_applicable',
  'tax_name',
  'tax_rate',
  'convenience_fee',
  'gateway_fee_policy',
  'purchase_status',
  'purchase_enabled',
  'badge_text',
  'discount_label',
  'available_days',
  'blackout_dates',
  'max_bookings_per_day',
  'preferred_date_required',
  'effective_start',
  'effective_end',
  'publication_status',
  'terms_text',
  'no_refund_text',
  'consultation_included',
  'fasting_required',
  'fasting_duration',
  'age_sex_applicability',
  'exclusions',
  'report_turnaround',
  'medical_disclaimer',
  'translations',
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

export async function getPublicPackageSummaries(options: {
  featuredOnly?: boolean;
  limit?: number;
} = {}): Promise<any[]> {
  const conditions = [
    'p.is_active = true',
    "p.publication_status = 'published'",
    'p.purchase_enabled = true',
    "p.purchase_status = 'available'",
    '(p.effective_start IS NULL OR p.effective_start <= CURRENT_DATE)',
    '(p.effective_end IS NULL OR p.effective_end >= CURRENT_DATE)',
  ];

  if (options.featuredOnly) {
    conditions.push('p.is_featured = true');
  }

  const limit = options.limit ? Math.max(1, Math.min(options.limit, 12)) : null;
  const result = await query(
    `SELECT
       p.id,
       p.slug,
       p.name,
       p.short_description,
       p.category,
       COALESCE(p.test_category, p.category, 'general') AS test_category,
       p.display_order,
       p.base_price,
       CASE
         WHEN p.discounted_price IS NOT NULL AND p.discounted_price < p.base_price
           THEN p.discounted_price
         ELSE p.base_price
       END AS current_price,
       CASE
         WHEN p.discounted_price IS NOT NULL AND p.discounted_price < p.base_price
           THEN p.base_price
         ELSE NULL
       END AS original_price,
       CASE
         WHEN p.discounted_price IS NOT NULL AND p.discounted_price < p.base_price
           THEN p.discount_label
         ELSE NULL
       END AS discount_label,
       CASE
         WHEN p.discounted_price IS NOT NULL AND p.discounted_price < p.base_price
           THEN p.effective_end
         ELSE NULL
       END AS offer_valid_until,
       p.prep_instructions,
       p.fasting_required,
       p.fasting_duration,
       p.consultation_included,
       p.age_sex_applicability AS suitability,
       p.report_turnaround,
       p.purchase_enabled,
       p.purchase_status,
       true AS published,
       true AS bookable,
       p.updated_at AS reviewed_at,
       COALESCE(tests.key_inclusions, ARRAY[]::text[]) AS key_inclusions,
       COALESCE(tests.inclusion_count, 0) AS inclusion_count
     FROM packages p
     LEFT JOIN LATERAL (
       SELECT
         ARRAY_AGG(test_name ORDER BY sort_order ASC, test_name ASC) AS key_inclusions,
         COUNT(*)::int AS inclusion_count
       FROM package_tests
       WHERE package_id = p.id
     ) tests ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.display_order ASC, p.name ASC
     ${limit ? `LIMIT ${limit}` : ''}`
  );
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
    'SELECT * FROM packages WHERE is_active = true AND is_featured = true ORDER BY display_order ASC LIMIT 6'
  );
  return result.rows;
}

export async function getFeaturedPackagesPublic(): Promise<any[]> {
  const result = await query('SELECT * FROM packages_public ORDER BY display_order ASC LIMIT 6');
  return result.rows;
}

export async function getPackageCommerceCatalog(): Promise<any[]> {
  const result = await query(
    `SELECT
       id, slug, name, short_description, description, prep_instructions,
       image_url, category, test_category, base_price, discounted_price,
       discount_label, tax_applicable, tax_name, tax_rate, convenience_fee,
       gateway_fee_policy, purchase_status, purchase_enabled, badge_text,
       available_days, blackout_dates, max_bookings_per_day,
       preferred_date_required, terms_text, no_refund_text,
       consultation_included, fasting_required, fasting_duration,
       age_sex_applicability, exclusions, report_turnaround, medical_disclaimer
     FROM packages
     WHERE is_active = true
       AND publication_status = 'published'
       AND purchase_enabled = true
       AND purchase_status = 'available'
       AND (effective_start IS NULL OR effective_start <= CURRENT_DATE)
       AND (effective_end IS NULL OR effective_end >= CURRENT_DATE)
     ORDER BY display_order ASC, name ASC`
  );
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

export async function getPackagesAdminFiltered(filters: {
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
  page: number;
  pageSize: number;
}): Promise<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.search) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.short_description ILIKE $${paramIndex} OR p.slug ILIKE $${paramIndex})`);
    paramIndex++;
  }
  if (filters.category) {
    conditions.push(`p.category = $${paramIndex++}`);
    params.push(filters.category);
  }
  if (filters.status === 'active') {
    conditions.push('p.is_active = true');
  } else if (filters.status === 'inactive') {
    conditions.push('p.is_active = false');
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await query(`SELECT COUNT(*) FROM packages p ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const offset = (filters.page - 1) * filters.pageSize;
  const orderBy =
    filters.sort === 'name_asc' ? 'p.name ASC, p.display_order ASC' :
    filters.sort === 'name_desc' ? 'p.name DESC, p.display_order ASC' :
    filters.sort === 'updated_desc' ? 'p.updated_at DESC, p.id DESC' :
    filters.sort === 'updated_asc' ? 'p.updated_at ASC, p.id ASC' :
    filters.sort === 'price_asc' ? 'p.base_price ASC, p.display_order ASC' :
    filters.sort === 'price_desc' ? 'p.base_price DESC, p.display_order ASC' :
    'p.display_order ASC, p.name ASC';

  const dataResult = await query(
    `SELECT
       p.id, p.slug, p.name, p.short_description, p.category, p.test_category,
       p.base_price, p.discounted_price, p.is_active, p.is_featured,
       p.purchase_status, p.purchase_enabled, p.publication_status,
       p.display_order, p.version, p.updated_at, p.created_at,
       p.effective_start, p.effective_end, p.badge_text
     FROM packages p
     ${whereClause}
     ORDER BY ${orderBy}
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

export async function updatePackageAdminWithVersion(
  id: string,
  data: Record<string, unknown>,
  expectedVersion: number,
  staffId?: string
): Promise<{ pkg: Package | null; tests?: PackageTest[] }> {
  const pgClient = await getClient();
  try {
    await pgClient.query('BEGIN');

    const currentResult = await pgClient.query(
      'SELECT version FROM packages WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (currentResult.rows.length === 0) {
      await pgClient.query('ROLLBACK');
      return { pkg: null };
    }

    const current = currentResult.rows[0];
    if (current.version !== expectedVersion) {
      await pgClient.query('ROLLBACK');
      return { pkg: null, tests: undefined };
    }

    // Build updates only for allowed admin fields
    const updates: Record<string, unknown> = {};
    for (const field of ADMIN_PACKAGE_FIELDS) {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    }

    // Handle tests separately
    const { tests, ...packageData } = updates;

    if (Object.keys(packageData).length > 0) {
      const setClauses: string[] = [];
      const setValues: any[] = [];
      let setIndex = 1;
      for (const [key, value] of Object.entries(packageData)) {
        setClauses.push(`${key} = $${setIndex + 1}`);
        setValues.push(value);
        setIndex++;
      }

      await pgClient.query(
        `UPDATE packages SET ${setClauses.join(', ')}, version = version + 1, updated_at = NOW() WHERE id = $1`,
        [id, ...setValues]
      );
    } else {
      await pgClient.query(
        'UPDATE packages SET updated_at = NOW(), version = version + 1 WHERE id = $1',
        [id]
      );
    }

    // Handle tests if provided
    if (data.tests !== undefined && Array.isArray(data.tests)) {
      // Delete existing tests
      await pgClient.query('DELETE FROM package_tests WHERE package_id = $1', [id]);
      // Insert new tests
      for (let i = 0; i < data.tests.length; i++) {
        const test = data.tests[i] as any;
        await pgClient.query(
          `INSERT INTO package_tests (package_id, test_name, test_category, description, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, test.test_name, test.test_category || null, test.description || null, i]
        );
      }
    }

    // Write audit event
    if (staffId) {
      await pgClient.query(
        `INSERT INTO audit_events (actor_staff_id, action, entity_type, entity_id, before_redacted, after_redacted)
         VALUES ($1, 'package.updated', 'package', $2,
           jsonb_build_object('version', $3),
           jsonb_build_object('version', $4))`,
        [staffId, id, expectedVersion, expectedVersion + 1]
      );
    }

    await pgClient.query('COMMIT');

    // Fetch updated package
    const pkgResult = await pgClient.query('SELECT * FROM packages WHERE id = $1', [id]);
    const pkg = pkgResult.rows[0] || null;

    let updatedTests: PackageTest[] = [];
    if (data.tests !== undefined) {
      const testsResult = await pgClient.query(
        'SELECT * FROM package_tests WHERE package_id = $1 ORDER BY sort_order ASC',
        [id]
      );
      updatedTests = testsResult.rows;
    }

    return { pkg, tests: updatedTests };
  } catch (err) {
    await pgClient.query('ROLLBACK');
    throw err;
  } finally {
    pgClient.release();
  }
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
