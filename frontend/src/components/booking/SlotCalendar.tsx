'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clinicToday } from '@/lib/timezone';

function monthStart(value: string) {
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function monthEnd(value: string) {
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m, 0);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonths(value: string, amount: number) {
  const d = monthStart(value);
  d.setMonth(d.getMonth() + amount);
  return dateKey(d);
}

function monthCells(value: string) {
  const start = monthStart(value);
  const end = monthEnd(value);
  const cursor = new Date(start);
  const cells: Array<{ date: string; inMonth: boolean }> = [];
  cursor.setDate(cursor.getDate() - cursor.getDay());
  while (cells.length < 42) {
    cells.push({ date: dateKey(cursor), inMonth: cursor.getMonth() === start.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

function availableCount(slots: any[] = []) {
  return slots.filter((s) => s.available).length;
}

export default function SlotCalendar({
  calendarMonth,
  onMonthChange,
  monthAvailability,
  selectedDate,
  onDateSelect,
}: {
  calendarMonth: string;
  onMonthChange: (month: string) => void;
  monthAvailability: Record<string, any[]>;
  selectedDate: string;
  onDateSelect: (date: string) => void;
}) {
  const today = clinicToday();
  const cells = useMemo(() => monthCells(calendarMonth), [calendarMonth]);
  const isSunday = (d: string) => new Date(`${d}T00:00:00`).getDay() === 0;

  return (
    <div className="soft-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onMonthChange(addMonths(calendarMonth, -1))}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <p className="font-bold text-navy">
          {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthStart(calendarMonth))}
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onMonthChange(addMonths(calendarMonth, 1))}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-text-light">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const count = availableCount(monthAvailability[cell.date] || []);
          const isPast = cell.date < today;
          const disabled = isPast || count === 0 || isSunday(cell.date);
          const selected = selectedDate === cell.date;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={disabled}
              onClick={() => onDateSelect(cell.date)}
              className={`min-h-[68px] rounded-2xl p-1 text-center transition-all duration-300 ${
                selected
                  ? 'bg-gradient-to-r from-accent to-primary text-white shadow-[0_10px_24px_rgba(43,138,198,0.16)]'
                  : disabled
                    ? 'border border-primary/10 bg-white text-text-light shadow-[0_6px_16px_rgba(23,58,94,0.04)]'
                    : 'border border-pink-200 bg-pink-50 text-pink-800 shadow-[0_6px_16px_rgba(236,72,153,0.07)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(236,72,153,0.12)]'
              } ${cell.inMonth ? '' : 'opacity-40'}`}
            >
              <span className="block text-sm font-black">
                {new Date(`${cell.date}T00:00:00`).getDate()}
              </span>
              <span className="mt-1 block text-[10px] font-bold leading-tight">
                {isSunday(cell.date) ? 'Holiday' : count > 0 ? `${count} slots` : 'No slots'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
