import { query } from '../config/database';
import { Package, PackageTest } from '../domain/entities';

/**
 * A package is publicly visible when the clinic has activated it, its
 * publication status says published, and today falls inside its effective
 * window. Migration 009 duplicated three of those columns under new names
 * (publish_status, effective_from, effective_until) while leaving the originals
 * in place, so every check reads whichever of the pair is populated.
 */
const PUBLIC_PACKAGE_PREDICATE = `
  p.is_active = true
  AND COALESCE(p.publish_status, p.publication_status, 'published') = 'published'
  AND (COALESCE(p.effective_from, p.effective_start) IS NULL
       OR COALESCE(p.effective_from, p.effective_start) <= CURRENT_DATE)
  AND (COALESCE(p.effective_until, p.effective_end) IS NULL
       OR COALESCE(p.effective_until, p.effective_end) >= CURRENT_DATE)
`;

export async function getPublicPackages(): Promise<Package[]> {
  const result = await query(
    `SELECT p.*
       FROM packages p
      WHERE ${PUBLIC_PACKAGE_PREDICATE}
      ORDER BY p.is_featured DESC, p.display_order ASC, p.name ASC`
  );
  return result.rows;
}

export async function getPublicPackageBySlug(slug: string): Promise<Package | null> {
  const result = await query(
    `SELECT p.*
       FROM packages p
      WHERE p.slug = $1
        AND ${PUBLIC_PACKAGE_PREDICATE}`,
    [slug]
  );
  return result.rows[0] || null;
}

/**
 * Tests for several packages in one round trip, so listing N packages stays a
 * two-query operation rather than N+1.
 */
export async function getTestsForPackages(
  packageIds: string[]
): Promise<Map<string, PackageTest[]>> {
  const grouped = new Map<string, PackageTest[]>();
  if (packageIds.length === 0) return grouped;

  const result = await query(
    `SELECT *
       FROM package_tests
      WHERE package_id = ANY($1::uuid[])
      ORDER BY sort_order ASC, test_name ASC`,
    [packageIds]
  );

  for (const row of result.rows as PackageTest[]) {
    const existing = grouped.get(row.package_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.package_id, [row]);
    }
  }
  return grouped;
}

export async function getTestsForPackage(packageId: string): Promise<PackageTest[]> {
  const result = await query(
    `SELECT *
       FROM package_tests
      WHERE package_id = $1
      ORDER BY sort_order ASC, test_name ASC`,
    [packageId]
  );
  return result.rows;
}
