'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, getAdminSession, login } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then(() => {
        if (active) router.replace('/admin');
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRequestId('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        setRequestId(err.payload?.requestId || '');
        setError(
          err.status === 429
            ? 'Too many login attempts. Please wait a few minutes and try again.'
            : 'Email or password is incorrect.'
        );
      } else {
        setError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt p-4">
        <div className="w-full max-w-[400px] rounded-lg bg-white p-8 shadow">
          <div className="mx-auto mb-6 h-7 w-40 rounded bg-bg-alt" />
          <div className="space-y-4">
            <div className="h-12 rounded bg-bg-alt" />
            <div className="h-12 rounded bg-bg-alt" />
            <div className="h-12 rounded bg-bg-alt" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-alt p-4">
      <div className="w-full max-w-[400px]">
        <h1 className="mb-8 text-center text-2xl font-bold text-navy">Admin Login</h1>
        <form onSubmit={handleLogin} className="rounded-lg bg-white p-6 shadow sm:p-8" noValidate>
          {error && (
            <div
              className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              role="alert"
              tabIndex={-1}
            >
              <p className="font-semibold">{error}</p>
              {requestId && <p className="mt-1 text-xs">Support reference: {requestId}</p>}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              inputMode="email"
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
                className="pr-12"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-md text-text-light hover:bg-bg-alt hover:text-navy"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn w-full justify-center bg-accent text-white hover:bg-accent-light"
            disabled={submitting}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-text-light">
          For account access, contact the clinic administrator.
        </p>
      </div>
    </div>
  );
}
