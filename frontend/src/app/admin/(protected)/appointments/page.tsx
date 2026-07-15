'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import {
  AdminPageHeader,
  FilterBar,
  Pagination,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import {
  ApiError,
  downloadAdminExport,
  getAdminAppointments,
  getDoctors,
  updateAdminAppointmentStatus,
} from '@/lib/api';

const statuses = [
  '',
  'awaiting_payment',
  'payment_pending',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'payment_failed',
];
const sources = ['', 'public', 'admin'];
const sorts = [
  ['date_desc', 'Newest appointment'],
  ['date_asc', 'Oldest appointment'],
  ['created_desc', 'Recently created'],
  ['created_asc', 'Oldest created'],
];

function clinicToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addClinicDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function whatsAppLink(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['confirmed', 'checked_in', 'completed'].includes(status)) return 'success';
  if (['awaiting_payment', 'payment_pending'].includes(status)) return 'warning';
  if (['cancelled', 'no_show', 'payment_failed'].includes(status)) return 'danger';
  return 'neutral';
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState(clinicToday());
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [selected, setSelected] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    getDoctors(false)
      .then((doctorRows) => setDoctors(doctorRows.doctors || []))
      .catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((current) => ({ ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [search]);

  const filters = useMemo(
    () => ({
      doctor_id: doctorId,
      status,
      source,
      from,
      to,
      search: debouncedSearch,
      sort,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    [
      doctorId,
      status,
      source,
      from,
      to,
      debouncedSearch,
      sort,
      pagination.page,
      pagination.pageSize,
    ]
  );

  const load = async (mode: 'initial' | 'refresh' = 'initial') => {
    const requestIdValue = requestRef.current + 1;
    requestRef.current = requestIdValue;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError('');
    setRequestId('');

    try {
      const data = await getAdminAppointments('', filters);
      if (requestIdValue !== requestRef.current) return;
      setAppointments(data.data || []);
      setPagination(data.pagination || { page: 1, pageSize: 25, total: 0, totalPages: 1 });
    } catch (err) {
      if (requestIdValue !== requestRef.current) return;
      if (err instanceof ApiError) {
        setError(err.message || 'Could not load appointments.');
        setRequestId(err.payload?.requestId || '');
      } else {
        setError('Could not load appointments.');
      }
    } finally {
      if (requestIdValue !== requestRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(loading ? 'initial' : 'refresh');
  }, [filters]);

  const setRange = (range: 'today' | 'tomorrow' | 'week' | 'all') => {
    const today = clinicToday();
    if (range === 'today') {
      setFrom(today);
      setTo(today);
    } else if (range === 'tomorrow') {
      const tomorrow = addClinicDays(today, 1);
      setFrom(tomorrow);
      setTo(tomorrow);
    } else if (range === 'week') {
      setFrom(today);
      setTo(addClinicDays(today, 6));
    } else {
      setFrom('');
      setTo('');
    }
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const updateStatus = async (row: any, nextStatus: string) => {
    if (nextStatus === 'cancelled' && !window.confirm('Cancel this confirmed appointment?')) return;
    setUpdatingId(row.id);
    setError('');
    try {
      await updateAdminAppointmentStatus('', row.id, nextStatus);
      await load('refresh');
      if (selected?.id === row.id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update appointment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAdminExport('', 'appointments', {
        doctor_id: doctorId,
        status,
        source,
        from,
        to,
        search: debouncedSearch,
        sort,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="py-6">
      <div className="container max-w-[1280px]">
        <AdminPageHeader
          title="Appointments"
          description="Search, filter, follow up, and update patient visit status."
          action={
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-outline inline-flex items-center gap-2"
                onClick={() => load('refresh')}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                className="btn btn-outline inline-flex items-center gap-2"
                onClick={exportCsv}
                disabled={exporting}
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['today', 'Today'],
            ['tomorrow', 'Tomorrow'],
            ['week', 'Week'],
            ['all', 'All'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setRange(value as any)}
            >
              {label}
            </button>
          ))}
        </div>

        <FilterBar>
          <label className="form-group mb-0">
            <span>Doctor</span>
            <select
              value={doctorId}
              onChange={(event) => {
                setDoctorId(event.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <option value="">All doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              {statuses.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? item.replace(/_/g, ' ') : 'All statuses'}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Source</span>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              {sources.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item || 'All sources'}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              {sorts.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </label>
          <label className="form-group mb-0">
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </label>
          <label className="form-group mb-0 sm:col-span-2">
            <span>Search</span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light"
                size={16}
              />
              <input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, phone, doctor, appointment no."
              />
            </div>
          </label>
        </FilterBar>

        {error && (
          <div
            className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
            role="alert"
          >
            <p className="font-semibold">{error}</p>
            {requestId && <p className="mt-1 text-xs">Support reference: {requestId}</p>}
          </div>
        )}

        {loading ? (
          <AppointmentsSkeleton />
        ) : (
          <>
            <ResponsiveDataView
              cards={
                appointments.length === 0 ? (
                  <EmptyState text="No appointments match these filters." />
                ) : (
                  appointments.map((row) => (
                    <AppointmentCard
                      key={row.id}
                      row={row}
                      updatingId={updatingId}
                      onSelect={() => setSelected(row)}
                      onStatus={updateStatus}
                    />
                  ))
                )
              }
              table={
                <div className="rounded-lg border border-border bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-alt">
                        {['Patient', 'Doctor', 'Date', 'Time', 'Phone', 'Status', 'Actions'].map(
                          (label) => (
                            <th key={label} className="p-3">
                              {label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="p-3">
                            <button
                              type="button"
                              className="font-semibold text-navy hover:text-accent"
                              onClick={() => setSelected(row)}
                            >
                              {row.patient_name}
                            </button>
                            <p className="text-xs text-text-light">
                              {row.appointment_number || row.id}
                            </p>
                          </td>
                          <td className="p-3">{row.doctor_name}</td>
                          <td className="p-3">
                            {String(row.appointment_date || '-').slice(0, 10)}
                          </td>
                          <td className="p-3">{String(row.start_time || '-').slice(0, 5)}</td>
                          <td className="p-3">{row.phone_masked || row.phone || '-'}</td>
                          <td className="p-3">
                            <StatusBadge tone={statusTone(row.status)}>
                              {String(row.status || '-').replace(/_/g, ' ')}
                            </StatusBadge>
                          </td>
                          <td className="p-3">
                            <RowActions row={row} updatingId={updatingId} onStatus={updateStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {appointments.length === 0 && (
                    <EmptyState text="No appointments match these filters." />
                  )}
                </div>
              }
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            />
            <p className="mt-2 text-xs text-text-light">
              Showing page {pagination.page} of {pagination.totalPages}, {pagination.total} total
              appointment(s).
            </p>
          </>
        )}

        {selected && (
          <AppointmentDetailDrawer
            row={selected}
            updatingId={updatingId}
            onClose={() => setSelected(null)}
            onStatus={updateStatus}
          />
        )}
      </div>
    </section>
  );
}

function RowActions({
  row,
  updatingId,
  onStatus,
}: {
  row: any;
  updatingId: string | null;
  onStatus: (row: any, status: string) => void;
}) {
  const actions = row.allowed_actions || [];
  return (
    <div className="flex flex-wrap gap-2">
      {row.phone && (
        <a className="btn btn-outline btn-sm" href={`tel:${row.phone}`}>
          Call
        </a>
      )}
      {row.phone && (
        <a
          className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1fb357]"
          href={whatsAppLink(row.phone)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      )}
      <select
        className="rounded-md border border-border px-2 py-2 text-xs"
        value=""
        disabled={updatingId === row.id || actions.length === 0}
        onChange={(event) => event.target.value && onStatus(row, event.target.value)}
      >
        <option value="">
          {updatingId === row.id ? 'Updating...' : actions.length ? 'Update' : 'No actions'}
        </option>
        {actions.map((action: string) => (
          <option key={action} value={action}>
            {action.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}

function AppointmentCard({
  row,
  updatingId,
  onSelect,
  onStatus,
}: {
  row: any;
  updatingId: string | null;
  onSelect: () => void;
  onStatus: (row: any, status: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-navy">{row.patient_name}</p>
            <p className="text-xs text-text-light">{row.doctor_name}</p>
          </div>
          <StatusBadge tone={statusTone(row.status)}>
            {String(row.status || '-').replace(/_/g, ' ')}
          </StatusBadge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold">Date</p>
            <p className="text-text-light">{String(row.appointment_date || '-').slice(0, 10)}</p>
          </div>
          <div>
            <p className="font-semibold">Time</p>
            <p className="text-text-light">{String(row.start_time || '-').slice(0, 5)}</p>
          </div>
          <div>
            <p className="font-semibold">Phone</p>
            <p className="text-text-light">{row.phone_masked || '-'}</p>
          </div>
          <div>
            <p className="font-semibold">Source</p>
            <p className="text-text-light capitalize">{row.source || '-'}</p>
          </div>
        </div>
      </button>
      <div className="mt-4">
        <RowActions row={row} updatingId={updatingId} onStatus={onStatus} />
      </div>
    </div>
  );
}

function AppointmentDetailDrawer({
  row,
  updatingId,
  onClose,
  onStatus,
}: {
  row: any;
  updatingId: string | null;
  onClose: () => void;
  onStatus: (row: any, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close detail"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[440px] overflow-y-auto bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-navy">{row.patient_name}</h2>
            <p className="text-sm text-text-light">{row.appointment_number || row.id}</p>
          </div>
          <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid gap-4 text-sm">
          <Detail label="Doctor" value={row.doctor_name} />
          <Detail
            label="Date/time"
            value={`${String(row.appointment_date || '-').slice(0, 10)} ${String(row.start_time || '-').slice(0, 5)}`}
          />
          <Detail label="Phone" value={row.phone || row.phone_masked || '-'} />
          <Detail label="Status" value={String(row.status || '-').replace(/_/g, ' ')} />
          <Detail
            label="Payment"
            value={String(row.payment_status || 'not linked').replace(/_/g, ' ')}
          />
          <Detail label="Source" value={row.source || '-'} />
          {row.reason && <Detail label="Reason" value={row.reason} />}
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-text-light">Actions</p>
            <RowActions row={row} updatingId={updatingId} onStatus={onStatus} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-alt p-3">
      <p className="text-xs font-bold uppercase text-text-light">{label}</p>
      <p className="mt-1 font-semibold text-text">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-6 text-sm text-text-light">{text}</p>;
}

function AppointmentsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-20 rounded-lg bg-white shadow-sm" />
      ))}
    </div>
  );
}
