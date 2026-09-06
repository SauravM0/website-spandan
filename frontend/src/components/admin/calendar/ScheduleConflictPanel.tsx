'use client';

import React from 'react';
import {
  applyAdminScheduleConflict,
  getAdminScheduleConflict,
  resolveAdminScheduleConflict,
} from '@/lib/api';
import { formatShortDate, formatTime } from './CalendarUtils';
import Button from '@/components/ui/Button';

export default function ScheduleConflictPanel({
  cases,
  scheduleVersion,
  canResolve,
  onChanged,
}: {
  cases: any[];
  scheduleVersion: number;
  canResolve: boolean;
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loadingId, setLoadingId] = React.useState('');
  const [savingId, setSavingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<string, { resolution: string; notes: string }>>({});

  const loadCase = async (id: string) => {
    setLoadingId(id);
    setError('');
    try {
      const result = await getAdminScheduleConflict('', id);
      setSelected(result.conflictCase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the conflict case.');
    } finally {
      setLoadingId('');
    }
  };

  const recordResolution = async (appointment: any) => {
    const draft = drafts[appointment.appointment_id] || { resolution: 'keep', notes: '' };
    if (draft.notes.trim().length < 3) {
      setError('Add a short note describing the patient-handling decision.');
      return;
    }
    setSavingId(appointment.appointment_id);
    setError('');
    try {
      await resolveAdminScheduleConflict('', selected.id, [{
        appointment_id: appointment.appointment_id,
        resolution: draft.resolution,
        notes: draft.notes.trim(),
      }]);
      await loadCase(selected.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the resolution.');
    } finally {
      setSavingId('');
    }
  };

  const applyChange = async () => {
    if (!selected) return;
    setSavingId(selected.id);
    setError('');
    try {
      await applyAdminScheduleConflict('', selected.id, scheduleVersion);
      setSelected(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the schedule change.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4" aria-labelledby="schedule-conflicts-title">
      <h3 id="schedule-conflicts-title" className="font-black text-amber-950">Appointments need resolution</h3>
      <p className="mt-1 text-sm text-amber-900">
        These schedule changes are not active. Review every affected appointment first.
      </p>
      {error && <p className="mt-3 rounded-md bg-white p-3 text-sm font-semibold text-danger" role="alert">{error}</p>}
      <div className="mt-3 grid gap-2">
        {cases.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex items-center justify-between rounded-md border border-amber-300 bg-white p-3 text-left text-sm font-bold text-ink"
            onClick={() => loadCase(item.id)}
            disabled={loadingId === item.id}
          >
            <span>{item.reason || 'Schedule change'} · {String(item.status).replace(/_/g, ' ')}</span>
            <span>{loadingId === item.id ? 'Loading…' : 'Review'}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-ink">{selected.reason}</p>
              <p className="text-xs font-semibold text-text-light">
                {(selected.requested_change?.dates || []).map(formatShortDate).join(', ')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>

          <div className="mt-3 grid gap-3">
            {(selected.appointments || []).map((appointment: any) => {
              const draft = drafts[appointment.appointment_id] || { resolution: 'keep', notes: '' };
              return (
                <div key={appointment.appointment_id} className="rounded-md border border-border p-3">
                  <p className="font-bold text-ink">{appointment.patient_name} · {appointment.appointment_number}</p>
                  <p className="text-xs text-text-light">
                    {formatShortDate(String(appointment.appointment_date).slice(0, 10))} at {formatTime(appointment.start_time)} · {appointment.phone_masked} · {appointment.status}
                  </p>
                  {appointment.resolution ? (
                    <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs font-bold text-emerald-800">
                      Resolved: {String(appointment.resolution).replace(/_/g, ' ')} — {appointment.notes}
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      {!canResolve && (
                        <p className="rounded-md bg-amber-50 p-2 text-xs font-bold text-amber-900">
                          Reception or a manager must resolve affected patient appointments.
                        </p>
                      )}
                      <select
                        className="rounded-md border border-border px-3 py-2 text-sm"
                        value={draft.resolution}
                        disabled={!canResolve}
                        onChange={(event) => setDrafts((current) => ({ ...current, [appointment.appointment_id]: { ...draft, resolution: event.target.value } }))}
                      >
                        <option value="keep">Keep this appointment</option>
                        <option value="cancel_contact">Cancelled and patient contacted</option>
                        <option value="reschedule">Already rescheduled to another date</option>
                        <option value="approved_transfer">Already transferred to another doctor</option>
                      </select>
                      <input
                        className="rounded-md border border-border px-3 py-2 text-sm"
                        placeholder="Required decision/contact note"
                        value={draft.notes}
                        disabled={!canResolve}
                        onChange={(event) => setDrafts((current) => ({ ...current, [appointment.appointment_id]: { ...draft, notes: event.target.value } }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="accent" size="sm" onClick={() => recordResolution(appointment)} disabled={!canResolve || savingId === appointment.appointment_id}>
                          {savingId === appointment.appointment_id ? 'Saving…' : 'Record resolution'}
                        </Button>
                        <Button href="/admin/appointments" variant="outline" size="sm">Open appointments</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selected.status === 'ready' && canResolve && (
            <Button variant="accent" className="mt-4 w-full" onClick={applyChange} disabled={savingId === selected.id}>
              {savingId === selected.id ? 'Applying…' : 'Apply resolved schedule change'}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
