import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-blue-50 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="soft-card p-4">
      <Skeleton className="mb-3 h-4 w-3/4" />
      <Skeleton className="mb-2 h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="soft-card flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-4 text-text-light">{icon}</div>}
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-text-light">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-danger/5 px-6 py-12 text-center shadow-[0_10px_30px_rgba(220,38,38,0.08)]">
      <h3 className="text-lg font-semibold text-danger">Something went wrong</h3>
      <p className="mt-1 text-sm text-danger/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-outline mt-4 min-h-10 px-4 text-sm font-semibold"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(23,58,94,0.10)] supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] sm:px-6">
      <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-3">
        {children}
      </div>
    </div>
  );
}

export function DetailDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-navy/30"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative flex h-full w-full max-w-[560px] flex-col bg-white shadow-xl">
        <div className="flex min-h-[60px] items-center justify-between px-4 shadow-[0_8px_24px_rgba(23,58,94,0.05)] sm:px-6">
          <h2 className="truncate text-lg font-bold text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-text-light transition-all duration-300 hover:bg-bg-alt hover:text-navy"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
