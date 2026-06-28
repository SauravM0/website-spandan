'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, Calculator, Droplets, HeartPulse, RotateCcw } from 'lucide-react';

type Tone = 'green' | 'amber' | 'red' | 'navy';

type Result = {
  label: string;
  detail: string;
  tone: Tone;
  value?: string;
};

const toneClasses: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  navy: 'bg-blue-50 text-navy border-blue-200',
};

function numberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function Field({
  id,
  label,
  suffix,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="form-group mb-0">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={suffix ? 'pr-16' : ''}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-light">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultPanel({ result, emptyText }: { result: Result | null; emptyText: string }) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg-alt p-4 text-sm text-text-light">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${toneClasses[result.tone]}`}>
      {result.value && <p className="text-2xl font-bold leading-tight">{result.value}</p>}
      <p className="font-semibold">{result.label}</p>
      <p className="mt-1 text-sm leading-relaxed">{result.detail}</p>
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-outline btn-sm"
      aria-label="Reset calculator"
      title="Reset calculator"
    >
      <RotateCcw size={16} aria-hidden="true" />
      Reset
    </button>
  );
}

function CalculatorCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="card p-6 hover:translate-y-0 hover:shadow">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-light">{description}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function BmiCalculator() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const result = useMemo<Result | null>(() => {
    const heightCm = numberOrNull(height);
    const weightKg = numberOrNull(weight);
    if (!heightCm || !weightKg) return null;

    const bmi = weightKg / (heightCm / 100) ** 2;
    if (bmi < 18.5) {
      return {
        value: bmi.toFixed(1),
        label: 'Underweight',
        detail: 'Discuss nutrition, appetite, and any recent weight loss with your clinician.',
        tone: 'amber',
      };
    }
    if (bmi < 23) {
      return {
        value: bmi.toFixed(1),
        label: 'Healthy range for Asian Indian adults',
        detail: 'Keep up balanced meals, regular movement, and routine preventive checks.',
        tone: 'green',
      };
    }
    if (bmi < 25) {
      return {
        value: bmi.toFixed(1),
        label: 'Overweight range',
        detail: 'Even modest weight reduction can improve blood pressure, sugar, and lipids.',
        tone: 'amber',
      };
    }
    return {
      value: bmi.toFixed(1),
      label: 'Obesity range',
      detail: 'Consider a medical review for diabetes, thyroid, lipid, and cardiac risk factors.',
      tone: 'red',
    };
  }, [height, weight]);

  return (
    <CalculatorCard
      icon={<Calculator size={22} aria-hidden="true" />}
      title="BMI Calculator"
      description="Uses Asian Indian adult BMI ranges to estimate weight category."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="height" label="Height" suffix="cm" value={height} onChange={setHeight} min={60} max={240} />
        <Field id="weight" label="Weight" suffix="kg" value={weight} onChange={setWeight} min={20} max={250} />
      </div>
      <div className="mt-5">
        <ResultPanel result={result} emptyText="Enter height and weight to calculate BMI." />
      </div>
      <div className="mt-4 flex justify-end">
        <ResetButton
          onClick={() => {
            setHeight('');
            setWeight('');
          }}
        />
      </div>
    </CalculatorCard>
  );
}

function BloodPressureCalculator() {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  const result = useMemo<Result | null>(() => {
    const sys = numberOrNull(systolic);
    const dia = numberOrNull(diastolic);
    if (!sys || !dia) return null;

    if (sys > 180 || dia > 120) {
      return {
        value: `${sys}/${dia} mmHg`,
        label: 'Hypertensive crisis range',
        detail: 'Seek urgent medical advice, especially with chest pain, breathlessness, weakness, severe headache, or vision changes.',
        tone: 'red',
      };
    }
    if (sys >= 140 || dia >= 90) {
      return {
        value: `${sys}/${dia} mmHg`,
        label: 'High blood pressure, stage 2 range',
        detail: 'Book a clinician review and confirm with repeated readings or ambulatory monitoring.',
        tone: 'red',
      };
    }
    if (sys >= 130 || dia >= 80) {
      return {
        value: `${sys}/${dia} mmHg`,
        label: 'High blood pressure, stage 1 range',
        detail: 'Lifestyle changes and risk assessment are important, particularly with diabetes or heart risk factors.',
        tone: 'amber',
      };
    }
    if (sys >= 120 && dia < 80) {
      return {
        value: `${sys}/${dia} mmHg`,
        label: 'Elevated systolic range',
        detail: 'Track home readings and focus on salt intake, sleep, exercise, and weight management.',
        tone: 'amber',
      };
    }
    return {
      value: `${sys}/${dia} mmHg`,
      label: 'Normal adult range',
      detail: 'Continue periodic checks. One reading does not replace regular monitoring.',
      tone: 'green',
    };
  }, [systolic, diastolic]);

  return (
    <CalculatorCard
      icon={<HeartPulse size={22} aria-hidden="true" />}
      title="Blood Pressure Risk Checker"
      description="Classifies a resting adult reading and highlights when follow-up is sensible."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="systolic" label="Systolic" suffix="mmHg" value={systolic} onChange={setSystolic} min={70} max={260} />
        <Field id="diastolic" label="Diastolic" suffix="mmHg" value={diastolic} onChange={setDiastolic} min={40} max={160} />
      </div>
      <div className="mt-5">
        <ResultPanel result={result} emptyText="Enter systolic and diastolic values from a resting reading." />
      </div>
      <div className="mt-4 flex justify-end">
        <ResetButton
          onClick={() => {
            setSystolic('');
            setDiastolic('');
          }}
        />
      </div>
    </CalculatorCard>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group mb-0">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  );
}

function DiabetesRiskScore() {
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const [waist, setWaist] = useState('');
  const [activity, setActivity] = useState('');
  const [family, setFamily] = useState('');

  const result = useMemo<Result | null>(() => {
    const ageYears = numberOrNull(age);
    const waistCm = numberOrNull(waist);
    if (!ageYears || !waistCm || !activity || !family) return null;

    const ageScore = ageYears < 35 ? 0 : ageYears < 50 ? 20 : 30;
    const waistScore =
      sex === 'male'
        ? waistCm < 90
          ? 0
          : waistCm < 100
            ? 10
            : 20
        : waistCm < 80
          ? 0
          : waistCm < 90
            ? 10
            : 20;
    const activityScore = Number(activity);
    const familyScore = Number(family);
    const score = ageScore + waistScore + activityScore + familyScore;

    if (score < 30) {
      return {
        value: `${score} / 100`,
        label: 'Low diabetes risk score',
        detail: 'Maintain waist control, physical activity, and routine screening as advised for your age.',
        tone: 'green',
      };
    }
    if (score <= 50) {
      return {
        value: `${score} / 100`,
        label: 'Moderate diabetes risk score',
        detail: 'A fasting sugar or HbA1c test may be useful, especially if weight or family history is changing.',
        tone: 'amber',
      };
    }
    return {
      value: `${score} / 100`,
      label: 'High diabetes risk score',
      detail: 'Please consider a diabetes evaluation and preventive plan with an endocrinology team.',
      tone: 'red',
    };
  }, [activity, age, family, sex, waist]);

  return (
    <CalculatorCard
      icon={<Droplets size={22} aria-hidden="true" />}
      title="Indian Diabetes Risk Score"
      description="Estimates type 2 diabetes risk using age, waist, activity, and family history."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="age" label="Age" suffix="years" value={age} onChange={setAge} min={18} max={100} />
        <SelectField id="sex" label="Sex for waist cutoff" value={sex} onChange={setSex}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </SelectField>
        <Field id="waist" label="Waist circumference" suffix="cm" value={waist} onChange={setWaist} min={40} max={180} />
        <SelectField id="activity" label="Physical activity" value={activity} onChange={setActivity}>
          <option value="">Select activity</option>
          <option value="0">Regular exercise and strenuous work</option>
          <option value="20">Regular exercise or strenuous work</option>
          <option value="30">No exercise and sedentary work</option>
        </SelectField>
        <div className="sm:col-span-2">
          <SelectField id="family" label="Family history of diabetes" value={family} onChange={setFamily}>
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

export default function MedicalCalculators() {
  return (
    <>
      <section className="bg-navy py-16 text-center text-white">
        <div className="container">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
            <Activity size={26} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">Medical Calculators</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg opacity-85">
            Quick educational tools for everyday cardiometabolic health checks.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="mb-8 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} aria-hidden="true" />
              Educational disclaimer
            </div>
            <p className="leading-relaxed">
              These tools are for general education only and are not a diagnosis or treatment plan. Readings can vary by age,
              pregnancy, medications, existing illness, and measurement technique. Please consult a qualified doctor for personal
              medical advice.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <BmiCalculator />
            <BloodPressureCalculator />
            <div className="lg:col-span-2">
              <DiabetesRiskScore />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link href="/packages/diabetes-management-package" className="card p-6 block hover:shadow-lg">
              <span className="badge badge-featured mb-3">Diabetes</span>
              <h2 className="text-lg font-bold text-navy">Diabetes Management Package</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Review blood sugar, HbA1c, lipids, kidney health, and related diabetes markers.
              </p>
            </Link>
            <Link href="/facilities" className="card p-6 block hover:shadow-lg">
              <span className="badge badge-new mb-3">Monitoring</span>
              <h2 className="text-lg font-bold text-navy">CGMS and ABPM Facilities</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Learn about continuous glucose monitoring and 24-hour blood pressure monitoring at Spandan.
              </p>
            </Link>
            <Link href="/contact" className="card p-6 block hover:shadow-lg">
              <span className="badge badge-featured mb-3">Appointments</span>
              <h2 className="text-lg font-bold text-navy">Talk to Spandan</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Book a clinician review if your scores are elevated or symptoms need attention.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
