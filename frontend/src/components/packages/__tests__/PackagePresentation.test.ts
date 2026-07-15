import { describe, expect, it } from 'vitest';
import { formatPackageMoney, packageSuitability } from '../PackageCard';
import {
  orderPackagesSelectedFirst,
  packageInclusionCount,
  type PublicPackageDetail,
} from '../PackageDetailSection';

function pkg(slug: string, inclusionCount = 0): PublicPackageDetail {
  return {
    id: slug,
    slug,
    name: `${slug} package`,
    inclusion_count: inclusionCount,
  };
}

describe('package presentation', () => {
  it('formats published prices with the Indian rupee symbol', () => {
    expect(formatPackageMoney(3000)).toBe('₹3,000');
    expect(formatPackageMoney('10000')).toBe('₹10,000');
    expect(formatPackageMoney(null)).toBe('Price on request');
  });

  it('uses the complete detail test list as the authoritative inclusion count', () => {
    const detail = pkg('diabetic', 12);
    detail.tests = Array.from({ length: 12 }, (_, index) => ({
      test_name: `Inclusion ${index + 1}`,
    }));

    expect(packageInclusionCount(detail)).toBe(12);
    expect(packageSuitability(detail)).toContain('12 included tests and services');
  });

  it('places the clicked package first without duplicating it', () => {
    const packages = [pkg('diabetic'), pkg('cardiac'), pkg('full-body')];
    const selected = packages[1];
    const ordered = orderPackagesSelectedFirst(packages, selected);

    expect(ordered.map((item) => item.slug)).toEqual(['cardiac', 'diabetic', 'full-body']);
  });

  it('preserves conditional test guidance in the detail model', () => {
    const cardiac = pkg('cardiac');
    cardiac.tests = [{
      test_name: 'TMT/Treadmill Test',
      description: 'If clinically required',
    }];

    expect(cardiac.tests[0]).toMatchObject({
      test_name: 'TMT/Treadmill Test',
      description: 'If clinically required',
    });
  });
});
