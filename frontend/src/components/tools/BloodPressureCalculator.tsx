'use client';

import React, { useMemo, useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { computeBpResult } from '@/lib/tools/blood-pressure';
import CalculatorCard from './CalculatorCard';
import Field from './Field';
import ResultPanel from './ResultPanel';
import ResetButton from './ResetButton';

export default function BloodPressureCalculator() {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  const result = useMemo(() => computeBpResult(systolic, diastolic), [systolic, diastolic]);

  return (
    <CalculatorCard
      icon={<HeartPulse size={22} aria-hidden="true" />}
      title="Blood Pressure Risk Checker"
      description="Classifies a resting adult reading and highlights when follow-up is sensible."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="bp-systolic" label="Systolic" suffix="mmHg" value={systolic} onChange={setSystolic} min={70} max={260} />
        <Field id="bp-diastolic" label="Diastolic" suffix="mmHg" value={diastolic} onChange={setDiastolic} min={40} max={160} />
      </div>
      <div className="mt-5">
        <ResultPanel result={result} emptyText="Enter systolic and diastolic values from a resting reading." />
      </div>
      <div className="mt-4 flex justify-end">
        <ResetButton onClick={() => { setSystolic(''); setDiastolic(''); }} />
      </div>
    </CalculatorCard>
  );
}
