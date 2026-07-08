import type { ToolResult, FieldDefinition, ToolMeta } from './types';

export function calculateBmi(heightCm: number, weightKg: number): number {
  return weightKg / (heightCm / 100) ** 2;
}

export function classifyBmi(bmi: number): ToolResult {
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
