'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

interface PrepInstructionsProps {
  instructions: string;
}

export default function PrepInstructions({ instructions }: PrepInstructionsProps) {
  const { t } = useTranslation('common');

  if (!instructions) return null;

  return (
    <div className="bg-[#E8A33D]/10 border-l-4 border-[#E8A33D] p-5 rounded-r-lg mb-8">
      <h3 className="font-semibold text-navy mb-2">{t('preparation')}</h3>
      <p className="text-sm text-text-light leading-relaxed">{instructions}</p>
    </div>
  );
}
