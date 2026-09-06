'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, getAdminSession, login } from '@/lib/api';
import Button from '@/components/ui/Button';

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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setRequestId('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/admin');
    } catch (failure) {
      if (failure instanceof ApiError) {
        setRequestId(failure.payload?.requestId || '');
        setError(
          failure.status === 429
            ? 'Too many attempts. Wait before trying again.'
            : failure.status === 401
              ? 'Invalid email or password.'
              : 'The login service is unavailable. Try again later.'
        );
      } else {
        setError('The login service is unavailable. Try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt p-4">
        <Loader2 className="animate-spin text-ink" aria-label="Checking administrator session" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-alt p-4">
      <div className="w-full max-w-[440px]">
        <h1 className="mb-8 text-center text-2xl font-bold text-ink">Admin Login</h1>
        <div className="rounded-lg bg-white p-6 shadow sm:p-8">
          {error && (
            <div
              className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              role="alert"
            >
              <p className="font-semibold">{error}</p>
              {requestId && <p className="mt-1 text-xs">Support reference: {requestId}</p>}
            </div>
          )}
          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
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
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full justify-center bg-accent text-white"
              disabled={submitting}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Log in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
