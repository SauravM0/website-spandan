'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getPatientIdentityReviews, resolvePatientIdentityReview } from '../../../../../lib/api';
import Button from '@/components/ui/Button';

const factorLabels: Record<string, string> = {
  name: 'Name',
  date_of_birth: 'Date of birth',
  phone: 'Phone',
  authorized_identifier: 'Authorized identifier',
};

export default function IdentityReviewQueuePage() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [outcome, setOutcome] = useState<
    'same_person' | 'different_person' | 'insufficient_evidence'
  >('insufficient_evidence');
  const [canonicalId, setCanonicalId] = useState('');
  const [factors, setFactors] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPatientIdentityReviews(status);
      setRows(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load identity reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const choose = (review: any) => {
    setSelected(review);
    setOutcome('insufficient_evidence');
    setCanonicalId(review.possible.id);
    setFactors([]);
    setReason('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || reason.trim().length < 3) return;
    setBusy(true);
    setError('');
    try {
      await resolvePatientIdentityReview(selected.id, {
        outcome,
        canonical_patient_id: outcome === 'same_person' ? canonicalId : undefined,
        confirmed_factors: factors,
        reason: reason.trim(),
        expected_version: Number(selected.version),
      });
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve identity review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Duplicate patient review</h1>
        <p className="mt-1 text-sm text-text-light">
          Records are linked only after human verification. Source records are never deleted or
          moved.
        </p>
      </div>
      <label className="mb-5 block max-w-xs text-sm font-semibold">
        Queue status
        <select
          className="mt-1 min-h-[44px] w-full rounded-md border border-border px-3"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="same_person">Same person</option>
          <option value="different_person">Different person</option>
          <option value="insufficient_evidence">Insufficient evidence</option>
        </select>
      </label>
      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}
      {loading ? (
        <p role="status">Loading identity reviews...</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            {rows.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => choose(review)}
                className="rounded-md border border-border bg-white p-4 text-left shadow-sm focus:ring-2 focus:ring-accent"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <PatientCandidate label="New record" patient={review.candidate} />
                  <PatientCandidate label="Possible match" patient={review.possible} />
                </div>
                <p className="mt-3 text-xs text-text-light">
                  Detected:{' '}
                  {review.detected_factors
                    .map((factor: string) => factorLabels[factor])
                    .join(', ') || 'No current match'}
                </p>
              </button>
            ))}
            {!rows.length && (
              <p className="rounded-md border border-border bg-white p-5">
                No reviews in this queue.
              </p>
            )}
          </div>
          <form onSubmit={submit} className="rounded-md border border-border bg-white p-5">
            <h2 className="font-bold text-ink">Review decision</h2>
            {!selected ? (
              <p className="mt-3 text-sm text-text-light">Select a candidate pair to review.</p>
            ) : (
              <fieldset disabled={busy} className="mt-4 grid gap-4">
                <label className="text-sm font-semibold">
                  Outcome
                  <select
                    className="mt-1 w-full rounded-md border border-border p-2"
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value as typeof outcome)}
                  >
                    <option value="insufficient_evidence">Insufficient evidence</option>
                    <option value="different_person">Different person</option>
                    <option value="same_person">Same person</option>
                  </select>
                </label>
                {outcome === 'same_person' && (
                  <>
                    <label className="text-sm font-semibold">
                      Canonical record
                      <select
                        className="mt-1 w-full rounded-md border border-border p-2"
                        value={canonicalId}
                        onChange={(event) => setCanonicalId(event.target.value)}
                      >
                        <option value={selected.candidate.id}>
                          {selected.candidate.full_name} - {selected.candidate.id.slice(0, 8)}
                        </option>
                        <option value={selected.possible.id}>
                          {selected.possible.full_name} - {selected.possible.id.slice(0, 8)}
                        </option>
                      </select>
                    </label>
                    <fieldset>
                      <legend className="text-sm font-semibold">
                        Confirmed matching factors (minimum two)
                      </legend>
                      <div className="mt-2 grid gap-2">
                        {selected.detected_factors.map((factor: string) => (
                          <label
                            key={factor}
                            className="flex min-h-[44px] items-center gap-2 rounded-md border border-border px-3"
                          >
                            <input
                              type="checkbox"
                              checked={factors.includes(factor)}
                              onChange={(event) =>
                                setFactors((current) =>
                                  event.target.checked
                                    ? [...current, factor]
                                    : current.filter((item) => item !== factor)
                                )
                              }
                            />
                            {factorLabels[factor]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}
                <label className="text-sm font-semibold">
                  Decision reason
                  <textarea
                    className="mt-1 w-full rounded-md border border-border p-3"
                    rows={4}
                    maxLength={500}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                  />
                </label>
                <Button
                  variant="primary"
                  disabled={busy || (outcome === 'same_person' && factors.length < 2)}
                >
                  {busy ? 'Saving...' : 'Record decision'}
                </Button>
              </fieldset>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function PatientCandidate({ label, patient }: { label: string; patient: any }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-text-light">{label}</p>
      <p className="font-bold text-ink">{patient.full_name}</p>
      <p className="text-sm">DOB: {patient.date_of_birth || 'Not recorded'}</p>
      <p className="text-sm">Phone: {patient.phone_masked || 'Not recorded'}</p>
      <p className="text-xs text-text-light">
        {patient.appointment_count} appointment(s), {patient.order_count} order(s)
      </p>
    </div>
  );
}
