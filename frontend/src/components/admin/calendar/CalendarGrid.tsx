'use client';

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { weekdays, monthStart, dayStatus, slotsForDay, statusClasses, addMonths, todayKey } from './CalendarUtils';
import Button from '@/components/ui/Button';

type SlotSummary = { available: boolean; start_time?: string; end_time?: string };

export default function CalendarGrid({
  month,
  cells,
  availability,
  appointmentsByDate,
  overridesByDate,
  selectedDates,
  saving,
  onSelectDate,
  onMonthChange,
}: {
  month: string;
  cells: { date: string; inMonth: boolean }[];
  availability: Record<string, SlotSummary[]>;
  appointmentsByDate: Record<string, any[]>;
  overridesByDate: Record<string, any[]>;
  selectedDate: string;
  selectedDates: string[];
  saving: boolean;
  onSelectDate: (date: string) => void;
  onMonthChange: (month: string) => void;
}) {
  const prevMonth = () => onMonthChange(addMonths(month, -1));
  const nextMonth = () => onMonthChange(addMonths(month, 1));
  const goToday = () => onMonthChange(todayKey());

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-ink">
            <CalendarDays size={22} />{' '}
            {new Intl.DateTimeFormat('en-IN', {
              month: 'long',
              year: 'numeric',
            }).format(monthStart(month))}
          </h2>
          <p className="text-sm text-text-light">
            Availability follows the selected doctor&apos;s saved weekly schedule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft size={16} /> Previous
          </Button>
          <Button variant="accent" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            Next <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 rounded-lg border border-border bg-bg-alt p-3 text-xs font-bold text-text-light sm:grid-cols-4">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Has bookings</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Partial</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Closed</span>
      </div>

      <div className="hidden overflow-x-auto pb-2 md:block">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-text-light">
            {weekdays.map((day) => <div key={day} className="py-2">{day.slice(0, 3)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((cell) => {
              const dayAppointments = appointmentsByDate[cell.date] || [];
              const dayOverrides = overridesByDate[cell.date] || [];
              const status = dayStatus(cell.date, availability[cell.date] || [], dayOverrides, dayAppointments.length);
              const counts = slotsForDay(availability[cell.date] || []);
              const selected = selectedDates.includes(cell.date);

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => onSelectDate(cell.date)}
                  disabled={saving}
                  className={`min-h-[104px] rounded-lg border p-2 text-left transition duration-150 ${statusClasses(status.tone, selected, cell.inMonth)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-lg font-black">
                      {new Date(`${cell.date}T00:00:00`).getDate()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-tight">{status.label}</p>
                  <div className="mt-2 min-h-[24px] text-[11px] font-semibold leading-tight">
                    {counts.total > 0 && <p>{counts.available} open slots</p>}
                    {dayAppointments.length > 0 && <p>{dayAppointments.length} appointment(s)</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
