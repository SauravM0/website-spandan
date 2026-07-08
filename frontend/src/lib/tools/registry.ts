import { bmiFields, bmiMeta, computeBmiResult } from './bmi';
import { bpFields, bpMeta, computeBpResult } from './blood-pressure';
import {
  diabetesFields,
  diabetesMeta,
  computeDiabetesRiskResult,
} from './diabetes-risk';
import type { FieldDefinition, ToolMeta } from './types';

export interface CalculatorEntry {
  meta: ToolMeta;
  fields: FieldDefinition[];
  compute: (values: Record<string, string>) => ReturnType<typeof computeBmiResult>;
  icon: string;
}

const registry: Record<string, CalculatorEntry> = {
  bmi: {
    meta: bmiMeta,
    fields: bmiFields,
    compute: (values) =>
      computeBmiResult(values['height'] ?? '', values['weight'] ?? ''),
    icon: 'Calculator',
  },
  'blood-pressure': {
    meta: bpMeta,
    fields: bpFields,
    compute: (values) =>
      computeBpResult(values['systolic'] ?? '', values['diastolic'] ?? ''),
    icon: 'HeartPulse',
  },
  'diabetes-risk': {
    meta: diabetesMeta,
    fields: diabetesFields,
    compute: (values) => computeDiabetesRiskResult(values as Parameters<typeof computeDiabetesRiskResult>[0]),
    icon: 'Droplets',
  },
};

export function getCalculator(id: string): CalculatorEntry | undefined {
  return registry[id];
}

export function getAllCalculators(): CalculatorEntry[] {
  return Object.values(registry);
}
