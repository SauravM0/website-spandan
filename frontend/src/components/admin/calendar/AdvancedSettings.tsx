'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { apiWeekdays, formatShortDate, formatTime } from './CalendarUtils';
import type { AppointmentSettings } from '@/lib/api';
import Button from '@/components/ui/Button';

function Field({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-ink">
      {label}
      {React.cloneElement(children, {
        className: 'rounded-md border border-border px-3 py-2 text-sm font-semibold text-text',
      })}
    </label>
  );
}

export default function AdvancedSettings({
  rules,
  overrides,
  settings,
  settingsWarnings,
  saving,
  canManageBookingPolicy,
  onSaveRule,
  onSaveSettings,
  onUpdateSettings,
}: {
  rules: any[];
  overrides: any[];
  settings: AppointmentSettings | null;
  settingsWarnings: string[];
  saving: boolean;
  canManageBookingPolicy: boolean;
  onSaveRule: (data: { weekday: number; closed: boolean; start_time?: string; end_time?: string; slot_count?: number; effective_from: string }) => void;
  onSaveSettings: (e: React.FormEvent) => void;
  onUpdateSettings: (patch: Partial<AppointmentSettings>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [weekday, setWeekday] = React.useState('1');
  const [ruleStart, setRuleStart] = React.useState('10:00');
  const [ruleEnd, setRuleEnd] = React.useState('14:00');
  const [ruleClosed, setRuleClosed] = React.useState(false);
  const [slotCount, setSlotCount] = React.useState(8);
  const [effectiveFrom, setEffectiveFrom] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    onSaveRule({
      weekday: Number(weekday),
      closed: ruleClosed,
      start_time: ruleClosed ? undefined : ruleStart,
      end_time: ruleClosed ? undefined : ruleEnd,
      slot_count: ruleClosed ? undefined : slotCount,
      effective_from: effectiveFrom,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left font-black text-ink"
      >
        <span className="flex items-center gap-2">
          <Settings2 size={18} /> Advanced settings
        </span>
        {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {open && (
        <div className="grid gap-5 border-t border-border p-4">
          <form onSubmit={handleRuleSubmit} className="grid gap-3">
            <h3 className="font-bold text-ink">Regular weekly hours</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weekday">
                <select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                  {apiWeekdays.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </Field>
              <Field label="From date">
                <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </Field>
              <label className="col-span-2 flex items-center gap-2 text-sm font-bold text-ink">
                <input type="checkbox" checked={ruleClosed} onChange={(e) => setRuleClosed(e.target.checked)} />
                Closed on this weekday
              </label>
              {!ruleClosed && (
                <>
                  <Field label="Opens at">
                    <input type="time" value={ruleStart} onChange={(e) => setRuleStart(e.target.value)} />
                  </Field>
                  <Field label="Closes at">
                    <input type="time" value={ruleEnd} onChange={(e) => setRuleEnd(e.target.value)} />
                  </Field>
                  <Field label="Slots per day">
                    <input type="number" min="1" max="100" value={slotCount} onChange={(e) => setSlotCount(Number(e.target.value))} />
                  </Field>
                </>
              )}
            </div>
            <Button variant="outline" className="w-full" type="submit" disabled={saving}>
              Save weekday schedule
            </Button>
          </form>

          {settings && canManageBookingPolicy && (
            <form onSubmit={onSaveSettings} className="grid gap-3">
              <h3 className="font-bold text-ink">Booking rules</h3>
              {settingsWarnings.map((warning) => (
                <p key={warning} className="rounded-md bg-amber-50 p-2 text-xs font-bold text-amber-900">{warning}</p>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hold minutes">
                  <select
                    value={settings.hold_duration_minutes}
                    onChange={(e) => onUpdateSettings({ hold_duration_minutes: Number(e.target.value) })}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={1440}>24 hours</option>
                  </select>
                </Field>
                <Field label="Notice minutes">
                  <input type="number" min="0" max="1440" value={settings.minimum_booking_notice_minutes}
                    onChange={(e) => onUpdateSettings({ minimum_booking_notice_minutes: Number(e.target.value) })} />
                </Field>
                <Field label="Horizon days">
                  <input type="number" min="1" max="180" value={settings.maximum_booking_horizon_days}
                    onChange={(e) => onUpdateSettings({ maximum_booking_horizon_days: Number(e.target.value) })} />
                </Field>
                <Field label="Cancel cutoff hours">
                  <input type="number" min="0" max="168" value={settings.cancellation_cutoff_hours}
                    onChange={(e) => onUpdateSettings({ cancellation_cutoff_hours: Number(e.target.value) })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink">
                <input type="checkbox" checked={settings.same_day_booking_allowed}
                  onChange={(e) => onUpdateSettings({ same_day_booking_allowed: e.target.checked })} />
                Same-day booking
              </label>
              <Field label="Arrival note">
                <input value={settings.arrival_buffer_instructions}
                  onChange={(e) => onUpdateSettings({ arrival_buffer_instructions: e.target.value })} />
              </Field>
              <Button variant="outline" className="w-full" type="submit" disabled={saving}>
                Save booking rules
              </Button>
            </form>
          )}

          <div>
            <h3 className="mb-2 font-bold text-ink">Recent calendar changes</h3>
            <div className="grid gap-2">
              {overrides.slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-md bg-bg-alt p-2 text-xs font-semibold">
                  <p className="font-bold text-ink">
                    {formatShortDate(String(row.exception_date).slice(0, 10))} - {String(row.override_type).replace(/_/g, ' ')}
                  </p>
                  <p className="text-text-light">
                    {formatTime(row.start_time)} {row.end_time ? `to ${formatTime(row.end_time)}` : ''}
                    {row.reason ? `, ${row.reason}` : ''}
                  </p>
                </div>
              ))}
              {overrides.length === 0 && (
                <p className="rounded-md bg-bg-alt p-2 text-sm font-semibold text-text-light">No calendar changes this month.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-bold text-ink">Weekly working hours</h3>
            <div className="grid gap-2">
              {rules.slice(0, 6).map((row) => (
                <div key={row.id} className="rounded-md bg-bg-alt p-2 text-xs font-semibold">
                  <p className="font-bold text-ink">{apiWeekdays[row.weekday]}</p>
                  <p className="text-text-light">{formatTime(row.start_time)} to {formatTime(row.end_time)}</p>
                </div>
              ))}
              {rules.length === 0 && (
                <p className="rounded-md bg-bg-alt p-2 text-sm font-semibold text-text-light">No weekly hours found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
