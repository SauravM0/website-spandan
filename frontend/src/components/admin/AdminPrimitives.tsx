'use client';

import React from 'react';

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-light">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  const tones = {
    neutral: 'bg-bg-alt text-text-light',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`inline-flex min-h-[28px] items-center rounded-full px-3 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <button
        type="button"
        className="btn btn-outline min-h-10 px-3 py-2"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-text-light">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <button
        type="button"
        className="btn btn-outline min-h-10 px-3 py-2"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function ResponsiveDataView({
  table,
  cards,
  empty,
}: {
  table: React.ReactNode;
  cards: React.ReactNode;
  empty?: React.ReactNode;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">{cards || empty}</div>
      <div className="hidden md:block">{table || empty}</div>
    </>
  );
}
