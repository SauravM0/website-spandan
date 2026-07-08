import { describe, it, expect } from 'vitest';
import { calculateBmi, classifyBmi, computeBmiResult } from '../bmi';

describe('calculateBmi', () => {
  it('computes BMI correctly for normal values', () => {
    // 70 kg / (1.75 m)^2 = 22.86
    expect(calculateBmi(175, 70)).toBeCloseTo(22.86, 1);
  });

  it('returns 0 for zero weight', () => {
    expect(calculateBmi(175, 0)).toBe(0);
  });

  it('handles very tall person', () => {
    const bmi = calculateBmi(200, 100);
    expect(bmi).toBeCloseTo(25, 0);
  });

  it('handles very short person', () => {
    const bmi = calculateBmi(100, 50);
    expect(bmi).toBeCloseTo(50, 0);
  });
});

describe('classifyBmi', () => {
  it('classifies under 18.5 as underweight', () => {
    const r = classifyBmi(17.9);
    expect(r.label).toBe('Underweight');
    expect(r.tone).toBe('amber');
    expect(r.value).toBe('17.9');
  });

  it('classifies 18.5-22.9 as healthy for Asian Indians', () => {
    const r = classifyBmi(21.0);
    expect(r.label).toContain('Healthy');
    expect(r.tone).toBe('green');
    expect(r.value).toBe('21.0');
  });

  it('classifies 23-24.9 as overweight', () => {
    const r = classifyBmi(24.0);
    expect(r.label).toBe('Overweight range');
    expect(r.tone).toBe('amber');
  });

  it('classifies 25+ as obesity', () => {
    const r = classifyBmi(30.0);
    expect(r.label).toBe('Obesity range');
    expect(r.tone).toBe('red');
  });

  it('boundary: 18.5 exactly is healthy', () => {
    const r = classifyBmi(18.5);
    expect(r.tone).toBe('green');
  });

  it('boundary: 23 exactly is overweight', () => {
    const r = classifyBmi(23);
    expect(r.tone).toBe('amber');
  });

  it('boundary: 25 exactly is obesity', () => {
    const r = classifyBmi(25);
    expect(r.tone).toBe('red');
  });
});

describe('computeBmiResult', () => {
  it('returns null for empty height', () => {
    expect(computeBmiResult('', '70')).toBeNull();
  });

  it('returns null for empty weight', () => {
    expect(computeBmiResult('175', '')).toBeNull();
  });

  it('returns null for zero height', () => {
    expect(computeBmiResult('0', '70')).toBeNull();
  });

  it('returns null for zero weight', () => {
    expect(computeBmiResult('175', '0')).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(computeBmiResult('-175', '70')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(computeBmiResult('abc', '70')).toBeNull();
  });

  it('computes valid result for normal inputs', () => {
    const r = computeBmiResult('175', '70');
    expect(r).not.toBeNull();
    expect(r!.value).toBeDefined();
    expect(r!.label).toBeDefined();
    expect(r!.detail).toBeDefined();
  });
});
