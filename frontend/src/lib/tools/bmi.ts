import type { ToolResult, FieldDefinition, ToolMeta, ResultBand, ResultScale } from './types';

export function calculateBmi(heightCm: number, weightKg: number): number {
  return weightKg / (heightCm / 100) ** 2;
}

// Asian Indian adult cut-offs, plotted from a plausible clinical floor to a
// ceiling where further precision stops changing the advice.
export const BMI_BANDS: ResultBand[] = [
  { upTo: 18.5, label: 'Under', tone: 'amber' },
  { upTo: 23, label: 'Healthy', tone: 'green' },
  { upTo: 25, label: 'Overweight', tone: 'amber' },
  { upTo: 40, label: 'Obesity', tone: 'red' },
];

function bmiScale(bmi: number): ResultScale {
  return { value: bmi, min: 14, max: 40, bands: BMI_BANDS, caption: 'BMI' };
}

export function classifyBmi(bmi: number): ToolResult {
  if (bmi < 18.5) {
    return {
      value: bmi.toFixed(1),
      label: 'Underweight',
      detail: 'Discuss nutrition, appetite, and any recent weight loss with your clinician.',
      tone: 'amber',
      scale: bmiScale(bmi),
    };
  }
  if (bmi < 23) {
    return {
      value: bmi.toFixed(1),
      label: 'Healthy range for Asian Indian adults',
      detail: 'Keep up balanced meals, regular movement, and routine preventive checks.',
      tone: 'green',
      scale: bmiScale(bmi),
    };
  }
  if (bmi < 25) {
    return {
      value: bmi.toFixed(1),
      label: 'Overweight range',
      detail: 'Even modest weight reduction can improve blood pressure, sugar, and lipids.',
      tone: 'amber',
      scale: bmiScale(bmi),
    };
  }
  return {
    value: bmi.toFixed(1),
    label: 'Obesity range',
    detail: 'Consider a medical review for diabetes, thyroid, lipid, and cardiac risk factors.',
    tone: 'red',
    scale: bmiScale(bmi),
  };
}

export function computeBmiResult(height: string, weight: string): ToolResult | null {
  const heightCm = parseFloat(height);
  const weightKg = parseFloat(weight);
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const bmi = calculateBmi(heightCm, weightKg);
  return classifyBmi(bmi);
}

export const bmiFields: FieldDefinition[] = [
  { id: 'height', label: 'Height', type: 'number', suffix: 'cm', min: 60, max: 240 },
  { id: 'weight', label: 'Weight', type: 'number', suffix: 'kg', min: 20, max: 250 },
];

export const bmiMeta: ToolMeta = {
  id: 'bmi',
  title: 'BMI Calculator',
  description: 'Uses Asian Indian adult BMI ranges to estimate weight category.',
  source: 'WHO Asian-Pacific BMI classification',
  reviewDate: '2025-01',
};
