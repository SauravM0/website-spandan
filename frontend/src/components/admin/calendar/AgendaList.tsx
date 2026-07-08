'use client';

import React from 'react';
import { formatShortDate, dayStatus, slotsForDay, statusClasses } from './CalendarUtils';

export default function AgendaList({
  days,
  selectedDate,
  saving,
  onSelect,
}: {
  days: { date: string; slots: any[]; appointments: any[]; overrides: any[] }[];
  selectedDate: string;
  saving: boolean;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="grid gap-2 md:hidden">
      {days.map((day) => {
        const status = dayStatus(day.date, day.slots, day.overrides, day.appointments.length);
        const counts = slotsForDay(day.slots);
        const selected = day.date === selectedDate;

        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            disabled={saving}
            className={`rounded-lg border p-3 text-left ${statusClasses(status.tone, selected, true)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-navy">{formatShortDate(day.date)}</p>
                <p className="mt-1 text-xs font-bold">{status.label}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <span className="rounded-md bg-white/70 px-2 py-1">{counts.available} open</span>
              <span className="rounded-md bg-white/70 px-2 py-1">{day.appointments.length} booked</span>
              <span className="rounded-md bg-white/70 px-2 py-1">{day.overrides.length} changes</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
