import { describe, expect, it } from 'vitest';
import { dayStatus, targetDatesFromScope } from '../CalendarUtils';

describe('calendar status rules', () => {
  it('shows Closed when a doctor has no effective hours', () => {
    expect(dayStatus('2026-07-19', [], [], 0).label).toBe('Closed');
  });

  it('allows Sunday to be open when the doctor has Sunday slots', () => {
    expect(dayStatus('2026-07-19', [{ available: true }], [], 0).label).toBe('Available');
  });

  it('uses Closed for a whole-day override', () => {
    expect(dayStatus('2026-07-20', [{ available: true }], [{ override_type: 'unavailable_whole_day' }], 0).label).toBe('Closed');
  });

  it('includes all seven days when selecting a week', () => {
    const dates = targetDatesFromScope([], '2026-07-15', 'week');
    expect(dates).toHaveLength(7);
    expect(dates).toContain('2026-07-19');
  });
});
