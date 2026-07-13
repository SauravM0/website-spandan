'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createAdminAvailabilityRule,
  createAdminCalendarOverridesBatch,
  deleteAdminCalendarOverride,
  getAdminCalendarView,
  getAppointmentSlots,
  getDoctors,
  updateAdminAppointmentSettings,
} from '@/lib/api';
import type { AppointmentSettings } from '@/lib/api';
import CalendarGrid from '@/components/admin/calendar/CalendarGrid';
import AgendaList from '@/components/admin/calendar/AgendaList';
import DayInspector from '@/components/admin/calendar/DayInspector';
import ScheduleForm from '@/components/admin/calendar/ScheduleForm';
import AdvancedSettings from '@/components/admin/calendar/AdvancedSettings';
import ScheduleConflictPanel from '@/components/admin/calendar/ScheduleConflictPanel';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import {
  todayKey,
  monthCells,
} from '@/components/admin/calendar/CalendarUtils';
import type { OverrideAction, OverrideFormState } from '@/components/admin/calendar/ScheduleForm';

export default function AdminCalendarPage() {
  const { user } = useAdminSession();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<Record<string, any[]>>({});
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [scheduleVersion, setScheduleVersion] = useState(1);
  const [pendingCases, setPendingCases] = useState<any[]>([]);
  const [daySlots, setDaySlots] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [settingsWarnings, setSettingsWarnings] = useState<string[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [selectedDates, setSelectedDates] = useState<string[]>([todayKey()]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [month, setMonth] = useState(todayKey());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<OverrideAction>('custom_hours');
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>({
    start_time: '10:00',
    end_time: '14:00',
    slot_count: 8,
    reason: 'Clinic work',
    public_note: '',
    internal_note: '',
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
  const agendaDays = useMemo(() =>
    (calendarDays.length ? calendarDays : cells.map((cell) => ({
      date: cell.date,
      slots: availability[cell.date] || [],
      appointments: appointmentsByDate[cell.date] || [],
      overrides: overridesByDate[cell.date] || [],
    }))).filter((day) => String(day.date).slice(0, 7) === month.slice(0, 7))
  , [calendarDays, cells, availability, appointmentsByDate, overridesByDate, month]);

  const loadDoctors = async () => {
    setError('');
    try {
      const doctorRows = await getDoctors(false);
      const visibleDoctors = user.role === 'doctor'
        ? (doctorRows.doctors || []).filter((doctor: any) => doctor.id === user.doctor_id)
        : doctorRows.doctors || [];
      setDoctors(visibleDoctors);
      const firstDoctorId = visibleDoctors[0]?.id || user.doctor_id || '';
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
    const token = '';
    if (!nextDoctorId) return;

    setLoading(true);
    setError('');
    try {
      const result = await getAdminCalendarView(token, { doctor_id: nextDoctorId, from, to });
      if (requestId !== calendarRequestRef.current) return;
      const calendar = result.calendar || {};
      setRules(calendar.rules || []);
      setOverrides(calendar.overrides || []);
      setAppointments(calendar.appointments || []);
      setSettings(calendar.settings || null);
      setSettingsWarnings(calendar.warnings || []);
      setAvailability(calendar.availability || {});
      setDaySlots((calendar.availability || {})[selectedDate] || []);
      setCalendarDays(calendar.days || []);
      setScheduleVersion(Number(calendar.version || 1));
      setPendingCases(calendar.pendingConflictCases || []);
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
      const slots = availability[date];
      if (slots) {
        setDaySlots(slots);
        return;
      }
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
    setSelectedDates((current) => {
      if (!multiSelect) return [date];
      return current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort();
    });
    if (date < from || date > to) setMonth(date);
  };

  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { loadCalendarData(doctorId); }, [doctorId, from, to]);
  useEffect(() => { loadDaySlots(doctorId, selectedDate); }, [doctorId, selectedDate]);

  const applySchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId) return;
    const datesToSave = selectedDates;
    if (datesToSave.length === 0) return;

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const token = '';
      const payload = {
        doctor_id: doctorId,
        dates: datesToSave,
        override_type: action,
        start_time: action === 'unavailable_whole_day' ? undefined : overrideForm.start_time,
        end_time: action === 'unavailable_whole_day' ? undefined : overrideForm.end_time,
        slot_count: action === 'unavailable_whole_day' ? undefined : overrideForm.slot_count,
        reason: overrideForm.reason,
        public_note: overrideForm.public_note,
        internal_note: overrideForm.internal_note,
        expected_version: scheduleVersion,
      };
      const result = await createAdminCalendarOverridesBatch(token, payload);
      const skippedText = result.skipped?.length ? ` ${result.skipped.length} skipped.` : '';
      setMessage(result.requiresResolution
        ? `No hours were changed. A resolution case was created for ${result.conflicted.reduce((sum, item) => sum + item.appointment_count, 0)} affected appointment(s).`
        : `Saved ${result.created?.length || 0} calendar change(s).${skippedText}`);
      await Promise.all([loadCalendarData(doctorId), loadDaySlots(doctorId, selectedDate)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save calendar change.');
    } finally {
      setSaving(false);
    }
  };

  const saveRule = async (data: { weekday: number; closed: boolean; start_time?: string; end_time?: string; slot_count?: number; effective_from: string }) => {
    if (!doctorId) return;
    setSaving(true);
    setError('');
    try {
      const token = '';
      await createAdminAvailabilityRule(token, {
        doctor_id: doctorId,
        ...data,
        expected_version: scheduleVersion,
      });
      setMessage('Weekly schedule updated.');
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
      const token = '';
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
      const token = '';
      await deleteAdminCalendarOverride(token, id, scheduleVersion);
      setMessage('Calendar change removed.');
      await Promise.all([loadCalendarData(doctorId), loadDaySlots(doctorId, selectedDate)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove calendar change.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = (patch: Partial<AppointmentSettings>) => {
    if (settings) setSettings({ ...settings, ...patch });
  };

  return (
    <section className="bg-bg-alt py-6">
      <div className="container max-w-[1380px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Doctor calendar</p>
            <h1 className="mt-1 text-2xl font-black text-navy sm:text-3xl">Availability Calendar</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-light">Select a date, review slots, then apply a clear day or time change.</p>
          </div>
          <div className="grid w-full gap-3 rounded-lg border border-border bg-white p-3 shadow-sm sm:grid-cols-2 lg:w-auto lg:grid-cols-[260px_180px]">
            <label className="grid gap-1 text-sm font-semibold text-navy">
              Doctor
              <select className="rounded-md border border-border px-3 py-2" value={doctorId} disabled={user.role === 'doctor'} onChange={(e) => setDoctorId(e.target.value)}>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-navy">
              Date
              <input className="rounded-md border border-border px-3 py-2" type="date" value={selectedDate}
                onChange={(e) => { selectDate(e.target.value); setMonth(e.target.value); }} />
            </label>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-5 rounded-lg border p-3 text-sm font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 shadow-sm">
              <div>
                <p className="text-sm font-black text-navy">Choose dates</p>
                <p className="text-xs font-semibold text-text-light">
                  {multiSelect ? `${selectedDates.length} dates selected` : 'Select one date to edit'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${!multiSelect ? 'btn-accent' : 'btn-outline'}`}
                  onClick={() => { setMultiSelect(false); setSelectedDates([selectedDate]); }}
                >
                  One date
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${multiSelect ? 'btn-accent' : 'btn-outline'}`}
                  onClick={() => { setMultiSelect(true); setSelectedDates([selectedDate]); }}
                >
                  Multiple dates
                </button>
                {multiSelect && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedDates([])}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <AgendaList
              days={agendaDays}
              selectedDate={selectedDate}
              saving={saving}
              onSelect={selectDate}
            />
            <CalendarGrid
              month={month}
              cells={cells}
              availability={availability}
              appointmentsByDate={appointmentsByDate}
              overridesByDate={overridesByDate}
              selectedDate={selectedDate}
              selectedDates={selectedDates}
              saving={saving}
              onSelectDate={selectDate}
              onMonthChange={(m) => { setMonth(m); setSelectedDate(m); setSelectedDates([m]); }}
            />
          </div>

          <aside className="grid content-start gap-5">
            <DayInspector
              selectedDate={selectedDate}
              daySlots={daySlots}
              selectedAppointments={selectedAppointments}
              selectedOverrides={selectedOverrides}
              saving={saving}
              onRemoveOverride={removeOverride}
            >
              <ScheduleForm
                selectedDates={selectedDates}
                action={action}
                overrideForm={overrideForm}
                saving={saving}
                loading={loading}
                onSetAction={(a) => { setAction(a); setOverrideForm((f) => ({ ...f, reason: a === 'unavailable_whole_day' ? 'Clinic closed' : 'Clinic hours', public_note: a === 'unavailable_whole_day' ? 'Closed' : '' })); }}
                onUpdateForm={(patch) => setOverrideForm((f) => ({ ...f, ...patch }))}
                onSubmit={applySchedule}
              />
            </DayInspector>

            <AdvancedSettings
              rules={rules}
              overrides={overrides}
              settings={settings}
              settingsWarnings={settingsWarnings}
              saving={saving}
              canManageBookingPolicy={user.role !== 'doctor'}
              onSaveRule={saveRule}
              onSaveSettings={saveSettings}
              onUpdateSettings={handleUpdateSettings}
            />
            {pendingCases.length > 0 && (
              <ScheduleConflictPanel
                cases={pendingCases}
                scheduleVersion={scheduleVersion}
                canResolve={user.role !== 'doctor'}
                onChanged={() => loadCalendarData(doctorId)}
              />
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
