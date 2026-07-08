'use client';

import React from 'react';
import { Trash2, XCircle } from 'lucide-react';
import { formatDate, formatShortDate, formatTime, dayStatus, slotsForDay } from './CalendarUtils';

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

export default function DayInspector({
  selectedDate,
  daySlots,
  selectedAppointments,
  selectedOverrides,
  saving,
  selectedIsSunday,
  selectedHolidayOverride,
  onToggleHoliday,
  onRemoveOverride,
  children,
}: {
  selectedDate: string;
  daySlots: any[];
  selectedAppointments: any[];
  selectedOverrides: any[];
  saving: boolean;
  selectedIsSunday: boolean;
  selectedHolidayOverride: any;
  onToggleHoliday: (date: string) => void;
  onRemoveOverride: (id: string) => void;
  children: React.ReactNode;
}) {
  const selectedStatus = dayStatus(selectedDate, daySlots, selectedOverrides, selectedAppointments.length);
  const selectedCounts = slotsForDay(daySlots);

  const toneMap: Record<string, string> = {
    danger: 'bg-rose-100 text-rose-800',
    warm: 'bg-amber-100 text-amber-900',
    success: 'bg-emerald-100 text-emerald-800',
    info: 'bg-sky-100 text-sky-800',
    muted: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Selected Date</p>
          <h2 className="mt-1 text-xl font-black text-navy">{formatDate(selectedDate)}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneMap[selectedStatus.tone] || toneMap.muted}`}>
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
          onClick={() => onToggleHoliday(selectedDate)}
          disabled={saving || selectedIsSunday}
          className={`btn w-full ${
            selectedHolidayOverride || selectedIsSunday ? 'btn-outline' : 'bg-rose-600 text-white hover:bg-rose-700'
          }`}
        >
          {selectedHolidayOverride || selectedIsSunday ? (
            <><Trash2 size={17} /> Open This Day</>
          ) : (
            <><XCircle size={17} /> Close This Day</>
          )}
        </button>
        {selectedIsSunday && (
          <p className="text-xs font-semibold text-text-light">Sunday stays closed automatically.</p>
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
              <span>{formatTime(slot.start_time)} to {formatTime(slot.end_time)}</span>
              <span>{slot.available ? 'Open' : slot.reason || 'Blocked'}</span>
            </div>
          ))}
          {daySlots.length === 0 && (
            <p className="rounded-md bg-white p-3 text-sm font-semibold text-text-light">No slots for this date.</p>
          )}
        </div>
      </div>

      {selectedOverrides.length > 0 && (
        <div className="mb-4 rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-black text-navy">Saved Changes</p>
          <div className="grid gap-2">
            {selectedOverrides.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md bg-bg-alt p-2 text-xs font-bold"
              >
                <span>
                  {String(item.override_type).replace(/_/g, ' ')}
                  {item.start_time ? `, ${formatTime(item.start_time)} to ${formatTime(item.end_time)}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveOverride(item.id)}
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

      {children}
    </div>
  );
}
