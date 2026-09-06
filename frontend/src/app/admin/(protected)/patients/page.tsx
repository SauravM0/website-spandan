'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { searchAdminPatients } from '../../../../lib/api';
import Button from '@/components/ui/Button';

export default function PatientsPage() {
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    searchAdminPatients(applied)
      .then((result) => {
        if (active) setRows(result.data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load patient records');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setApplied(query.trim());
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Patient records</h1>
          <p className="mt-1 text-sm text-text-light">
            Search by name, last four phone digits, or an authorized identifier.
          </p>
        </div>
        <Button variant="outline" href="/admin/patients/identity-reviews">
          Duplicate review queue
        </Button>
      </div>
      <form onSubmit={submit} role="search" className="mb-5 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="patient-search">
          Search patients
        </label>
        <input
          id="patient-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={100}
          className="min-h-[44px] flex-1 rounded-md border border-border px-3"
          placeholder="Name or last 4 phone digits"
        />
        <button className="min-h-[44px] rounded-md bg-ink px-5 font-semibold text-white">
          Search
        </button>
      </form>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}{' '}
          <button className="underline" onClick={() => setApplied((value) => `${value} `)}>
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading patient records...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-border bg-white p-5">
          No matching patient record. Never create or link a patient directly from search results.
        </p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/admin/patients/${patient.id}`}
                className="block rounded-md border border-border bg-white p-4 shadow-sm hover:border-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink">{patient.full_name}</p>
                    <p className="text-sm text-text-light">
                      DOB: {patient.date_of_birth || 'Not recorded'} - Phone ending{' '}
                      {patient.phone_last4 || 'not available'}
                    </p>
                  </div>
                  {patient.duplicate_warning && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      Identity review needed
                    </span>
                  )}
                  {!patient.duplicate_warning && patient.identity_linked && (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-accent">
                      Identity linked
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
