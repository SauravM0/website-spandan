'use client';

import React from 'react';
import { Clock3, XCircle } from 'lucide-react';
import { formatShortDate } from './CalendarUtils';

function Field({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-navy">
      {label}
      {React.cloneElement(children, {
        className: 'rounded-md border border-border px-3 py-2 text-sm font-semibold text-text',
      })}
    </label>
  );
}

export type OverrideAction = 'unavailable_whole_day' | 'custom_hours';

export type OverrideFormState = {
  start_time: string;
  end_time: string;
  slot_count: number;
  reason: string;
  public_note: string;
  internal_note: string;
};

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

export default function ScheduleForm({
  selectedDates,
  action,
  overrideForm,
  saving,
  loading,
  onSetAction,
  onUpdateForm,
  onSubmit,
}: {
  selectedDates: string[];
  action: OverrideAction;
  overrideForm: OverrideFormState;
  saving: boolean;
  loading: boolean;
  onSetAction: (action: OverrideAction) => void;
  onUpdateForm: (patch: Partial<OverrideFormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const totalMinutes = minutes(overrideForm.end_time) - minutes(overrideForm.start_time);
  const dividesEvenly = totalMinutes > 0 && totalMinutes % overrideForm.slot_count === 0;
  const slotMinutes = dividesEvenly ? totalMinutes / overrideForm.slot_count : 0;
  const invalidOpenPlan = action === 'custom_hours' && (!dividesEvenly || slotMinutes < 5 || slotMinutes > 240);

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-base font-black text-navy">Set availability</h3>
        <p className="mt-1 text-xs font-semibold text-text-light">
          {selectedDates.length === 1
            ? formatShortDate(selectedDates[0])
            : `${selectedDates.length} selected dates`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Open or closed">
        <button
          type="button"
          onClick={() => onSetAction('custom_hours')}
          className={`rounded-lg border p-3 text-left text-sm font-bold ${
            action === 'custom_hours' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-white text-navy'
          }`}
        >
          <Clock3 size={18} className="mb-2" /> Open
        </button>
        <button
          type="button"
          onClick={() => onSetAction('unavailable_whole_day')}
          className={`rounded-lg border p-3 text-left text-sm font-bold ${
            action === 'unavailable_whole_day' ? 'border-rose-600 bg-rose-600 text-white' : 'border-border bg-white text-navy'
          }`}
        >
          <XCircle size={18} className="mb-2" /> Closed
        </button>
      </div>

      {action === 'custom_hours' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opens at">
              <input type="time" value={overrideForm.start_time} onChange={(e) => onUpdateForm({ start_time: e.target.value })} />
            </Field>
            <Field label="Closes at">
              <input type="time" value={overrideForm.end_time} onChange={(e) => onUpdateForm({ end_time: e.target.value })} />
            </Field>
          </div>
          <Field label="Number of appointment slots">
            <input
              type="number"
              min="1"
              max="100"
              value={overrideForm.slot_count}
              onChange={(e) => onUpdateForm({ slot_count: Number(e.target.value) })}
            />
          </Field>
          <p className={`rounded-md p-2 text-xs font-bold ${invalidOpenPlan ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
            {invalidOpenPlan
              ? 'The hours must divide evenly into the selected number of slots.'
              : `${overrideForm.slot_count} slots · ${slotMinutes} minutes each`}
          </p>
        </>
      )}

      <button className={`btn w-full ${action === 'unavailable_whole_day' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'btn-accent'}`} type="submit" disabled={saving || loading || selectedDates.length === 0 || invalidOpenPlan}>
        {saving ? 'Saving…' : `Save ${selectedDates.length === 1 ? 'date' : `${selectedDates.length} dates`}`}
      </button>
    </form>
  );
}
