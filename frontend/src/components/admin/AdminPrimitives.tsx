'use client';

import React from 'react';
import { useEffect } from 'react';
import FocusTrap from '../ui/FocusTrap';
import Button from '@/components/ui/Button';

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
        <h1 className="truncate text-2xl font-bold text-ink">{title}</h1>
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

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const tones = {
    neutral: 'bg-bg-alt text-text-light',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-primary/15 text-accent',
  };

  return (
    <span
      className={`inline-flex min-h-[28px] items-center rounded-full px-3 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function CursorPagination({
  page,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  itemLabel,
  itemCount,
}: {
  page: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  itemLabel: string;
  itemCount?: number;
}) {
  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label={`${itemLabel} pages`}>
      <Button
        variant="outline"
        className="min-h-[44px]"
        disabled={!canPrevious}
        onClick={onPrevious}
      >
        Previous
      </Button>
      <p className="text-xs text-text-light" aria-live="polite">
        Page {page}
        {itemCount === undefined ? '' : ` · ${itemCount} ${itemLabel}`}
      </p>
      <Button
        variant="outline"
        className="min-h-[44px]"
        disabled={!canNext}
        onClick={onNext}
      >
        Next
      </Button>
    </nav>
  );
}

export function AdminFeedback({ message, error = false }: { message?: string; error?: boolean }) {
  if (!message) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      className={`rounded-md p-3 text-sm ${error ? 'bg-red-50 text-red-900' : 'bg-wash-sage text-ink'}`}
    >
      {message}
    </div>
  );
}

export function AdminDrawer({
  label,
  onClose,
  children,
  widthClass = 'max-w-2xl',
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <FocusTrap>
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Close ${label}`}
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={`absolute right-0 top-0 h-full w-full ${widthClass} overflow-y-auto bg-white p-5 shadow-xl`}
        >
          {children}
        </aside>
      </div>
    </FocusTrap>
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
      <Button
        variant="outline"
        className="min-h-11 px-3 py-2"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-text-light">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <Button
        variant="outline"
        className="min-h-11 px-3 py-2"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
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
