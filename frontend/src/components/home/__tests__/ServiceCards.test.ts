import { describe, expect, it } from 'vitest';
import ServiceCards from '../ServiceCards';

describe('care-path section', () => {
  it('exports the public services section', () => {
    expect(ServiceCards).toBeTypeOf('function');
  });
});
