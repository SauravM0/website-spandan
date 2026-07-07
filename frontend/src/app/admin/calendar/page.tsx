'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  Plus,
  Settings2,
  Sun,
  Trash2,
  XCircle,
} from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout';
import {
  AppointmentSettings,
  createAdminAvailabilityRule,
  createAdminCalendarOverride,
  deleteAdminCalendarOverride,
  getAdminAppointmentSettings,
  getAdminAppointments,
  getAdminAvailabilityRules,
  getAdminCalendarOverrides,
  getAppointmentSlots,
  getDoctorAvailability,
  getDoctors,
  updateAdminAppointmentSettings,
} from '../../../lib/api';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const apiWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const reasonOptions = ['Holiday', 'Personal leave', 'Emergency', 'Festival', 'Clinic work', 'Other'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return dateKey(new Date());
}

function monthStart(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(value: string, amount: number) {
  const date = monthStart(value);
  date.setMonth(date.getMonth() + amount);
  return dateKey(date);
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatTime(value?: string) {
  return value ? String(value).slice(0, 5) : '-';
}

function monthCells(month: string) {
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

function slotsForDay(slots: any[] = []) {
  const available = slots.filter((slot) => slot.available).length;
  const blocked = slots.filter((slot) => !slot.available).length;
  return { available, blocked, total: slots.length };
}

function dayStatus(date: string, slots: any[] = [], overrides: any[] = [], appointmentCount = 0) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const hasWholeDayBlock = overrides.some((item) => item.override_type === 'unavailable_whole_day');
  const hasPartialBlock = overrides.some((item) => item.override_type === 'block_time_range');
  const hasCustomHours = overrides.some((item) =>
    ['custom_hours', 'add_extra_hours'].includes(item.override_type)
  );
  const counts = slotsForDay(slots);

  if (hasWholeDayBlock) return { label: 'Unavailable', tone: 'danger', icon: XCircle };
  if (day === 0 && !hasCustomHours) return { label: 'Sunday closed', tone: 'danger', icon: Sun };
  if (counts.total === 0) return { label: 'No hours', tone: 'muted', icon: Lock };
  if (counts.available === 0) return { label: 'Full', tone: 'danger', icon: XCircle };
  if (hasPartialBlock || counts.blocked > 0) return { label: 'Partial', tone: 'warm', icon: Clock3 };
  if (appointmentCount > 0) return { label: 'Has bookings', tone: 'info', icon: CheckCircle2 };
  return { label: 'Available', tone: 'success', icon: CheckCircle2 };
}

function statusClasses(tone: string, selected: boolean, inMonth: boolean) {
  const base = selected ? 'ring-2 ring-accent ring-offset-2' : '';
  const faded = inMonth ? '' : 'opacity-40';
  const tones: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
    danger: 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-400',
    warm: 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400',
    info: 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400',
    muted: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
  };
  return `${base} ${faded} ${tones[tone] || tones.muted}`;
}

export default function AdminCalendarPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<Record<string, any[]>>({});
  const [daySlots, setDaySlots] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [settingsWarnings, setSettingsWarnings] = useState<string[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [month, setMonth] = useState(todayKey());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [applyScope, setApplyScope] = useState<'day' | 'week' | 'month'>('day');
  const [action, setAction] = useState<'unavailable_whole_day' | 'block_time_range' | 'custom_hours' | 'add_extra_hours'>(
    'custom_hours'
  );
  const [overrideForm, setOverrideForm] = useState({
    start_time: '10:00',
    end_time: '14:00',
    reason: 'Clinic work',
    public_note: '',
    internal_note: '',
  });
  const [ruleForm, setRuleForm] = useState({
    weekday: '1',
    start_time: '10:00',
    end_time: '14:00',
    effective_from: todayKey(),
  });

  const { cells, from, to } = useMemo(() => monthCells(month), [month]);
  const calendarRequestRef = useRef(0);
  const daySlotsRequestRef = useRef(0);

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce<Record<string, any[]>>((map, item) => {
      const key = String(item.appointment_date || '').slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
      return map;
    }, {});
  }, [appointments]);

  const overridesByDate = useMemo(() => {
    return overrides.reduce<Record<string, any[]>>((map, item) => {
      const key = String(item.exception_date || '').slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
      return map;
    }, {});
  }, [overrides]);

  const selectedAppointments = appointmentsByDate[selectedDate] || [];
  const selectedOverrides = overridesByDate[selectedDate] || [];
  const selectedStatus = dayStatus(
    selectedDate,
    daySlots,
    selectedOverrides,
    selectedAppointments.length
  );
  const selectedCounts = slotsForDay(daySlots);
  const selectedHolidayOverride = selectedOverrides.find(
    (item) => item.override_type === 'unavailable_whole_day'
  );
  const selectedIsSunday = new Date(`${selectedDate}T00:00:00`).getDay() === 0;

  const targetDates = useMemo(() => {
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
  }, [applyScope, cells, selectedDate]);

  const loadDoctors = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }

    setError('');
    try {
      const doctorRows = await getDoctors(false);
      setDoctors(doctorRows.doctors || []);
      const firstDoctorId = doctorRows.doctors?.[0]?.id || '';
      if (firstDoctorId) {
        setDoctorId((current) => current || firstDoctorId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load doctors.');
      setLoading(false);
    }
  };

  const loadCalendarData = async (nextDoctorId = doctorId) => {
    const requestId = calendarRequestRef.current + 1;
    calendarRequestRef.current = requestId;
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    if (!nextDoctorId) return;

    setLoading(true);
    setError('');
    try {
      const [ruleRows, overrideRows, appointmentRows, appointmentSettings, monthRows] =
        await Promise.all([
          getAdminAvailabilityRules(token, { doctor_id: nextDoctorId }),
          getAdminCalendarOverrides(token, { doctor_id: nextDoctorId, from, to }),
          getAdminAppointments(token, { doctor_id: nextDoctorId, from, to }),
          getAdminAppointmentSettings(token),
          getDoctorAvailability(nextDoctorId, from, to),
        ]);
      if (requestId !== calendarRequestRef.current) return;
      setRules(ruleRows.rules || []);
      setOverrides(overrideRows.overrides || []);
      setAppointments(appointmentRows.appointments || []);
      setSettings(appointmentSettings.settings);
      setSettingsWarnings(appointmentSettings.warnings || []);
      setAvailability(monthRows.availability || {});
    } catch (err) {
      if (requestId !== calendarRequestRef.current) return;
      setError(err instanceof Error ? err.message : 'Could not load calendar.');
    } finally {
      if (requestId !== calendarRequestRef.current) return;
      setLoading(false);
    }
  };

  const loadDaySlots = async (nextDoctorId = doctorId, date = selectedDate) => {
    if (!nextDoctorId) return;
    const requestId = daySlotsRequestRef.current + 1;
    daySlotsRequestRef.current = requestId;
    try {
      const slotRows = await getAppointmentSlots(nextDoctorId, date);
      if (requestId !== daySlotsRequestRef.current) return;
      setDaySlots(slotRows.slots || []);
    } catch (err) {
      if (requestId !== daySlotsRequestRef.current) return;
      setError(err instanceof Error ? err.message : 'Could not load slots.');
      setDaySlots([]);
    }
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    if (date < from || date > to) setMonth(date);
  };

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCalendarData(doctorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, from, to]);

  useEffect(() => {
    loadDaySlots(doctorId, selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, selectedDate]);

  const toggleHoliday = async (date: string) => {
    if (!doctorId) return;
    const dateOverrides = overridesByDate[date] || [];
    const holidayOverrides = dateOverrides.filter(
      (item) => item.override_type === 'unavailable_whole_day'
    );
    const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;

    setSelectedDate(date);
    if (isSunday) {
      setMessage('Sunday is always closed.');
      return;
    }
    const dateAppointments = appointmentsByDate[date] || [];
    if (holidayOverrides.length === 0 && dateAppointments.length > 0) {
      const ok = window.confirm(
        `${dateAppointments.length} appointment(s) already exist on this date. This will stop new bookings, but existing appointments must be rescheduled separately. Continue?`
      );
      if (!ok) return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('admin_token') || '';
      if (holidayOverrides.length > 0) {
        await Promise.all(
          holidayOverrides.map((item) => deleteAdminCalendarOverride(token, item.id))
        );
        setMessage(`${formatShortDate(date)} is open as per schedule.`);
      } else {
        await createAdminCalendarOverride(token, {
          doctor_id: doctorId,
          exception_date: date,
          override_type: 'unavailable_whole_day',
          reason: 'Holiday',
          public_note: 'Clinic closed',
        });
        setMessage(`${formatShortDate(date)} marked as holiday.`);
      }
      await Promise.all([loadCalendarData(doctorId), loadDaySlots(doctorId, date)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update holiday.');
    } finally {
      setSaving(false);
    }
  };

  const applySchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId) return;
    const datesToSave = targetDates.filter(
      (date) =>
        action !== 'unavailable_whole_day' || new Date(`${date}T00:00:00`).getDay() !== 0
    );
    if (datesToSave.length === 0) return;
    const appointmentTotal = datesToSave.reduce(
      (total, date) => total + (appointmentsByDate[date]?.length || 0),
      0
    );
    if (action === 'unavailable_whole_day' && appointmentTotal > 0) {
      const ok = window.confirm(
        `${appointmentTotal} appointment(s) already exist in this range. This will stop new bookings, but existing appointments must be rescheduled separately. Continue?`
      );
      if (!ok) return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('admin_token') || '';
      await Promise.all(
        datesToSave.map((date) =>
          createAdminCalendarOverride(token, {
            doctor_id: doctorId,
            exception_date: date,
            override_type: action,
            start_time: action === 'unavailable_whole_day' ? undefined : overrideForm.start_time,
            end_time: action === 'unavailable_whole_day' ? undefined : overrideForm.end_time,
            reason: overrideForm.reason,
            public_note: overrideForm.public_note,
            internal_note: overrideForm.internal_note,
          })
        )
      );
      setMessage(`Saved ${datesToSave.length} calendar change(s).`);
      await Promise.all([loadCalendarData(doctorId), loadDaySlots(doctorId, selectedDate)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save calendar change.');
    } finally {
      setSaving(false);
    }
  };

  const saveRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token') || '';
      await createAdminAvailabilityRule(token, {
        doctor_id: doctorId,
        weekday: Number(ruleForm.weekday),
        start_time: ruleForm.start_time,
        end_time: ruleForm.end_time,
        slot_minutes: 30,
        effective_from: ruleForm.effective_from,
      });
      setMessage(`${apiWeekdays[Number(ruleForm.weekday)]} working hours added.`);
      await Promise.all([loadCalendarData(doctorId), loadDaySlots(doctorId, selectedDate)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add working hours.');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token') || '';
      const result = await updateAdminAppointmentSettings(token, settings);
      setSettings(result.settings);
      setSettingsWarnings(result.warnings || []);
      setMessage('Appointment settings updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update settings.');
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = async (id: string) => {
    if (!doctorId) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('admin_token') || '';
      await deleteAdminCalendarOverride(token, id);
      setMessage('Calendar change removed.');
      await Promise.all([loadCalendarData(doctorId), loadDaySlots(doctorId, selectedDate)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove calendar change.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <section className="bg-bg-alt py-6">
        <div className="container max-w-[1380px]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Doctor calendar
              </p>
              <h1 className="mt-1 text-2xl font-black text-navy sm:text-3xl">
                Availability Calendar
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-text-light">
                Select a date, review slots, then apply a clear day or time change.
              </p>
            </div>
            <div className="grid w-full gap-3 rounded-lg border border-border bg-white p-3 shadow-sm sm:grid-cols-2 lg:w-auto lg:grid-cols-[260px_180px]">
              <label className="grid gap-1 text-sm font-semibold text-navy">
                Doctor
                <select
                  className="rounded-md border border-border px-3 py-2"
                  value={doctorId}
                  onChange={(event) => setDoctorId(event.target.value)}
                >
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-navy">
                Date
                <input
                  className="rounded-md border border-border px-3 py-2"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    selectDate(event.target.value);
                    setMonth(event.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          {(message || error) && (
            <div
              className={`mb-5 rounded-lg border p-3 text-sm font-semibold ${
                error
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {error || message}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black text-navy">
                    <CalendarDays size={22} />{' '}
                    {new Intl.DateTimeFormat('en-IN', {
                      month: 'long',
                      year: 'numeric',
                    }).format(monthStart(month))}
                  </h2>
                  <p className="text-sm text-text-light">
                    Monday to Saturday are working days. Sunday is always closed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => {
                      const nextMonth = addMonths(month, -1);
                      setMonth(nextMonth);
                      setSelectedDate(nextMonth);
                    }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="btn btn-accent btn-sm"
                    type="button"
                    onClick={() => {
                      setMonth(todayKey());
                      setSelectedDate(todayKey());
                    }}
                  >
                    Today
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => {
                      const nextMonth = addMonths(month, 1);
                      setMonth(nextMonth);
                      setSelectedDate(nextMonth);
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4 grid gap-2 rounded-lg border border-border bg-bg-alt p-3 text-xs font-bold text-text-light sm:grid-cols-4">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Has bookings
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Partial
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Closed
                </span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-text-light">
                    {weekdays.map((day) => (
                      <div key={day} className="py-2">
                        {day.slice(0, 3)}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {cells.map((cell) => {
                  const dayAppointments = appointmentsByDate[cell.date] || [];
                  const dayOverrides = overridesByDate[cell.date] || [];
                  const status = dayStatus(
                    cell.date,
                    availability[cell.date] || [],
                    dayOverrides,
                    dayAppointments.length
                  );
                  const counts = slotsForDay(availability[cell.date] || []);
                  const Icon = status.icon;
                  const selected = cell.date === selectedDate;

                      return (
                        <button
                          key={cell.date}
                          type="button"
                          onClick={() => selectDate(cell.date)}
                          disabled={saving}
                          className={`min-h-[104px] rounded-lg border p-2 text-left transition duration-150 ${statusClasses(
                            status.tone,
                            selected,
                            cell.inMonth
                          )}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-lg font-black">
                              {new Date(`${cell.date}T00:00:00`).getDate()}
                            </span>
                            <Icon size={17} />
                          </div>
                          <p className="mt-2 text-xs font-bold leading-tight">{status.label}</p>
                          <div className="mt-2 min-h-[24px] text-[11px] font-semibold leading-tight">
                            {counts.total > 0 && <p>{counts.available} open slots</p>}
                            {dayAppointments.length > 0 && (
                              <p>{dayAppointments.length} appointment(s)</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-5">
              <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
                      Selected Date
                    </p>
                    <h2 className="mt-1 text-xl font-black text-navy">{formatDate(selectedDate)}</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      selectedStatus.tone === 'danger'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedStatus.tone === 'warm'
                          ? 'bg-amber-100 text-amber-900'
                          : selectedStatus.tone === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedStatus.label}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Open Slots" value={selectedCounts.available} />
                  <Stat label="Booked" value={selectedAppointments.length} />
                  <Stat label="Blocked" value={selectedCounts.blocked} />
                </div>

                <div className="mb-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => toggleHoliday(selectedDate)}
                    disabled={saving || selectedIsSunday}
                    className={`btn w-full ${
                      selectedHolidayOverride || selectedIsSunday ? 'btn-outline' : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {selectedHolidayOverride || selectedIsSunday ? (
                      <>
                        <Trash2 size={17} /> Open This Day
                      </>
                    ) : (
                      <>
                        <XCircle size={17} /> Close This Day
                      </>
                    )}
                  </button>
                  {selectedIsSunday && (
                    <p className="text-xs font-semibold text-text-light">
                      Sunday stays closed automatically.
                    </p>
                  )}
                </div>

                <div className="mb-4 rounded-lg border border-border bg-bg-alt p-3">
                  <p className="mb-2 text-sm font-black text-navy">Slots</p>
                  <div className="grid max-h-44 gap-2 overflow-auto">
                    {daySlots.map((slot) => (
                      <div
                        key={`${slot.start_time}-${slot.end_time}`}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-xs font-bold ${
                          slot.available ? 'bg-white text-emerald-800' : 'bg-white text-text-light'
                        }`}
                      >
                        <span>
                          {formatTime(slot.start_time)} to {formatTime(slot.end_time)}
                        </span>
                        <span>{slot.available ? 'Open' : slot.reason || 'Blocked'}</span>
                      </div>
                    ))}
                    {daySlots.length === 0 && (
                      <p className="rounded-md bg-white p-3 text-sm font-semibold text-text-light">
                        No slots for this date.
                      </p>
                    )}
                  </div>
                </div>

                {selectedOverrides.length > 0 && (
                  <div className="mb-4 rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm font-black text-navy">Saved Changes</p>
                    <div className="grid gap-2">
                      {selectedOverrides.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-md bg-bg-alt p-2 text-xs font-bold"
                        >
                          <span>
                            {String(item.override_type).replace(/_/g, ' ')}
                            {item.start_time
                              ? `, ${formatTime(item.start_time)} to ${formatTime(item.end_time)}`
                              : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOverride(item.id)}
                            disabled={saving}
                            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border bg-white text-danger"
                            aria-label="Remove calendar change"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={applySchedule} className="grid gap-4 rounded-lg border border-border p-3">
                  <h3 className="text-sm font-black text-navy">Adjust Hours</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['day', 'This day'],
                      ['week', 'This week'],
                      ['month', 'This month'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setApplyScope(value as typeof applyScope)}
                        className={`rounded-md border px-2 py-2 text-sm font-bold ${
                          applyScope === value
                            ? 'border-accent bg-accent text-white'
                            : 'border-border bg-white text-navy'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['custom_hours', 'Set hours', Clock3],
                      ['block_time_range', 'Block time', XCircle],
                      ['add_extra_hours', 'Add hours', Plus],
                      ['unavailable_whole_day', 'Close', Sun],
                    ].map(([value, label, Icon]) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => {
                          const nextAction = value as typeof action;
                          setAction(nextAction);
                          setOverrideForm((current) => ({
                            ...current,
                            reason: nextAction === 'unavailable_whole_day' ? 'Holiday' : 'Clinic work',
                          }));
                        }}
                        className={`rounded-lg border p-3 text-left text-sm font-bold transition ${
                          action === value
                            ? 'border-accent bg-accent text-white'
                            : 'border-border bg-white text-navy hover:border-accent'
                        }`}
                      >
                        {React.createElement(Icon as typeof XCircle, { size: 18, className: 'mb-2' })}
                        {String(label)}
                      </button>
                    ))}
                  </div>

                  {action !== 'unavailable_whole_day' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start">
                        <input
                          type="time"
                          value={overrideForm.start_time}
                          onChange={(event) =>
                            setOverrideForm({ ...overrideForm, start_time: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="End">
                        <input
                          type="time"
                          value={overrideForm.end_time}
                          onChange={(event) =>
                            setOverrideForm({ ...overrideForm, end_time: event.target.value })
                          }
                        />
                      </Field>
                    </div>
                  )}

                  <Field label="Reason">
                    <select
                      value={overrideForm.reason}
                      onChange={(event) =>
                        setOverrideForm({ ...overrideForm, reason: event.target.value })
                      }
                    >
                      {reasonOptions.map((reason) => (
                        <option key={reason}>{reason}</option>
                      ))}
                    </select>
                  </Field>

                  <button className="btn btn-accent w-full" type="submit" disabled={saving || loading}>
                    {saving ? 'Saving...' : `Save for ${targetDates.length} date(s)`}
                  </button>
                </form>
              </div>

              <div className="rounded-lg border border-border bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex w-full items-center justify-between p-4 text-left font-black text-navy"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 size={18} /> Advanced settings
                  </span>
                  {advancedOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>

                {advancedOpen && (
                  <div className="grid gap-5 border-t border-border p-4">
                    <form onSubmit={saveRule} className="grid gap-3">
                      <h3 className="font-bold text-navy">Add weekly working hours</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Weekday">
                          <select
                            value={ruleForm.weekday}
                            onChange={(event) =>
                              setRuleForm({ ...ruleForm, weekday: event.target.value })
                            }
                          >
                            {apiWeekdays.map((day, index) => (
                              <option key={day} value={index}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="From date">
                          <input
                            type="date"
                            value={ruleForm.effective_from}
                            onChange={(event) =>
                              setRuleForm({ ...ruleForm, effective_from: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Start">
                          <input
                            type="time"
                            value={ruleForm.start_time}
                            onChange={(event) =>
                              setRuleForm({ ...ruleForm, start_time: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="End">
                          <input
                            type="time"
                            value={ruleForm.end_time}
                            onChange={(event) =>
                              setRuleForm({ ...ruleForm, end_time: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <button className="btn btn-outline w-full" type="submit" disabled={saving}>
                        Add weekly hours
                      </button>
                    </form>

                    {settings && (
                      <form onSubmit={saveSettings} className="grid gap-3">
                        <h3 className="font-bold text-navy">Booking rules</h3>
                        {settingsWarnings.map((warning) => (
                          <p
                            key={warning}
                            className="rounded-md bg-amber-50 p-2 text-xs font-bold text-amber-900"
                          >
                            {warning}
                          </p>
                        ))}
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Hold minutes">
                            <select
                              value={settings.hold_duration_minutes}
                              onChange={(event) =>
                                setSettings({
                                  ...settings,
                                  hold_duration_minutes: Number(event.target.value),
                                })
                              }
                            >
                              <option value={15}>15 minutes</option>
                              <option value={30}>30 minutes</option>
                              <option value={60}>60 minutes</option>
                              <option value={1440}>24 hours</option>
                            </select>
                          </Field>
                          <Field label="Notice minutes">
                            <input
                              type="number"
                              min="0"
                              max="1440"
                              value={settings.minimum_booking_notice_minutes}
                              onChange={(event) =>
                                setSettings({
                                  ...settings,
                                  minimum_booking_notice_minutes: Number(event.target.value),
                                })
                              }
                            />
                          </Field>
                          <Field label="Horizon days">
                            <input
                              type="number"
                              min="1"
                              max="180"
                              value={settings.maximum_booking_horizon_days}
                              onChange={(event) =>
                                setSettings({
                                  ...settings,
                                  maximum_booking_horizon_days: Number(event.target.value),
                                })
                              }
                            />
                          </Field>
                          <Field label="Cancel cutoff hours">
                            <input
                              type="number"
                              min="0"
                              max="168"
                              value={settings.cancellation_cutoff_hours}
                              onChange={(event) =>
                                setSettings({
                                  ...settings,
                                  cancellation_cutoff_hours: Number(event.target.value),
                                })
                              }
                            />
                          </Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-bold text-navy">
                          <input
                            type="checkbox"
                            checked={settings.same_day_booking_allowed}
                            onChange={(event) =>
                              setSettings({
                                ...settings,
                                same_day_booking_allowed: event.target.checked,
                              })
                            }
                          />
                          Same-day booking
                        </label>
                        <Field label="Arrival note">
                          <input
                            value={settings.arrival_buffer_instructions}
                            onChange={(event) =>
                              setSettings({
                                ...settings,
                                arrival_buffer_instructions: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <button className="btn btn-outline w-full" type="submit" disabled={saving}>
                          Save booking rules
                        </button>
                      </form>
                    )}

                    <MiniList title="Recent calendar changes" rows={overrides} />
                    <MiniRuleList rows={rules} />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-navy">
      {label}
      {React.cloneElement(children as React.ReactElement, {
        className: 'rounded-md border border-border px-3 py-2 text-sm font-semibold text-text',
      })}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg-alt p-3">
      <p className="text-2xl font-black text-navy">{value}</p>
      <p className="text-xs font-bold text-text-light">{label}</p>
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div>
      <h3 className="mb-2 font-bold text-navy">{title}</h3>
      <div className="grid gap-2">
        {rows.slice(0, 5).map((row) => (
          <div key={row.id} className="rounded-md bg-bg-alt p-2 text-xs font-semibold">
            <p className="font-bold text-navy">
              {formatShortDate(String(row.exception_date).slice(0, 10))} -{' '}
              {String(row.override_type).replace(/_/g, ' ')}
            </p>
            <p className="text-text-light">
              {formatTime(row.start_time)} {row.end_time ? `to ${formatTime(row.end_time)}` : ''}
              {row.reason ? `, ${row.reason}` : ''}
            </p>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-md bg-bg-alt p-2 text-sm font-semibold text-text-light">
            No calendar changes this month.
          </p>
        )}
      </div>
    </div>
  );
}

function MiniRuleList({ rows }: { rows: any[] }) {
  return (
    <div>
      <h3 className="mb-2 font-bold text-navy">Weekly working hours</h3>
      <div className="grid gap-2">
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} className="rounded-md bg-bg-alt p-2 text-xs font-semibold">
            <p className="font-bold text-navy">{apiWeekdays[row.weekday]}</p>
            <p className="text-text-light">
              {formatTime(row.start_time)} to {formatTime(row.end_time)}
            </p>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-md bg-bg-alt p-2 text-sm font-semibold text-text-light">
            No weekly hours found.
          </p>
        )}
      </div>
    </div>
  );
}
