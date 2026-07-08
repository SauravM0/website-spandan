'use client';

import React, { useMemo, useState } from 'react';
import { Droplets } from 'lucide-react';
import { computeDiabetesRiskResult } from '@/lib/tools/diabetes-risk';
import CalculatorCard from './CalculatorCard';
import Field from './Field';
import SelectField from './SelectField';
import ResultPanel from './ResultPanel';
import ResetButton from './ResetButton';

export default function DiabetesRiskCalculator() {
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const [waist, setWaist] = useState('');
  const [activity, setActivity] = useState('');
  const [family, setFamily] = useState('');

  const result = useMemo(
    () => computeDiabetesRiskResult({ age, sex, waist, activity, family }),
    [age, sex, waist, activity, family]
  );

  return (
    <CalculatorCard
      icon={<Droplets size={22} aria-hidden="true" />}
      title="Indian Diabetes Risk Score"
      description="Estimates type 2 diabetes risk using age, waist, activity, and family history."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="idrs-age" label="Age" suffix="years" value={age} onChange={setAge} min={18} max={100} />
        <SelectField id="idrs-sex" label="Sex for waist cutoff" value={sex} onChange={setSex}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </SelectField>
        <Field id="idrs-waist" label="Waist circumference" suffix="cm" value={waist} onChange={setWaist} min={40} max={180} />
        <SelectField id="idrs-activity" label="Physical activity" value={activity} onChange={setActivity}>
          <option value="">Select activity</option>
          <option value="0">Regular exercise and strenuous work</option>
          <option value="20">Regular exercise or strenuous work</option>
          <option value="30">No exercise and sedentary work</option>
        </SelectField>
        <div className="sm:col-span-2">
          <SelectField id="idrs-family" label="Family history of diabetes" value={family} onChange={setFamily}>
            <option value="">Select family history</option>
            <option value="0">No parent with diabetes</option>
            <option value="10">One parent with diabetes</option>
            <option value="20">Both parents with diabetes</option>
          </SelectField>
        </div>
      </div>
      <div className="mt-5">
        <ResultPanel result={result} emptyText="Complete all fields to see the IDRS estimate." />
      </div>
      <div className="mt-4 flex justify-end">
        <ResetButton
          onClick={() => {
            setAge('');
            setSex('male');
            setWaist('');
            setActivity('');
            setFamily('');
          }}
        />
      </div>
    </CalculatorCard>
  );
}
