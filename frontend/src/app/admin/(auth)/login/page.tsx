'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, getAdminSession, login, verifyAdminMfa } from '@/lib/api';

type Challenge = Awaited<ReturnType<typeof login>>['mfa'];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
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

  const showApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      setRequestId(err.payload?.requestId || '');
      const codeValue = err.code;
      setError(
        err.status === 429
          ? 'Too many attempts. Wait before trying again.'
          : codeValue === 'MFA_CODE_INVALID'
            ? 'The authentication code is incorrect or was already used.'
            : err.status === 401
              ? 'The credentials or authentication challenge are invalid.'
              : fallback
      );
    } else setError(fallback);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setRequestId('');
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      setPassword('');
      setChallenge(result.mfa);
    } catch (err) {
      showApiError(err, 'The login service is unavailable. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    setError('');
    setRequestId('');
    setSubmitting(true);
    try {
      const result = await verifyAdminMfa(
        challenge.challenge_id,
        useRecovery ? { recovery_code: code } : { code }
      );
      setCode('');
      if (result.recovery_codes?.length) setRecoveryCodes(result.recovery_codes);
      else router.replace('/admin');
    } catch (err) {
      showApiError(err, 'Unable to verify multi-factor authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt p-4">
        <Loader2 className="animate-spin text-navy" aria-label="Checking administrator session" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-alt p-4">
      <div className="w-full max-w-[440px]">
        <h1 className="mb-8 text-center text-2xl font-bold text-navy">Admin Login</h1>
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

          {recoveryCodes.length > 0 ? (
            <section aria-labelledby="recovery-heading">
              <h2 id="recovery-heading" className="text-lg font-bold text-navy">
                Save recovery codes
              </h2>
              <p className="mt-2 text-sm text-text-light">
                Store these one-time codes in a secure password manager. They will not be shown
                again.
              </p>
              <ul
                className="my-4 grid grid-cols-2 gap-2 rounded border bg-bg-alt p-4 font-mono text-sm"
                aria-label="One-time recovery codes"
              >
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode}>{recoveryCode}</li>
                ))}
              </ul>
              <button
                className="btn w-full justify-center bg-accent text-white"
                onClick={() => router.replace('/admin')}
              >
                I saved these codes
              </button>
            </section>
          ) : challenge ? (
            <form onSubmit={handleMfa} noValidate>
              <h2 className="text-lg font-bold text-navy">
                {challenge.enrollment_required
                  ? 'Set up multi-factor authentication'
                  : 'Enter authentication code'}
              </h2>
              {challenge.enrollment_required && (
                <div className="mt-3 rounded border bg-bg-alt p-3 text-sm">
                  <p>Add this setup key to your authenticator application:</p>
                  <p
                    className="mt-2 break-all font-mono font-bold"
                    aria-label="Authenticator setup key"
                  >
                    {challenge.secret}
                  </p>
                  {challenge.otpauth_uri && (
                    <a
                      className="mt-2 inline-block text-accent underline"
                      href={challenge.otpauth_uri}
                    >
                      Open authenticator app
                    </a>
                  )}
                </div>
              )}
              <label htmlFor="admin-mfa-code" className="mt-4 block font-semibold">
                {useRecovery ? 'Recovery code' : 'Six-digit code'}
              </label>
              <input
                id="admin-mfa-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode={useRecovery ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                pattern={useRecovery ? undefined : '[0-9]{6}'}
                required
                disabled={submitting}
                className="mt-1 w-full"
              />
              {!challenge.enrollment_required && (
                <button
                  type="button"
                  className="mt-2 text-sm text-accent underline"
                  onClick={() => {
                    setUseRecovery((value) => !value);
                    setCode('');
                  }}
                >
                  {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
                </button>
              )}
              <button
                type="submit"
                className="btn mt-5 w-full justify-center bg-accent text-white"
                disabled={submitting}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Verify and continue
              </button>
              <button
                type="button"
                className="mt-3 w-full text-sm text-text-light underline"
                onClick={() => {
                  setChallenge(null);
                  setCode('');
                  setError('');
                }}
              >
                Start again
              </button>
            </form>
          ) : (
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
              <button
                type="submit"
                className="btn w-full justify-center bg-accent text-white"
                disabled={submitting}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Continue securely
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
