'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, changeAdminPassword, getAdminSessions, revokeAdminSession } from '@/lib/api';
import { confirmAdminAction } from '@/lib/adminDialogs';

type Session = {
  id: string;
  current?: boolean;
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  mfa_verified_at?: string | null;
  step_up_verified_at?: string | null;
};

const date = (value: string) =>
  new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminSessions();
      setSessions(result.sessions as unknown as Session[]);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Unable to load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (session: Session) => {
    if (
      !(await confirmAdminAction({
        title: 'Revoke administrator session?',
        description: `This will revoke ${session.current ? 'your current session and sign you out' : 'the selected session'}.`,
        confirmLabel: 'Revoke session',
        danger: true,
      }))
    )
      return;
    try {
      const result = await revokeAdminSession(session.id, 'Administrator revoked this session');
      if (result.current_session_revoked) window.location.replace('/admin/login');
      else await load();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Unable to revoke the session.');
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setChangingPassword(true);
    setError('');
    try {
      await changeAdminPassword(currentPassword, newPassword);
      window.location.replace('/admin/login?passwordChanged=1');
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Unable to change the password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <section className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-navy">Administrator sessions</h1>
        <p className="mt-2 text-sm text-text-light">
          Review active and recently revoked sessions. Revocation requires fresh multi-factor
          authentication.
        </p>
        <form onSubmit={changePassword} className="soft-card mt-6 max-w-xl p-4">
          <h2 className="font-bold text-navy">Change administrator password</h2>
          <p className="mt-1 text-sm text-text-light">
            Fresh MFA is required. A successful change signs out every administrator session.
          </p>
          <label htmlFor="current-password" className="mt-4 block font-semibold">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            disabled={changingPassword}
            className="mt-1 w-full"
          />
          <label htmlFor="new-password" className="mt-4 block font-semibold">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            disabled={changingPassword}
            className="mt-1 w-full"
          />
          <button
            type="submit"
            disabled={changingPassword}
            className="btn mt-4 bg-accent text-white"
          >
            {changingPassword ? 'Changing password...' : 'Change password'}
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded border border-danger/30 bg-danger/10 p-3 text-danger"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="mt-6">
            Loading sessions…
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {sessions.map((session) => (
              <article key={session.id} className="soft-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-navy">
                      {session.current
                        ? 'Current session'
                        : session.revoked_at
                          ? 'Revoked session'
                          : 'Active session'}
                    </h2>
                    <p className="mt-1 text-sm">Started {date(session.created_at)}</p>
                    <p className="text-sm">Last activity {date(session.last_seen_at)}</p>
                    {!session.revoked_at && (
                      <p className="text-sm">Idle expiry {date(session.idle_expires_at)}</p>
                    )}
                    <p className="mt-1 font-mono text-xs text-text-light">
                      Reference {session.id.slice(0, 8)}
                    </p>
                  </div>
                  {!session.revoked_at && (
                    <button
                      type="button"
                      className="btn border border-danger text-danger"
                      onClick={() => revoke(session)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
