'use client';
import { FormEvent, useEffect, useState } from 'react';
import {
  createIntakeInvitation,
  getDoctors,
  getIntakeReviews,
  updateIntakeReview,
} from '../../../../lib/api';
import { confirmAdminAction } from '@/lib/adminDialogs';

export default function IntakeAdminPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    doctor_id: '',
    consultation_mode: 'video',
    contact_type: 'phone',
    contact: '',
    preferred_language: 'en',
    expires_in_hours: 72,
  });
  const load = () =>
    getIntakeReviews()
      .then((r) => setReviews(r.data))
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    load();
    getDoctors().then((r) => {
      setDoctors(r.doctors);
      setForm((f) => ({ ...f, doctor_id: r.doctors[0]?.id || '' }));
    });
  }, []);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const r = await createIntakeInvitation(form);
      await navigator.clipboard?.writeText(r.invitation.link);
      setMessage(`Secure generic link created and copied: ${r.invitation.link}`);
      setForm({ ...form, contact: '' });
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (r: any, status: string) => {
    if (
      !(await confirmAdminAction({
        title: 'Update intake review?',
        description: `Change this review to ${status.replace('_', ' ')}. This does not book an appointment.`,
        confirmLabel: 'Update review',
      }))
    )
      return;
    try {
      await updateIntakeReview(r.id, { status, expected_version: r.version });
      load();
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-ink">Remote intake</h1>
      <p className="mt-1 text-text-light">
        Create privacy-safe links and review patient-submitted information. Intake never confirms a
        slot.
      </p>
      <section className="mt-6 rounded-md border bg-white p-5">
        <h2 className="text-lg font-bold">Create invitation</h2>
        <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 font-semibold">
            Doctor
            <select
              required
              className="min-h-11 rounded-md border p-2"
              value={form.doctor_id}
              onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            Consultation mode
            <select
              className="min-h-11 rounded-md border p-2"
              value={form.consultation_mode}
              onChange={(e) => setForm({ ...form, consultation_mode: e.target.value })}
            >
              <option value="video">Video</option>
              <option value="phone">Phone</option>
              <option value="in_person">In person</option>
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            Contact type
            <select
              className="min-h-11 rounded-md border p-2"
              value={form.contact_type}
              onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            Patient contact
            <input
              required
              className="min-h-11 rounded-md border p-2"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </label>
          <button
            disabled={busy || !form.doctor_id}
            className="min-h-11 rounded-md bg-accent px-5 font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create secure link'}
          </button>
        </form>
        {message && (
          <p role="status" className="mt-4 break-all rounded-md bg-bg-alt p-3">
            {message}
          </p>
        )}
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-bold">Review queue</h2>
        <div className="mt-3 grid gap-3">
          {reviews.length === 0 && (
            <p className="rounded-md border bg-white p-5">No submitted intakes need review.</p>
          )}
          {reviews.map((r) => (
            <article key={r.id} className="rounded-md border bg-white p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-bold">
                    {r.doctor_name} · {r.consultation_mode.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-text-light">
                    Status: {r.status.replace('_', ' ')} · due{' '}
                    {new Date(r.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <button
                      onClick={() => act(r, 'in_review')}
                      className="min-h-11 rounded-md border px-3 font-semibold"
                    >
                      Start review
                    </button>
                  )}
                  {r.status === 'in_review' && (
                    <button
                      onClick={() => act(r, 'accepted')}
                      className="min-h-11 rounded-md bg-accent px-3 font-semibold text-white"
                    >
                      Accept information
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
