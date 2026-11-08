'use client';
import { FormEvent, useEffect, useState } from 'react';
import {
  getPatientMedications,
  reconcilePatientMedication,
  reportPatientMedication,
} from '../../lib/api';
const blank = {
  display: '',
  original_text: '',
  dose_value: '',
  dose_unit: '',
  frequency_text: '',
  source: 'patient',
  ambiguity_notes: '',
};
export default function MedicationManager({
  patientId,
  patientName,
  encounters,
  writesEnabled,
}: {
  patientId: string;
  patientName: string;
  encounters: any[];
  writesEnabled: boolean;
}) {
  const [items, setItems] = useState<any[]>([]),
    [draft, setDraft] = useState(blank),
    [selected, setSelected] = useState<any>(),
    [action, setAction] = useState('confirm'),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const load = () => getPatientMedications(patientId).then((r) => setItems(r.medications));
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, [patientId]);
  const current = items.filter((x) => x.is_current),
    history = items.filter((x) => !x.is_current),
    encounter = encounters.find((e) => e.status === 'in_progress');
  async function report(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await reportPatientMedication(patientId, {
        display: draft.display,
        original_text: draft.original_text || draft.display,
        status: 'active',
        source: draft.source,
        ...(draft.dose_value && draft.dose_unit
          ? { dose_value: Number(draft.dose_value), dose_unit: draft.dose_unit }
          : {}),
        frequency_text: draft.frequency_text || undefined,
        ambiguity_notes: draft.ambiguity_notes || undefined,
      });
      setDraft(blank);
      await load();
      setMessage('Medication report saved as unverified.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reconcile() {
    if (!selected || !encounter) return;
    setBusy(true);
    try {
      await reconcilePatientMedication(patientId, selected.id, {
        display: selected.display,
        original_text: selected.original_text,
        status: selected.status,
        encounter_id: encounter.id,
        expected_version: selected.version,
        confirm_patient_id: patientId,
        action,
        reason,
        ...(selected.dose_value && selected.dose_unit
          ? { dose_value: Number(selected.dose_value), dose_unit: selected.dose_unit }
          : {}),
        frequency_text: selected.frequency_text || undefined,
        ambiguity_notes: selected.ambiguity_notes || undefined,
      });
      setSelected(undefined);
      setReason('');
      await load();
      setMessage('A new attributable medication version was recorded.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6" aria-labelledby="medications-heading">
      <h2 id="medications-heading" className="text-lg font-bold text-ink">
        Medication reconciliation
      </h2>
      <p className="text-sm text-text-light">
        History only. Nothing here creates a prescription or changes treatment.
      </p>
      {message && (
        <p role="status" className="my-3 rounded-md bg-wash-pink p-3">
          {message}
        </p>
      )}
      <div className="mt-3 grid gap-3">
        {current.map((m) => (
          <article key={m.id} className="rounded-md border bg-white p-4">
            <h3 className="font-bold text-ink">{m.display}</h3>
            <p className="text-sm">
              {m.dose_value ? `${m.dose_value} ${m.dose_unit}` : 'Dose unknown'} ·{' '}
              {m.frequency_text || 'Timing unknown'}
            </p>
            <p className="text-xs">
              {m.status} · {m.verification_status} · version {m.version} ·{' '}
              {new Date(m.authored_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </p>
            {m.ambiguity_notes && (
              <p className="mt-2 bg-amber-50 p-2 text-sm">
                <strong>Unresolved:</strong> {m.ambiguity_notes}
              </p>
            )}
            <button
              type="button"
              disabled={!writesEnabled || !encounter || busy}
              onClick={() => setSelected(m)}
              className="mt-2 min-h-11 rounded border border-ink px-3 font-semibold text-ink disabled:opacity-50"
            >
              Reconcile
            </button>
          </article>
        ))}
        {!current.length && <p className="rounded border p-4">No structured medication reports.</p>}
      </div>
      {selected && (
        <div
          role="region"
          aria-labelledby="reconcile-title"
          className="my-4 rounded border-2 border-ink bg-white p-4"
        >
          <h3 id="reconcile-title" className="font-bold">
            Reconcile {selected.display} for {patientName}
          </h3>
          <p className="text-sm">
            Original report: “{selected.original_text}”. Confirm the patient and encounter before
            recording a new version.
          </p>
          <label className="mt-3 grid gap-1 font-semibold">
            Action
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="min-h-11 rounded border px-2"
            >
              <option value="confirm">Confirm as reported</option>
              <option value="correct">Correct details</option>
              <option value="duplicate">Mark duplicate</option>
              <option value="stopped">Record as stopped</option>
              <option value="unable_to_verify">Unable to verify</option>
            </select>
          </label>
          <label className="mt-3 grid gap-1 font-semibold">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded border p-2"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              disabled={reason.trim().length < 5 || busy}
              onClick={reconcile}
              className="min-h-11 rounded bg-ink px-4 text-white disabled:opacity-50"
            >
              Record new version
            </button>
            <button onClick={() => setSelected(undefined)} className="min-h-11 rounded border px-4">
              Cancel
            </button>
          </div>
        </div>
      )}
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">
          Version history ({history.length})
        </summary>
        {history.map((m) => (
          <p key={m.id} className="mt-2 border-l-2 pl-3 text-sm">
            Version {m.version}: {m.display} — {m.reconciliation_action || 'reported'} by{' '}
            {m.author_name}
          </p>
        ))}
      </details>
      <form onSubmit={report} className="mt-5 rounded border bg-white p-4">
        <h3 className="font-bold">Record a medication report</h3>
        <p className="text-sm">
          Copy the patient’s wording. Leave unknown details blank and explain ambiguity; never guess
          units.
        </p>
        <fieldset disabled={!writesEnabled || busy} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 font-semibold sm:col-span-2">
            Medicine name
            <input
              required
              maxLength={500}
              value={draft.display}
              onChange={(e) => setDraft({ ...draft, display: e.target.value })}
              className="min-h-11 rounded border px-3"
            />
          </label>
          <label className="grid gap-1 font-semibold sm:col-span-2">
            Original words
            <textarea
              required
              value={draft.original_text}
              onChange={(e) => setDraft({ ...draft, original_text: e.target.value })}
              className="rounded border p-3"
            />
          </label>
          <label className="grid gap-1 font-semibold">
            Dose value
            <input
              type="number"
              min="0"
              step="any"
              value={draft.dose_value}
              onChange={(e) => setDraft({ ...draft, dose_value: e.target.value })}
              className="min-h-11 rounded border px-3"
            />
          </label>
          <label className="grid gap-1 font-semibold">
            Dose unit
            <input
              value={draft.dose_unit}
              onChange={(e) => setDraft({ ...draft, dose_unit: e.target.value })}
              className="min-h-11 rounded border px-3"
            />
          </label>
          <label className="grid gap-1 font-semibold">
            Timing
            <input
              value={draft.frequency_text}
              onChange={(e) => setDraft({ ...draft, frequency_text: e.target.value })}
              className="min-h-11 rounded border px-3"
            />
          </label>
          <label className="grid gap-1 font-semibold">
            Source
            <select
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              className="min-h-11 rounded border px-3"
            >
              <option value="patient">Patient</option>
              <option value="guardian">Guardian</option>
              <option value="document">Document (unverified)</option>
            </select>
          </label>
          <label className="grid gap-1 font-semibold sm:col-span-2">
            Unknown or ambiguous details
            <textarea
              value={draft.ambiguity_notes}
              onChange={(e) => setDraft({ ...draft, ambiguity_notes: e.target.value })}
              className="rounded border p-3"
            />
          </label>
          <button className="min-h-11 rounded bg-ink px-4 font-semibold text-white sm:col-span-2">
            Save unverified report
          </button>
        </fieldset>
      </form>
    </section>
  );
}
