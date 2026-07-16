'use client';

import { useEffect, useId, useState } from 'react';
import FocusTrap from '../ui/FocusTrap';
import { ADMIN_DIALOG_REQUEST, type DialogRequest } from '@/lib/adminDialogs';

export default function AdminActionDialog() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState('');
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<DialogRequest>).detail;
      setRequest((current) => {
        if (current?.kind === 'confirm') current.resolve(false);
        else if (current) current.resolve(null);
        return next;
      });
      setValue(next.kind === 'prompt' ? next.defaultValue || '' : '');
    };
    window.addEventListener(ADMIN_DIALOG_REQUEST, receive);
    return () => window.removeEventListener(ADMIN_DIALOG_REQUEST, receive);
  }, []);

  useEffect(() => {
    if (!request) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [request]);

  const finish = (accepted: boolean) => {
    if (!request) return;
    if (request.kind === 'confirm') request.resolve(accepted);
    else request.resolve(accepted ? value.trim() : null);
    setRequest(null);
  };

  if (!request) return null;
  const valid = request.kind !== 'prompt' || value.trim().length >= (request.minLength || 0);
  return (
    <FocusTrap>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-0"
          aria-label="Cancel action"
          onClick={() => finish(false)}
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="relative w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
        >
          <h2 id={titleId} className="text-lg font-bold text-navy">
            {request.title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-text-light">
            {request.description}
          </p>
          {request.kind === 'prompt' && (
            <label className="mt-4 grid gap-1 text-sm font-semibold">
              {request.label}
              {request.multiline ? (
                <textarea
                  autoFocus
                  rows={4}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="rounded-md border border-border p-3"
                />
              ) : (
                <input
                  autoFocus
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="min-h-[44px] rounded-md border border-border px-3"
                />
              )}
            </label>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline min-h-[44px]"
              onClick={() => finish(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn min-h-[44px] ${request.danger ? 'bg-red-700 text-white' : 'btn-primary'}`}
              disabled={!valid}
              onClick={() => finish(true)}
            >
              {request.confirmLabel || 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </FocusTrap>
  );
}
