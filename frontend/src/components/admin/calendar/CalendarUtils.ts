export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const apiWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const reasonOptions = ['Holiday', 'Personal leave', 'Emergency', 'Festival', 'Clinic work', 'Other'];
export const statusTones: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-400',
  warm: 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400',
  info: 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400',
  muted: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
};

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return dateKey(new Date());
}

export function monthStart(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthEnd(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(value: string, amount: number) {
  const date = monthStart(value);
  date.setMonth(date.getMonth() + amount);
  return dateKey(date);
}

export function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T00:00:00`)
  );
}

export function formatTime(value?: string) {
  return value ? String(value).slice(0, 5) : '-';
}

export function monthCells(month: string) {
  const start = monthStart(month);
  const end = monthEnd(month);
  const cells: Array<{ date: string; inMonth: boolean }> = [];
  const cursor = new Date(start);
  const mondayOffset = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - mondayOffset);

  while (cells.length < 42) {
    cells.push({ date: dateKey(cursor), inMonth: cursor.getMonth() === start.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { cells, from: dateKey(start), to: dateKey(end) };
}

export function slotsForDay(slots: { available: boolean }[] = []) {
  const available = slots.filter((slot) => slot.available).length;
  const blocked = slots.filter((slot) => !slot.available).length;
  return { available, blocked, total: slots.length };
}

export function dayStatus(
  date: string,
  slots: { available: boolean }[] = [],
  overrides: { override_type: string }[] = [],
  appointmentCount = 0
) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const hasWholeDayBlock = overrides.some((item) => item.override_type === 'unavailable_whole_day');
  const hasPartialBlock = overrides.some((item) => item.override_type === 'block_time_range');
  const hasCustomHours = overrides.some((item) =>
    ['custom_hours', 'add_extra_hours'].includes(item.override_type)
  );
  const counts = slotsForDay(slots);

  if (hasWholeDayBlock) return { label: 'Unavailable', tone: 'danger' as const, Icon: 'XCircle' as const };
  if (day === 0 && !hasCustomHours) return { label: 'Sunday closed', tone: 'danger' as const, Icon: 'Sun' as const };
  if (counts.total === 0) return { label: 'No hours', tone: 'muted' as const, Icon: 'Lock' as const };
  if (counts.available === 0) return { label: 'Full', tone: 'danger' as const, Icon: 'XCircle' as const };
  if (hasPartialBlock || counts.blocked > 0) return { label: 'Partial', tone: 'warm' as const, Icon: 'Clock3' as const };
  if (appointmentCount > 0) return { label: 'Has bookings', tone: 'info' as const, Icon: 'CheckCircle2' as const };
  return { label: 'Available', tone: 'success' as const, Icon: 'CheckCircle2' as const };
}

export function statusClasses(tone: string, selected: boolean, inMonth: boolean) {
  const base = selected ? 'ring-2 ring-accent ring-offset-2' : '';
  const faded = inMonth ? '' : 'opacity-40';
  return `${base} ${faded} ${statusTones[tone] || statusTones.muted}`;
}

export function targetDatesFromScope(
  cells: { date: string; inMonth: boolean }[],
  selectedDate: string,
  applyScope: 'day' | 'week' | 'month'
) {
  if (applyScope === 'day') return [selectedDate];
  if (applyScope === 'week') {
    const day = new Date(`${selectedDate}T00:00:00`).getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = addDays(selectedDate, -mondayOffset);
    return Array.from({ length: 6 }, (_, index) => addDays(monday, index));
  }
  return cells
    .filter((cell) => cell.inMonth && new Date(`${cell.date}T00:00:00`).getDay() !== 0)
    .map((cell) => cell.date);
}
