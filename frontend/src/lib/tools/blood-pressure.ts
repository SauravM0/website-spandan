import type { ToolResult, FieldDefinition, ToolMeta, ResultBand, ResultScale } from './types';

// The gauge plots systolic, which is the number that drives the category in
// most adult readings; the diastolic value stays in the headline figure.
export const BP_BANDS: ResultBand[] = [
  { upTo: 120, label: 'Normal', tone: 'green' },
  { upTo: 130, label: 'Elevated', tone: 'amber' },
  { upTo: 140, label: 'Stage 1', tone: 'amber' },
  { upTo: 180, label: 'Stage 2', tone: 'red' },
  { upTo: 200, label: 'Crisis', tone: 'red' },
];

function bpScale(systolic: number): ResultScale {
  return { value: systolic, min: 90, max: 200, bands: BP_BANDS, caption: 'systolic (mmHg)' };
}

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
      scale: bpScale(systolic),
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      value: display,
      label: 'High blood pressure, stage 2 range',
      detail:
        'Book a clinician review and confirm with repeated readings or ambulatory monitoring.',
      tone: 'red',
      scale: bpScale(systolic),
    };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      value: display,
      label: 'High blood pressure, stage 1 range',
      detail:
        'Lifestyle changes and risk assessment are important, particularly with diabetes or heart risk factors.',
      tone: 'amber',
      scale: bpScale(systolic),
    };
  }
  if (systolic >= 120 && diastolic < 80) {
    return {
      value: display,
      label: 'Elevated systolic range',
      detail:
        'Track home readings and focus on salt intake, sleep, exercise, and weight management.',
      tone: 'amber',
      scale: bpScale(systolic),
    };
  }
  return {
    value: display,
    label: 'Normal adult range',
    detail: 'Continue periodic checks. One reading does not replace regular monitoring.',
    tone: 'green',
    scale: bpScale(systolic),
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
