import type { ToolResult, FieldDefinition, ToolMeta } from './types';

export function classifyBloodPressure(
  systolic: number,
  diastolic: number
): ToolResult {
  const display = `${systolic}/${diastolic} mmHg`;

  if (systolic > 180 || diastolic > 120) {
    return {
      value: display,
      label: 'Hypertensive crisis range',
      detail:
        'Seek urgent medical advice, especially with chest pain, breathlessness, weakness, severe headache, or vision changes.',
      tone: 'red',
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      value: display,
      label: 'High blood pressure, stage 2 range',
      detail:
        'Book a clinician review and confirm with repeated readings or ambulatory monitoring.',
      tone: 'red',
    };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      value: display,
      label: 'High blood pressure, stage 1 range',
      detail:
        'Lifestyle changes and risk assessment are important, particularly with diabetes or heart risk factors.',
      tone: 'amber',
    };
  }
  if (systolic >= 120 && diastolic < 80) {
    return {
      value: display,
      label: 'Elevated systolic range',
      detail:
        'Track home readings and focus on salt intake, sleep, exercise, and weight management.',
      tone: 'amber',
    };
  }
  return {
    value: display,
    label: 'Normal adult range',
    detail: 'Continue periodic checks. One reading does not replace regular monitoring.',
    tone: 'green',
  };
}

export function computeBpResult(systolic: string, diastolic: string): ToolResult | null {
  const sys = parseFloat(systolic);
  const dia = parseFloat(diastolic);
  if (!sys || !dia || sys <= 0 || dia <= 0) return null;
  return classifyBloodPressure(sys, dia);
}

export const bpFields: FieldDefinition[] = [
  {
    id: 'systolic',
    label: 'Systolic',
    type: 'number',
    suffix: 'mmHg',
    min: 70,
    max: 260,
  },
  {
    id: 'diastolic',
    label: 'Diastolic',
    type: 'number',
    suffix: 'mmHg',
    min: 40,
    max: 160,
  },
];

export const bpMeta: ToolMeta = {
  id: 'blood-pressure',
  title: 'Blood Pressure Risk Checker',
  description:
    'Classifies a resting adult reading and highlights when follow-up is sensible.',
  source: 'ACC/AHA blood pressure guidelines',
  reviewDate: '2025-01',
};
