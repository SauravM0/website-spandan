import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export type PackageTestItem = {
  id?: string;
  test_name: string;
  test_category?: string | null;
  description?: string | null;
  sort_order?: number | null;
};

interface TestListCardProps {
  tests: PackageTestItem[];
}

function groupLabel(value: string | null | undefined) {
  return (value || 'Included tests').replace(/[-_]/g, ' ');
}

export default function TestListCard({ tests }: TestListCardProps) {
  if (!tests || tests.length === 0) {
    return (
      <div className="soft-card p-6">
        <h3 className="text-lg font-bold text-navy">What&apos;s included</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-light">
          Included tests are confirmed by the clinic before booking.
        </p>
      </div>
    );
  }

  const groups = Array.from(
    tests.reduce((map, test) => {
      const key = groupLabel(test.test_category);
      map.set(key, [...(map.get(key) || []), test]);
      return map;
    }, new Map<string, PackageTestItem[]>())
  );

  return (
    <div className="soft-card p-6">
      <h3 className="text-lg font-bold text-navy">What&apos;s included</h3>
      <div className="mt-5 grid gap-5">
        {groups.map(([category, items]) => (
          <section key={category}>
            <h4 className="text-sm font-bold uppercase capitalize text-text-light">{category}</h4>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {items.map((test) => (
                <li key={test.id || test.test_name} className="flex items-start gap-2 rounded-2xl bg-blue-50/70 px-3 py-2 text-sm text-text-light">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={16} aria-hidden="true" />
                  <span>
                    <span className="font-semibold text-navy">{test.test_name}</span>
                    {test.description && <span className="mt-1 block text-xs">{test.description}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
