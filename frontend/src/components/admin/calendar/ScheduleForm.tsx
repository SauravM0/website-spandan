'use client';

import React from 'react';
import { Clock3, XCircle, Plus, Sun } from 'lucide-react';
import { reasonOptions, targetDatesFromScope } from './CalendarUtils';

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

const scopeOptions: Array<{ value: 'day' | 'week' | 'month'; label: string }> = [
  { value: 'day', label: 'This day' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const actionOptions: Array<{ value: OverrideAction; label: string; icon: React.ElementType }> = [
  { value: 'custom_hours', label: 'Set hours', icon: Clock3 },
  { value: 'block_time_range', label: 'Block time', icon: XCircle },
  { value: 'add_extra_hours', label: 'Add hours', icon: Plus },
  { value: 'unavailable_whole_day', label: 'Close', icon: Sun },
];

export type OverrideAction = 'unavailable_whole_day' | 'block_time_range' | 'custom_hours' | 'add_extra_hours';
export type ApplyScope = 'day' | 'week' | 'month';

export type OverrideFormState = {
  start_time: string;
  end_time: string;
  reason: string;
  public_note: string;
  internal_note: string;
};

export default function ScheduleForm({
  selectedDate,
  cells,
  applyScope,
  action,
  overrideForm,
  saving,
  loading,
  targetDatesLength,
  onSetScope,
  onSetAction,
  onUpdateForm,
  onSubmit,
}: {
  selectedDate: string;
  cells: { date: string; inMonth: boolean }[];
  applyScope: ApplyScope;
  action: OverrideAction;
  overrideForm: OverrideFormState;
  saving: boolean;
  loading: boolean;
  targetDatesLength: number;
  onSetScope: (scope: ApplyScope) => void;
  onSetAction: (action: OverrideAction) => void;
  onUpdateForm: (patch: Partial<OverrideFormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-border p-3">
      <h3 className="text-sm font-black text-navy">Adjust Hours</h3>

      <div className="grid grid-cols-3 gap-2">
        {scopeOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSetScope(value)}
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
        {actionOptions.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSetAction(value)}
            className={`rounded-lg border p-3 text-left text-sm font-bold transition ${
              action === value
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-white text-navy hover:border-accent'
            }`}
          >
            <Icon size={18} className="mb-2" />
            {label}
          </button>
        ))}
      </div>

      {action !== 'unavailable_whole_day' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <input
              type="time"
              value={overrideForm.start_time}
              onChange={(e) => onUpdateForm({ start_time: e.target.value })}
            />
          </Field>
          <Field label="End">
            <input
              type="time"
              value={overrideForm.end_time}
              onChange={(e) => onUpdateForm({ end_time: e.target.value })}
            />
          </Field>
        </div>
      )}

      <Field label="Reason">
        <select
          value={overrideForm.reason}
          onChange={(e) => onUpdateForm({ reason: e.target.value })}
        >
          {reasonOptions.map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </Field>

      <button className="btn btn-accent w-full" type="submit" disabled={saving || loading}>
        {saving ? 'Saving...' : `Save for ${targetDatesLength} date(s)`}
      </button>
    </form>
  );
}
