'use client';
import { FormEvent, useEffect, useState } from 'react';
import {
  commitDeviceImport,
  getDeviceImports,
  previewDeviceImport,
  type DeviceImportInput,
} from '../../lib/api';
import { confirmAdminAction } from '../../lib/adminDialogs';
const initial: DeviceImportInput = {
  filename: '',
  content: '',
  unit: 'mg/dL',
  timezone: 'Asia/Kolkata',
  context: 'random',
};
export default function DeviceImportManager({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [draft, setDraft] = useState<DeviceImportInput>(initial),
    [preview, setPreview] = useState<any>(),
    [imports, setImports] = useState<any[]>([]),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const load = () =>
    getDeviceImports(patientId).then((x) => {
      setImports(x.data);
      setEnabled(x.writesEnabled);
    });
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, [patientId]);
  async function pick(file?: File) {
    setPreview(undefined);
    setMessage('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage(
        'Only an approved CSV export can be previewed. Upload PDF reports through Medical documents.'
      );
      return;
    }
    if (file.size > 750000) {
      setMessage('This file is too large. Split it into files with no more than 5,000 readings.');
      return;
    }
    setDraft({ ...draft, filename: file.name, content: await file.text() });
  }
  async function show(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      setPreview(await previewDeviceImport(patientId, draft));
      setMessage(
        'Preview ready. Check the patient, units, timestamps, errors, and totals before confirming.'
      );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (
      !preview ||
      !(await confirmAdminAction({
        title: 'Import device readings?',
        description: `Import ${preview.import.summary.accepted} accepted glucose readings into ${patientName}'s record. Rejected and duplicate rows will not become observations.`,
        confirmLabel: 'Import readings',
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await commitDeviceImport(patientId, preview.import.id, draft);
      setMessage(
        `Import complete: ${result.summary.accepted} accepted, ${result.summary.rejected} rejected, ${result.summary.duplicates} duplicates.`
      );
      setPreview(undefined);
      setDraft(initial);
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-6 rounded border bg-slate-50 p-4" aria-labelledby="device-import-title">
      <h2 id="device-import-title" className="text-lg font-bold text-navy">
        Glucose device import
      </h2>
      <p className="text-sm text-text-light">
        For approved CSV exports only. Required columns: <code>timestamp</code> with UTC offset and{' '}
        <code>value</code>. Optional: <code>source_id</code>, <code>unit</code>,{' '}
        <code>context</code>, <code>quality</code>. Imports never change medication or diagnoses.
      </p>
      {message && (
        <p
          role={message.includes('too large') || message.startsWith('Only') ? 'alert' : 'status'}
          className="my-3 rounded bg-white p-3"
        >
          {message}
        </p>
      )}
      <form onSubmit={show} className="mt-3 grid gap-3 sm:grid-cols-2">
        <fieldset disabled={!enabled || busy} className="contents">
          <label className="grid gap-1 font-semibold sm:col-span-2">
            CSV export
            <input
              required
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => pick(e.target.files?.[0])}
              className="min-h-11 rounded border bg-white p-2"
            />
          </label>
          <label className="grid gap-1 font-semibold">
            Default unit
            <select
              value={draft.unit}
              onChange={(e) =>
                setDraft({ ...draft, unit: e.target.value as DeviceImportInput['unit'] })
              }
              className="min-h-11 rounded border px-2"
            >
              <option>mg/dL</option>
              <option>mmol/L</option>
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            Default reading context
            <select
              value={draft.context}
              onChange={(e) =>
                setDraft({ ...draft, context: e.target.value as DeviceImportInput['context'] })
              }
              className="min-h-11 rounded border px-2"
            >
              <option value="fasting">Fasting</option>
              <option value="post_meal">After meal</option>
              <option value="random">Random</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            Timezone
            <input
              readOnly
              value="Asia/Kolkata"
              className="min-h-11 rounded border bg-slate-100 px-3"
            />
            <span className="text-xs font-normal">
              Each CSV timestamp must still include its own UTC offset.
            </span>
          </label>
          <button
            disabled={!draft.content}
            className="min-h-11 self-start rounded bg-navy px-4 font-semibold text-white disabled:opacity-50"
          >
            Preview import
          </button>
        </fieldset>
      </form>
      {!enabled && (
        <p className="mt-3 rounded bg-amber-50 p-3">
          Device imports are disabled until clinical and device-governance approvals are recorded.
        </p>
      )}
      {preview && (
        <section
          className="mt-4 rounded border-2 border-navy bg-white p-4"
          aria-labelledby="preview-title"
        >
          <h3 id="preview-title" className="font-bold">
            Confirm preview for {patientName}
          </h3>
          <p className="mt-1">
            <strong>{preview.import.summary.accepted} accepted</strong> ·{' '}
            {preview.import.summary.rejected} rejected · {preview.import.summary.duplicates}{' '}
            duplicates · {preview.import.summary.total} total
          </p>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Device import row preview</caption>
              <thead>
                <tr>
                  {['Row', 'Time', 'Value', 'Context', 'Quality or error'].map((x) => (
                    <th className="border-b p-2" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r: any) => (
                  <tr key={r.row_number}>
                    <td className="border-b p-2">{r.row_number}</td>
                    <td className="border-b p-2">{r.effective_at || 'Invalid'}</td>
                    <td className="border-b p-2">
                      {r.value} {r.unit}
                    </td>
                    <td className="border-b p-2">{r.context}</td>
                    <td className="border-b p-2">
                      {r.errors.length
                        ? r.errors.join(' ')
                        : r.quality_flags.join(', ') || 'Accepted'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy || preview.import.summary.accepted === 0}
              onClick={confirm}
              className="min-h-11 rounded bg-navy px-4 font-semibold text-white disabled:opacity-50"
            >
              Confirm patient and import
            </button>
            <button onClick={() => setPreview(undefined)} className="min-h-11 rounded border px-4">
              Cancel
            </button>
          </div>
        </section>
      )}
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">
          Previous imports ({imports.length})
        </summary>
        {imports.length ? (
          imports.map((x) => (
            <p key={x.id} className="mt-2 border-l-2 p-2 text-sm">
              <strong>{x.original_filename}</strong> · {x.status} · {x.accepted_rows} accepted,{' '}
              {x.rejected_rows} rejected, {x.duplicate_rows} duplicates ·{' '}
              {new Date(x.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </p>
          ))
        ) : (
          <p className="p-2">No prior imports.</p>
        )}
      </details>
    </section>
  );
}
