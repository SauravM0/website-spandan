'use client';

import React, { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { computeBmiResult } from '@/lib/tools/bmi';
import CalculatorCard from './CalculatorCard';
import Field from './Field';
import ResultPanel from './ResultPanel';
import ResetButton from './ResetButton';

export default function BmiCalculator() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const result = useMemo(() => computeBmiResult(height, weight), [height, weight]);

  return (
    <CalculatorCard
      icon={<Calculator size={22} aria-hidden="true" />}
      title="BMI Calculator"
      description="Uses Asian Indian adult BMI ranges to estimate weight category."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="bmi-height" label="Height" suffix="cm" value={height} onChange={setHeight} min={60} max={240} />
        <Field id="bmi-weight" label="Weight" suffix="kg" value={weight} onChange={setWeight} min={20} max={250} />
      </div>
      <div className="mt-5">
        <ResultPanel result={result} emptyText="Enter height and weight to calculate BMI." />
      </div>
      <div className="mt-4 flex justify-end">
        <ResetButton onClick={() => { setHeight(''); setWeight(''); }} />
      </div>
    </CalculatorCard>
  );
}
