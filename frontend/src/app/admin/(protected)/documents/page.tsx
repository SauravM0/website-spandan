'use client';
import { useEffect, useState } from 'react';
import {
  ApiError,
  downloadMedicalDocument,
  getMedicalDocuments,
  reviewMedicalDocument,
  searchAdminPatients,
  uploadMedicalDocument,
} from '../../../../lib/api';
import { promptAdminAction } from '../../../../lib/adminDialogs';
import Button from '@/components/ui/Button';
const categories = {
  lab_report: 'Lab report',
  imaging: 'Imaging',
  prescription: 'Prescription',
  discharge_summary: 'Discharge summary',
  referral: 'Referral',
  insurance: 'Insurance',
  other: 'Other',
};
export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]),
    [patients, setPatients] = useState<any[]>([]),
    [patientId, setPatientId] = useState(''),
    [file, setFile] = useState<File>(),
    [category, setCategory] = useState('lab_report'),
    [source, setSource] = useState('staff'),
    [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [unavailable, setUnavailable] = useState(''),
    [busy, setBusy] = useState(false);
  const load = () => {
    setError('');
    return getMedicalDocuments(status ? { status } : {})
      .then((x) => {
        setUnavailable('');
        setDocs(x.data);
      })
      .catch((failure: unknown) => {
        if (
          failure instanceof ApiError &&
          failure.status === 503 &&
          ['DOCUMENT_GOVERNANCE_REQUIRED', 'DOCUMENT_SCANNER_REQUIRED'].includes(
            failure.code || ''
          )
        ) {
          setUnavailable(failure.message);
          return;
        }
        setError(failure instanceof Error ? failure.message : 'Unable to load documents.');
      });
  };
  useEffect(() => {
    load();
    searchAdminPatients()
      .then((x) => setPatients(x.data))
      .catch(() => undefined);
  }, [status]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !patientId) return;
    setBusy(true);
    setError('');
    try {
      await uploadMedicalDocument(
        {
          patient_id: patientId,
          category,
          filename: file.name,
          media_type: file.type,
          source,
          confidentiality: 'normal',
        },
        file
      );
      setFile(undefined);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function review(d: any, decision: 'review' | 'verify' | 'reject') {
    const notes = await promptAdminAction({
      title: decision === 'reject' ? 'Reject document?' : 'Record document review',
      description: 'These notes become permanent review evidence.',
      label: decision === 'reject' ? 'Reason for rejection' : 'What was checked',
      multiline: true,
      minLength: 5,
      confirmLabel: decision === 'reject' ? 'Reject document' : 'Record review',
      danger: decision === 'reject',
    });
    if (!notes || notes.trim().length < 5) return;
    setBusy(true);
    try {
      await reviewMedicalDocument(d.id, d.version, decision, notes.trim());
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (unavailable) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-ink">Medical documents</h1>
        <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">Document handling is unavailable</h2>
          <p className="mt-2 text-sm">{unavailable}</p>
          <Button className="mt-4 border border-amber-500" onClick={load}>
            Check again
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-ink">Medical documents</h1>
      <p className="mt-1 text-sm text-text-light">
        Uploads remain quarantined until scanning completes. Extracted or uploaded information is
        never automatically clinically verified.
      </p>
      {error && (
        <div role="alert" className="mt-4 rounded-md bg-red-50 p-4 text-red-900">
          {error}{' '}
          <button className="underline" onClick={load}>
            Try again
          </button>
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_2fr]">
        <form onSubmit={submit} className="h-fit rounded-md border border-border bg-white p-4">
          <h2 className="font-bold text-ink">Upload to quarantine</h2>
          <fieldset disabled={busy} className="mt-3 grid gap-3">
            <label className="text-sm font-semibold">
              Confirm patient
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-md border px-2"
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.full_name} · ID {p.id.slice(0, 8)} · phone …{p.phone_last4}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Document type
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-md border px-2"
              >
                {Object.entries(categories).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Source
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-md border px-2"
              >
                <option value="staff">Clinic staff</option>
                <option value="patient">Patient</option>
                <option value="guardian">Guardian</option>
                <option value="import">Imported</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              PDF, JPEG, or PNG (maximum 10 MB)
              <input
                required
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="mt-1 block min-h-[44px] w-full"
              />
            </label>
            <div className="rounded-md bg-amber-50 p-3 text-sm">
              Check the patient’s name and date of birth before uploading. A wrong-patient file must
              not be silently reassigned.
            </div>
            <button
              disabled={!file || !patientId}
              className="min-h-[44px] rounded-md bg-ink px-4 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Confirm and upload'}
            </button>
          </fieldset>
        </form>
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-ink">Review queue</h2>
            <label className="text-sm">
              Status{' '}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="min-h-[44px] rounded-md border px-2"
              >
                <option value="">All</option>
                <option value="scanning">Scanning</option>
                <option value="awaiting_review">Awaiting review</option>
                <option value="reviewed">Reviewed</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-3">
            {docs.map((d) => (
              <article key={d.id} className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-ink">{d.original_filename}</h3>
                    <p className="text-sm">
                      {d.patient_name} · {categories[d.category as keyof typeof categories]} ·{' '}
                      {(d.byte_size / 1024).toFixed(1)} KB
                    </p>
                    <p className="mt-1 text-xs">
                      Status: {d.status.replaceAll('_', ' ')} · Source: {d.source} · Version{' '}
                      {d.version}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-bg-alt px-3 py-1 text-xs font-bold">
                    {d.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['awaiting_review', 'reviewed', 'verified'].includes(d.status) && (
                    <button
                      onClick={() => downloadMedicalDocument(d.id, d.original_filename)}
                      className="min-h-[44px] rounded-md border px-3 font-semibold"
                    >
                      Download evidence
                    </button>
                  )}
                  {d.status === 'awaiting_review' && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => review(d, 'review')}
                        className="min-h-[44px] rounded-md border border-ink px-3 font-semibold text-ink"
                      >
                        Mark reviewed
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => review(d, 'verify')}
                        className="min-h-[44px] rounded-md bg-ink px-3 font-semibold text-white"
                      >
                        Verify for clinical reference
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => review(d, 'reject')}
                        className="min-h-[44px] rounded-md border border-red-700 px-3 font-semibold text-red-800"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {docs.length === 0 && (
              <p role="status" className="rounded-md border p-4">
                No documents in this view.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
