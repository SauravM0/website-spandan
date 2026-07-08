import { describe, it, expect } from 'vitest';
import { calculateDiabetesRisk, classifyDiabetesRisk, computeDiabetesRiskResult } from '../diabetes-risk';

describe('calculateDiabetesRisk', () => {
  it('computes minimum score (young, slim, active, no family)', () => {
    const score = calculateDiabetesRisk({
      ageYears: 25,
      sex: 'male',
      waistCm: 80,
      activityScore: 0,
      familyScore: 0,
    });
    expect(score).toBe(0);
  });

  it('computes maximum score (older, high waist, sedentary, both parents)', () => {
    const score = calculateDiabetesRisk({
      ageYears: 55,
      sex: 'male',
      waistCm: 110,
      activityScore: 30,
      familyScore: 20,
    });
    expect(score).toBe(100);
  });

  it('applies different waist cutoffs for female', () => {
    const lowWaist = calculateDiabetesRisk({ ageYears: 30, sex: 'female', waistCm: 75, activityScore: 0, familyScore: 0 });
    expect(lowWaist).toBe(0);

    const highWaist = calculateDiabetesRisk({ ageYears: 30, sex: 'female', waistCm: 95, activityScore: 0, familyScore: 0 });
    expect(highWaist).toBe(20);
  });

  it('age scores: <35 = 0, 35-49 = 20, 50+ = 30', () => {
    const young = calculateDiabetesRisk({ ageYears: 30, sex: 'male', waistCm: 80, activityScore: 0, familyScore: 0 });
    expect(young).toBe(0);

    const middle = calculateDiabetesRisk({ ageYears: 40, sex: 'male', waistCm: 80, activityScore: 0, familyScore: 0 });
    expect(middle).toBe(20);

    const old = calculateDiabetesRisk({ ageYears: 60, sex: 'male', waistCm: 80, activityScore: 0, familyScore: 0 });
    expect(old).toBe(30);
  });
});

describe('classifyDiabetesRisk', () => {
  it('classifies <30 as low risk', () => {
    const r = classifyDiabetesRisk(20);
    expect(r.label).toContain('Low');
    expect(r.tone).toBe('green');
    expect(r.value).toBe('20 / 100');
  });

  it('classifies 30-50 as moderate risk', () => {
    const r = classifyDiabetesRisk(40);
    expect(r.label).toContain('Moderate');
    expect(r.tone).toBe('amber');
  });

  it('classifies >50 as high risk', () => {
    const r = classifyDiabetesRisk(60);
    expect(r.label).toContain('High');
    expect(r.tone).toBe('red');
  });

  it('boundary: 30 exactly is moderate', () => {
    const r = classifyDiabetesRisk(30);
    expect(r.tone).toBe('amber');
  });

  it('boundary: 50 exactly is moderate', () => {
    const r = classifyDiabetesRisk(50);
    expect(r.tone).toBe('amber');
  });

  it('boundary: 51 is high', () => {
    const r = classifyDiabetesRisk(51);
    expect(r.tone).toBe('red');
  });
});

describe('computeDiabetesRiskResult', () => {
  it('returns null for missing age', () => {
    expect(computeDiabetesRiskResult({ age: '', sex: 'male', waist: '80', activity: '0', family: '0' })).toBeNull();
  });

  it('returns null for missing waist', () => {
    expect(computeDiabetesRiskResult({ age: '30', sex: 'male', waist: '', activity: '0', family: '0' })).toBeNull();
  });

  it('returns null for missing activity selection', () => {
    expect(computeDiabetesRiskResult({ age: '30', sex: 'male', waist: '80', activity: '', family: '0' })).toBeNull();
  });

  it('returns null for missing family selection', () => {
    expect(computeDiabetesRiskResult({ age: '30', sex: 'male', waist: '80', activity: '0', family: '' })).toBeNull();
  });

  it('returns null for zero age', () => {
    expect(computeDiabetesRiskResult({ age: '0', sex: 'male', waist: '80', activity: '0', family: '0' })).toBeNull();
  });

  it('returns null for non-numeric age', () => {
    expect(computeDiabetesRiskResult({ age: 'abc', sex: 'male', waist: '80', activity: '0', family: '0' })).toBeNull();
  });

  it('returns valid result for complete inputs', () => {
    const r = computeDiabetesRiskResult({ age: '45', sex: 'male', waist: '95', activity: '20', family: '10' });
    expect(r).not.toBeNull();
    expect(r!.label).toBeDefined();
    expect(r!.value).toBeDefined();
  });

  it('parses sex correctly for female', () => {
    const r = computeDiabetesRiskResult({ age: '45', sex: 'female', waist: '85', activity: '0', family: '0' });
    expect(r).not.toBeNull();
  });
});
