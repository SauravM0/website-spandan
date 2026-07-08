export type Tone = 'green' | 'amber' | 'red' | 'navy';

export const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  navy: 'bg-blue-50 text-navy border-blue-200',
};

export interface ToolResult {
  value: string;
  label: string;
  detail: string;
  tone: Tone;
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: 'number' | 'select';
  suffix?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  colSpan?: 'full';
}

export interface ToolMeta {
  id: string;
  title: string;
  description: string;
  source: string;
  reviewDate: string;
}

export function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
