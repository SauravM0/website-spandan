import type { ToolResult, FieldDefinition, ToolMeta } from './types';

export function calculateDiabetesRisk(params: {
  ageYears: number;
  sex: 'male' | 'female';
  waistCm: number;
  activityScore: number;
  familyScore: number;
}): number {
  const ageScore =
    params.ageYears < 35 ? 0 : params.ageYears < 50 ? 20 : 30;

  const waistScore =
    params.sex === 'male'
      ? params.waistCm < 90
        ? 0
        : params.waistCm < 100
          ? 10
          : 20
      : params.waistCm < 80
        ? 0
        : params.waistCm < 90
          ? 10
          : 20;

  return ageScore + waistScore + params.activityScore + params.familyScore;
}

export function classifyDiabetesRisk(score: number): ToolResult {
  if (score < 30) {
    return {
      value: `${score} / 100`,
      label: 'Low diabetes risk score',
      detail:
        'Maintain waist control, physical activity, and routine screening as advised for your age.',
      tone: 'green',
    };
  }
  if (score <= 50) {
    return {
      value: `${score} / 100`,
      label: 'Moderate diabetes risk score',
      detail:
        'A fasting sugar or HbA1c test may be useful, especially if weight or family history is changing.',
      tone: 'amber',
    };
  }
  return {
    value: `${score} / 100`,
    label: 'High diabetes risk score',
    detail:
      'Please consider a diabetes evaluation and preventive plan with an endocrinology team.',
    tone: 'red',
  };
}

export function computeDiabetesRiskResult(values: {
  age: string;
  sex: string;
  waist: string;
  activity: string;
  family: string;
}): ToolResult | null {
  const ageYears = parseFloat(values.age);
  const waistCm = parseFloat(values.waist);
  if (!ageYears || !waistCm || !values.activity || !values.family) return null;
  if (ageYears <= 0 || waistCm <= 0) return null;

  const sex = values.sex === 'female' ? 'female' : 'male';
  const activityScore = Number(values.activity);
  const familyScore = Number(values.family);

  const score = calculateDiabetesRisk({
    ageYears,
    sex,
    waistCm,
    activityScore,
    familyScore,
  });

  return classifyDiabetesRisk(score);
}

export const diabetesFields: FieldDefinition[] = [
  { id: 'age', label: 'Age', type: 'number', suffix: 'years', min: 18, max: 100 },
  {
    id: 'sex',
    label: 'Sex for waist cutoff',
    type: 'select',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ],
  },
  { id: 'waist', label: 'Waist circumference', type: 'number', suffix: 'cm', min: 40, max: 180 },
  {
    id: 'activity',
    label: 'Physical activity',
    type: 'select',
    options: [
      { value: '', label: 'Select activity' },
      { value: '0', label: 'Regular exercise and strenuous work' },
      { value: '20', label: 'Regular exercise or strenuous work' },
      { value: '30', label: 'No exercise and sedentary work' },
    ],
  },
  {
    id: 'family',
    label: 'Family history of diabetes',
    type: 'select',
    options: [
      { value: '', label: 'Select family history' },
      { value: '0', label: 'No parent with diabetes' },
      { value: '10', label: 'One parent with diabetes' },
      { value: '20', label: 'Both parents with diabetes' },
    ],
    colSpan: 'full',
  },
];

export const diabetesMeta: ToolMeta = {
  id: 'diabetes-risk',
  title: 'Indian Diabetes Risk Score',
  description:
    'Estimates type 2 diabetes risk using age, waist, activity, and family history.',
  source: 'Indian Diabetes Risk Score (IDRS)',
  reviewDate: '2025-01',
};
