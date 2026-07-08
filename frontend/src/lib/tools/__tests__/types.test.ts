import { describe, it, expect } from 'vitest';
import { parsePositiveNumber } from '../types';

describe('parsePositiveNumber', () => {
  it('parses a valid positive number', () => {
    expect(parsePositiveNumber('42')).toBe(42);
  });

  it('returns null for empty string', () => {
    expect(parsePositiveNumber('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parsePositiveNumber('0')).toBeNull();
  });

  it('returns null for negative', () => {
    expect(parsePositiveNumber('-5')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parsePositiveNumber('abc')).toBeNull();
  });

  it('parses decimal values', () => {
    expect(parsePositiveNumber('1.5')).toBe(1.5);
  });
});
