'use client';
import { useEffect, useState } from 'react';
import { ApiError, getPrivacyRightsRequests, updatePrivacyRightsRequest } from '@/lib/api';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { confirmAdminAction, promptAdminAction } from '@/lib/adminDialogs';
import Button from '@/components/ui/Button';

export default function PrivacySecurityPage() {
  const { hasCapability } = useAdminSession();
  const canManage = hasCapability('admin.privacy_requests.manage');
  const [items, setItems] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [status, setStatus] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems((await getPrivacyRightsRequests(status || undefined)).data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to load privacy requests.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [status]);
  async function transition(item: any, next: string) {
    const notes =
      next === 'identity_verified'
        ? 'Identity checked using the clinic-approved offline verification procedure.'
        : await promptAdminAction({
            title: 'Record privacy review evidence',
            description: 'These notes become permanent audit evidence.',
            label: 'Decision or review notes',
            multiline: true,
            minLength: 3,
            confirmLabel: 'Continue',
          });
    if (next !== 'identity_verified' && !notes) return;
    if (
      !(await confirmAdminAction({
        title: 'Update privacy request?',
        description: `Move ${item.reference_number} to ${next.replaceAll('_', ' ')}. No patient data will be changed automatically.`,
        confirmLabel: 'Update request',
        danger: next === 'rejected',
      }))
    )
      return;
    try {
      await updatePrivacyRightsRequest(item.id, {
        expected_version: item.version,
        status: next,
        confirm_identity_verified: next === 'identity_verified',
        decision_notes: notes || undefined,
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed. Refresh and try again.');
    }
  }
  return (
    <section className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">Privacy request queue</h1>
        <p className="mt-2 text-sm text-text-light">
          Verify identity outside this system before processing. This queue never changes or deletes
          patient records automatically.
        </p>
        <label className="mt-5 block max-w-xs text-sm font-semibold" htmlFor="privacy-status">
          Filter by status
        </label>
        <select
          id="privacy-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1"
        >
          <option value="">All statuses</option>
          <option value="pending_identity_verification">Pending identity verification</option>
          <option value="identity_verified">Identity verified</option>
          <option value="in_review">In review</option>
          <option value="restricted">Restricted</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        {error && (
          <div
            role="alert"
            className="mt-4 rounded border border-danger/30 bg-danger/10 p-3 text-danger"
          >
            {error}
          </div>
        )}
        {loading ? (
          <p className="mt-6" role="status">
            Loading requests…
          </p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-text-light">No requests match this filter.</p>
        ) : (
          <div className="mt-6 grid gap-4">
            {items.map((item) => (
              <article key={item.id} className="soft-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-ink">{item.reference_number}</h2>
                    <p className="text-sm">
                      {item.request_type.replaceAll('_', ' ')} · {item.requester_name} ·{' '}
                      {item.relationship.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 text-xs text-text-light">
                      Received{' '}
                      {new Date(item.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}{' '}
                      · version {item.version}
                    </p>
                  </div>
                  <span className="rounded-full bg-bg-alt px-3 py-1 text-xs font-semibold">
                    {item.status.replaceAll('_', ' ')}
                  </span>
                </div>
                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.status === 'pending_identity_verification' && (
                      <Button
                        className="border border-border"
                        onClick={() => transition(item, 'identity_verified')}
                      >
                        Record identity verified
                      </Button>
                    )}
                    {item.status === 'identity_verified' && (
                      <Button
                        className="border border-border"
                        onClick={() => transition(item, 'in_review')}
                      >
                        Start review
                      </Button>
                    )}
                    {item.status === 'in_review' && (
                      <>
                        <Button
                          className="border border-border"
                          onClick={() => transition(item, 'restricted')}
                        >
                          Record restriction
                        </Button>
                        <Button
                          className="bg-accent text-white"
                          onClick={() => transition(item, 'completed')}
                        >
                          Complete review
                        </Button>
                        <Button
                          className="border border-danger text-danger"
                          onClick={() => transition(item, 'rejected')}
                        >
                          Reject with reason
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
