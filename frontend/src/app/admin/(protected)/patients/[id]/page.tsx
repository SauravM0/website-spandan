'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  createClinicalResource,
  getAdminPatient,
  getAdminPatientAppointments,
  saveClinicalNote,
  signClinicalNote,
} from '../../../../../lib/api';
import { confirmAdminAction } from '../../../../../lib/adminDialogs';
import MedicationManager from '../../../../../components/admin/MedicationManager';
import ObservationManager from '../../../../../components/admin/ObservationManager';
import DeviceImportManager from '../../../../../components/admin/DeviceImportManager';
const labels: Record<string, string> = {
  condition: 'Condition',
  allergy: 'Allergy or intolerance',
  observation: 'Observation',
  diagnostic_report: 'Diagnostic report',
  document: 'Document',
  procedure: 'Procedure',
  care_plan: 'Care plan',
};
export default function PatientRecordPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState('allergy');
  const [display, setDisplay] = useState('');
  const [source, setSource] = useState('patient');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<any>();
  const [journeyLoading, setJourneyLoading] = useState(false);
  const load = () => {
    setError('');
    return getAdminPatient(id)
      .then(setData)
      .catch((e) => setError(e.message || 'Could not load patient record'));
  };
  useEffect(() => {
    const c = new AbortController();
    getAdminPatient(id, c.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, [id]);
  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createClinicalResource(id, {
        resource_type: type,
        display,
        status: 'active',
        verification_status: source === 'clinician' ? 'confirmed' : 'unconfirmed',
        source,
        confidentiality: 'normal',
        value: {},
      });
      setDisplay('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function loadMoreJourney() {
    if (!data?.appointmentsCursor) return;
    setJourneyLoading(true);
    try {
      const result = await getAdminPatientAppointments(id, data.appointmentsCursor);
      setData((current: any) => ({
        ...current,
        appointments: [...(current.appointments || []), ...(result.appointments || [])],
        appointmentsCursor: result.appointmentsCursor,
      }));
    } catch (e: any) {
      setError(e.message || 'Could not load more patient history.');
    } finally {
      setJourneyLoading(false);
    }
  }
  async function saveDraft() {
    setBusy(true);
    try {
      const r = await saveClinicalNote(id, {
        note_id: draft?.note_id,
        encounter_id: data.encounters[0]?.id,
        expected_version: draft?.version || 0,
        body: note,
        confidentiality: 'normal',
      });
      setDraft(r.note);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    if (
      !(await confirmAdminAction({
        title: 'Sign clinical note?',
        description: `Sign this note for ${data.patient.full_name}. Signed content cannot be edited; corrections require an amendment.`,
        confirmLabel: 'Sign note',
      }))
    )
      return;
    setBusy(true);
    try {
      await signClinicalNote(draft.note_id, draft.version, id);
      setDraft(undefined);
      setNote('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error && !data)
    return (
      <div role="alert" className="m-6 rounded-md bg-red-50 p-4">
        {error}{' '}
        <button onClick={load} className="underline">
          Try again
        </button>
      </div>
    );
  if (!data)
    return (
      <p role="status" className="p-6">
        Loading patient record…
      </p>
    );
  const p = data.patient;
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <section
        aria-labelledby="patient-banner"
        className="sticky top-16 z-20 mb-5 rounded-md border-2 border-navy bg-white p-4 shadow"
      >
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 id="patient-banner" className="text-xl font-bold text-navy">
              {p.full_name}
            </h1>
            <p className="text-sm">
              DOB: {p.date_of_birth || 'Not recorded'} · Sex/gender: {p.gender || 'Not recorded'} ·
              Record ID: {p.id.slice(0, 8)}
            </p>
          </div>
          <div className="text-sm font-semibold">Verify name + DOB before writing</div>
        </div>
      </section>
      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}
      {!data.clinicalWritesEnabled && (
        <div role="status" className="mb-5 rounded-md border border-amber-300 bg-amber-50 p-4">
          <strong>Clinical authoring is unavailable.</strong> Required governance approvals have not
          been recorded. Existing authorized information remains readable.
        </div>
      )}
      <OperationalJourney
        patientId={p.id}
        appointments={data.appointments || []}
        packageOrders={data.packageOrders || []}
        hasMore={Boolean(data.appointmentsCursor)}
        loading={journeyLoading}
        onLoadMore={loadMoreJourney}
      />
      <MedicationManager
        patientId={id}
        patientName={p.full_name}
        encounters={data.encounters}
        writesEnabled={data.clinicalWritesEnabled}
      />
      <ObservationManager patientId={id} patientName={p.full_name} encounters={data.encounters} />
      <DeviceImportManager patientId={id} patientName={p.full_name} />
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <main>
          <h2 className="mb-3 text-lg font-bold text-navy">Longitudinal timeline</h2>
          <div className="grid gap-3">
            {[
              ...data.resources.map((r: any) => ({ ...r, kind: 'resource', when: r.authored_at })),
              ...data.encounters.map((e: any) => ({
                ...e,
                kind: 'encounter',
                when: e.started_at || e.created_at,
              })),
            ]
              .sort((a: any, b: any) => String(b.when).localeCompare(String(a.when)))
              .map((item: any) => (
                <article
                  key={`${item.kind}-${item.id}`}
                  className="rounded-md border border-border bg-white p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-text-light">
                    {item.kind === 'encounter' ? 'Encounter' : labels[item.resource_type]} ·{' '}
                    {new Date(item.when).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </p>
                  <h3 className="mt-1 font-bold text-navy">
                    {item.kind === 'encounter'
                      ? `${item.doctor_name} · ${item.status}`
                      : item.display}
                  </h3>
                  {item.kind === 'resource' && (
                    <p className="mt-1 text-sm">
                      Status: {item.status} · Verification: {item.verification_status} · Source:{' '}
                      {item.source} · Version {item.version}
                    </p>
                  )}
                </article>
              ))}
            {data.resources.length + data.encounters.length === 0 && (
              <p className="rounded-md border border-border p-4">
                No encounter or clinical timeline entries.
              </p>
            )}
          </div>
        </main>
        <aside className="space-y-5">
          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="font-bold text-navy">Identity and warnings</h2>
            <p className="mt-2 text-sm">
              Confidentiality: {p.confidentiality}. Identifiers are masked and external identifiers
              never replace the internal record ID.
            </p>
            {data.identifiers.map((x: any) => (
              <p key={x.id} className="mt-2 text-sm">
                {x.system}: {x.display_masked} ({x.status})
              </p>
            ))}
          </section>
          <form onSubmit={addResource} className="rounded-md border border-border bg-white p-4">
            <h2 className="font-bold text-navy">Add structured information</h2>
            <fieldset disabled={!data.clinicalWritesEnabled || busy} className="mt-3 grid gap-3">
              <label className="text-sm font-semibold">
                Type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border px-2"
                >
                  {Object.entries(labels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Information
                <input
                  required
                  maxLength={500}
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border px-3"
                />
              </label>
              <label className="text-sm font-semibold">
                Source
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border px-2"
                >
                  <option value="patient">Patient reported</option>
                  <option value="guardian">Guardian reported</option>
                  <option value="clinician">Clinician verified</option>
                </select>
              </label>
              <button className="min-h-[44px] rounded-md bg-navy px-4 font-semibold text-white">
                Add to record
              </button>
            </fieldset>
          </form>
          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="font-bold text-navy">Encounter note</h2>
            {!data.encounters[0] ? (
              <p className="mt-2 text-sm">Open an encounter before authoring a note.</p>
            ) : (
              <fieldset disabled={!data.clinicalWritesEnabled || busy} className="mt-3 grid gap-3">
                <label className="text-sm font-semibold">
                  Draft note
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={7}
                    maxLength={50000}
                    className="mt-1 w-full rounded-md border border-border p-3"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!note.trim()}
                  className="min-h-[44px] rounded-md border border-navy px-4 font-semibold text-navy"
                >
                  Save draft
                </button>
                {draft && (
                  <button
                    type="button"
                    onClick={sign}
                    className="min-h-[44px] rounded-md bg-navy px-4 font-semibold text-white"
                  >
                    Review and sign
                  </button>
                )}
              </fieldset>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function OperationalJourney({
  patientId,
  appointments,
  packageOrders,
  hasMore,
  loading,
  onLoadMore,
}: {
  patientId: string;
  appointments: any[];
  packageOrders: any[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section className="mb-5 rounded-md border border-border bg-white p-4">
      <h2 className="font-bold text-navy">Operational journey</h2>
      <p className="mt-1 text-xs text-text-light">
        Includes appointments and orders from identity-linked source records. No source record was
        moved or deleted.
      </p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold">Appointments</h3>
          <ul className="mt-2 grid gap-2">
            {appointments.map((item) => (
              <li key={item.id} className="rounded-md bg-bg-alt p-3 text-sm">
                <strong>
                  {String(item.appointment_date).slice(0, 10)} {String(item.start_time).slice(0, 5)}
                </strong>{' '}
                - {item.doctor_name} - {String(item.status).replace(/_/g, ' ')}
                {item.source_patient_id !== patientId && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs">Linked source</span>
                )}
              </li>
            ))}
            {!appointments.length && <li className="text-sm text-text-light">No appointments.</li>}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold">Package and test orders</h3>
          <ul className="mt-2 grid gap-2">
            {packageOrders.map((item) => (
              <li key={item.id} className="rounded-md bg-bg-alt p-3 text-sm">
                <strong>{item.order_number}</strong> - {String(item.status).replace(/_/g, ' ')}
                {item.source_patient_id !== patientId && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs">Linked source</span>
                )}
              </li>
            ))}
            {!packageOrders.length && (
              <li className="text-sm text-text-light">No package or test orders.</li>
            )}
          </ul>
        </div>
      </div>
      {hasMore && (
        <button
          type="button"
          className="btn btn-outline mt-4"
          disabled={loading}
          onClick={onLoadMore}
        >
          {loading ? 'Loading history...' : 'Load older appointments'}
        </button>
      )}
    </section>
  );
}
