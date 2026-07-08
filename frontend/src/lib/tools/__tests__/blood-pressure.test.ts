import { describe, it, expect } from 'vitest';
import { classifyBloodPressure, computeBpResult } from '../blood-pressure';

describe('classifyBloodPressure', () => {
  it('classifies normal range (110/75)', () => {
    const r = classifyBloodPressure(110, 75);
    expect(r.tone).toBe('green');
    expect(r.label).toBe('Normal adult range');
  });

  it('classifies elevated systolic (120-129 / <80)', () => {
    const r = classifyBloodPressure(125, 75);
    expect(r.tone).toBe('amber');
    expect(r.label).toContain('Elevated');
  });

  it('classifies stage 1 hypertension (130-139 / 80-89)', () => {
    const r = classifyBloodPressure(135, 85);
    expect(r.tone).toBe('amber');
    expect(r.label).toContain('stage 1');
  });

  it('stage 1 by diastolic (120/80)', () => {
    const r = classifyBloodPressure(120, 80);
    expect(r.tone).toBe('amber');
    expect(r.label).toContain('stage 1');
  });

  it('classifies stage 2 hypertension (150/95)', () => {
    const r = classifyBloodPressure(150, 95);
    expect(r.tone).toBe('red');
    expect(r.label).toContain('stage 2');
  });

  it('classifies hypertensive crisis (>180 / >120)', () => {
    const r = classifyBloodPressure(190, 130);
    expect(r.tone).toBe('red');
    expect(r.label).toContain('crisis');
  });

  it('boundary: 119/79 exactly → normal', () => {
    const r = classifyBloodPressure(119, 79);
    expect(r.tone).toBe('green');
  });

  it('boundary: 130/80 exactly → stage 1', () => {
    const r = classifyBloodPressure(130, 80);
    expect(r.tone).toBe('amber');
  });

  it('boundary: 140/90 exactly → stage 2', () => {
    const r = classifyBloodPressure(140, 90);
    expect(r.tone).toBe('red');
  });

  it('boundary: 181/120 → crisis', () => {
    const r = classifyBloodPressure(181, 120);
    expect(r.tone).toBe('red');
    expect(r.label).toContain('crisis');
  });

  it('handles high systolic with normal diastolic', () => {
    const r = classifyBloodPressure(145, 75);
    expect(r.label).toContain('stage 2');
  });

  it('handles normal systolic with high diastolic', () => {
    const r = classifyBloodPressure(110, 95);
    expect(r.label).toContain('stage 2');
  });

  it('returns value string in correct format', () => {
    const r = classifyBloodPressure(120, 80);
    expect(r.value).toBe('120/80 mmHg');
  });
});

describe('computeBpResult', () => {
  it('returns null for empty systolic', () => {
    expect(computeBpResult('', '80')).toBeNull();
  });

  it('returns null for empty diastolic', () => {
    expect(computeBpResult('120', '')).toBeNull();
  });

  it('returns null for zero values', () => {
    expect(computeBpResult('0', '80')).toBeNull();
    expect(computeBpResult('120', '0')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(computeBpResult('abc', '80')).toBeNull();
  });

  it('returns result for valid inputs', () => {
    const r = computeBpResult('120', '80');
    expect(r).not.toBeNull();
    expect(r!.value).toBe('120/80 mmHg');
  });
});
