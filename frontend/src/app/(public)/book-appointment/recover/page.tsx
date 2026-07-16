'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { recoverAppointment } from '@/lib/api';

export default function AppointmentRecoveryPage() {
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const data = await recoverAppointment(reference.trim(), phone.trim());
      setResult(data.booking);
    } catch {
      setResult(null);
      setMessage(
        'We could not verify those booking details. Check them or contact the clinic for help.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container max-w-[680px]">
        <h1 className="text-3xl font-bold text-navy">Recover an appointment booking</h1>
        <p className="mt-2 text-text-light">
          Enter the booking reference and the same phone number used for booking.
        </p>
        <form className="soft-card mt-6 grid gap-4 p-6" onSubmit={submit}>
          <label className="form-group">
            <span>Booking reference</span>
            <input
              required
              maxLength={120}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="form-group">
            <span>Booking phone number</span>
            <input
              required
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button className="btn btn-accent" disabled={loading}>
            {loading ? 'Checking…' : 'Check booking'}
          </button>
        </form>
        <div className="mt-5" aria-live="polite">
          {message && (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {message}
            </p>
          )}
          {result && (
            <div className="soft-card p-5">
              <h2 className="text-xl font-bold text-navy">
                Authoritative status: {String(result.state).replace(/_/g, ' ')}
              </h2>
              {result.appointment_number && (
                <p className="mt-2">
                  Appointment number: <strong>{result.appointment_number}</strong>
                </p>
              )}
              {result.payment_status && (
                <p className="mt-2">
                  Payment status:{' '}
                  <strong>{String(result.payment_status).replace(/_/g, ' ')}</strong>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <Link className="btn btn-outline" href="/book-appointment">
            Choose another slot
          </Link>
          <Link className="btn btn-outline" href="/contact">
            Contact clinic
          </Link>
        </div>
      </div>
    </section>
  );
}
