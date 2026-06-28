'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

interface TestListCardProps {
  tests: any[];
}

export default function TestListCard({ tests }: TestListCardProps) {
  const { t } = useTranslation('common');

  if (!tests || tests.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold mb-3">{t('includes_tests')}</h3>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tests.map((test: any) => (
          <li key={test.id} className="flex items-center gap-2 text-sm text-text-light">
            <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {test.test_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
