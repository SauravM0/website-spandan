export type Tone = 'green' | 'amber' | 'red' | 'navy';

export const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-success/10 text-success border-success/25',
  amber: 'bg-warm/10 text-warm border-warm/30',
  red: 'bg-danger/10 text-danger border-danger/25',
  navy: 'bg-wash-sage text-ink border-border-strong',
};

/** Marker colour for the band the reading falls into. */
export const TONE_MARKER: Record<Tone, string> = {
  green: 'bg-success',
  amber: 'bg-warm',
  red: 'bg-danger',
  navy: 'bg-accent',
};

/**
 * A band on a result scale, drawn by ToolGauge. `upTo` is the inclusive upper
 * bound of the band in the scale's own units.
 */
export interface ResultBand {
  upTo: number;
  label: string;
  tone: Tone;
}

/** Where a reading sits on its clinical scale, for the gauge. */
export interface ResultScale {
  /** The plotted number (BMI value, risk score, systolic reading). */
  value: number;
  min: number;
  max: number;
  bands: ResultBand[];
  /** What the plotted number is, e.g. "systolic" - shown under the gauge. */
  caption?: string;
}

export interface ToolResult {
  value: string;
  label: string;
  detail: string;
  tone: Tone;
  scale?: ResultScale;
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
