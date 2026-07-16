'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { ApiError, stepUpAdmin } from '@/lib/api';
import FocusTrap from '@/components/ui/FocusTrap';

export default function StepUpDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setCode('');
    window.dispatchEvent(new Event('admin-step-up-cancelled'));
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const show = () => {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
      setError('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener('admin-step-up-required', show);
    return () => window.removeEventListener('admin-step-up-required', show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [close, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await stepUpAdmin(useRecovery ? { recovery_code: code } : { code });
      setOpen(false);
      setCode('');
      window.dispatchEvent(new Event('admin-step-up-complete'));
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 401
          ? 'The authentication code is incorrect or was already used.'
          : 'Unable to verify authentication. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <FocusTrap active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="step-up-title"
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="step-up-title" className="text-xl font-bold text-navy">
                Confirm this sensitive action
              </h2>
              <p className="mt-1 text-sm text-text-light">
                Enter a fresh authenticator code. Confirmation remains valid for ten minutes.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Cancel authentication"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded"
            >
              <X />
            </button>
          </div>
          <form onSubmit={submit} className="mt-5">
            {error && (
              <p role="alert" className="mb-3 text-sm text-danger">
                {error}
              </p>
            )}
            <label htmlFor="step-up-code" className="font-semibold">
              {useRecovery ? 'Recovery code' : 'Six-digit code'}
            </label>
            <input
              ref={inputRef}
              id="step-up-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode={useRecovery ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              required
              disabled={busy}
              className="mt-1 w-full"
            />
            <button
              type="button"
              onClick={() => {
                setUseRecovery((value) => !value);
                setCode('');
              }}
              className="mt-2 text-sm text-accent underline"
            >
              {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
            </button>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={close} className="btn border" disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-accent text-white"
                disabled={busy || !code.trim()}
              >
                {busy && <Loader2 size={16} className="animate-spin" />} Verify
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
}
