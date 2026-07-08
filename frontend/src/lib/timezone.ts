const CLINIC_TIMEZONE = 'Asia/Kolkata';

export function clinicDateString(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString('en-CA', { timeZone: CLINIC_TIMEZONE });
}

export function clinicToday(): string {
  return clinicDateString();
}

export function clinicDateTimeString(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleString('en-IN', { timeZone: CLINIC_TIMEZONE });
}

export function parseClinicDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function clinicDayBoundaries(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { start, end };
}

export function toClinicISO(date: Date): string {
  return date.toLocaleString('en-CA', { timeZone: CLINIC_TIMEZONE });
}
