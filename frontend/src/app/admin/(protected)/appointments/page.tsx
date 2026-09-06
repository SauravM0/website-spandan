'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, RefreshCw, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AdminPageHeader,
  AdminDrawer,
  CursorPagination,
  FilterBar,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import {
  ApiError,
  downloadAdminExport,
  getAdminAppointments,
  getAppointmentSlots,
  getDoctors,
  rescheduleAdminAppointment,
  transitionAdminAppointment,
  type AppointmentTransitionEvidence,
} from '@/lib/api';
import { useAdminRealtimeRefresh } from '@/lib/adminRealtime';
import { promptAdminAction } from '@/lib/adminDialogs';
import type { AdminAppointment } from '@/lib/types';
import Button from '@/components/ui/Button';

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
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, hasMore: false });
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
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
  const [selected, setSelected] = useState<AdminAppointment | null>(null);
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    setDoctorId(searchParams.get('doctor_id') || '');
    setStatus(searchParams.get('status') || '');
    setSource(searchParams.get('source') || '');
    setFrom(searchParams.get('from') ?? clinicToday());
    setTo(searchParams.get('to') || '');
    setSearch(searchParams.get('search') || '');
    setSort(searchParams.get('sort') || 'date_desc');
    resetPaging();
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams();
      if (doctorId) query.set('doctor_id', doctorId);
      if (status) query.set('status', status);
      if (source) query.set('source', source);
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      if (search.trim()) query.set('search', search.trim());
      if (sort !== 'date_desc') query.set('sort', sort);
      router.replace(query.size ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [doctorId, from, pathname, router, search, sort, source, status, to]);

  useEffect(() => {
    getDoctors(false)
      .then((doctorRows) => setDoctors(doctorRows.doctors || []))
      .catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      resetPaging();
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
      cursor: cursor || undefined,
      pageSize: pagination.pageSize,
    }),
    [doctorId, status, source, from, to, debouncedSearch, sort, cursor, pagination.pageSize]
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
      setPagination((current) => ({
        ...current,
        pageSize: data.pagination?.pageSize || 25,
        hasMore: Boolean(data.pagination?.hasMore),
      }));
      setNextCursor(data.cursor || null);
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

  const resetPaging = () => {
    setCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
    setPagination((current) => ({ ...current, page: 1, hasMore: false }));
  };

  const nextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((history) => [...history, cursor]);
    setCursor(nextCursor);
    setPagination((current) => ({ ...current, page: current.page + 1 }));
  };

  const previousPage = () => {
    if (!cursorHistory.length) return;
    setCursor(cursorHistory[cursorHistory.length - 1]);
    setCursorHistory((history) => history.slice(0, -1));
    setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }));
  };

  useAdminRealtimeRefresh(['appointment.changed', 'payment.changed'], () => load('refresh'));

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
    resetPaging();
  };

  const updateStatus = async (row: AdminAppointment, action: string) => {
    const reason = (
      await promptAdminAction({
        title: `Record ${action.replace(/_/g, ' ')}`,
        description: 'This becomes permanent appointment audit evidence.',
        label: 'Reason',
        multiline: true,
        minLength: 3,
      })
    )?.trim();
    if (!reason || reason.length < 3) return;
    let evidence: AppointmentTransitionEvidence | undefined;
    const requiresEvidence = ['confirm', 'check_in', 'complete'].includes(action);
    const hasEvidence = ['paid_online', 'paid_cash', 'waived'].includes(row.payment_status);
    if (requiresEvidence && !hasEvidence) {
      const kind = (
        await promptAdminAction({
          title: 'Select payment evidence',
          description: 'Enter automatic, cash, or waiver.',
          label: 'Evidence type',
          defaultValue: 'automatic',
          minLength: 4,
        })
      )
        ?.trim()
        .toLowerCase();
      if (!kind) return;
      if (kind === 'cash') {
        const amount = Number(
          await promptAdminAction({
            title: 'Record cash payment',
            description: 'Enter the exact amount received.',
            label: 'Cash amount',
            defaultValue: String(row.fee_amount || row.amount_snapshot || ''),
            minLength: 1,
          })
        );
        const reference = (
          await promptAdminAction({
            title: 'Record cash reference',
            description: 'Use the issued receipt or clinic reference.',
            label: 'Receipt or reference',
            minLength: 2,
          })
        )?.trim();
        if (!Number.isFinite(amount) || amount <= 0 || !reference) return;
        evidence = { kind: 'cash', amount, reference };
      } else if (kind === 'waiver') {
        const approvalReason = (
          await promptAdminAction({
            title: 'Record approved waiver',
            description: 'Explain why payment was waived.',
            label: 'Waiver reason',
            multiline: true,
            minLength: 10,
          })
        )?.trim();
        if (!approvalReason || approvalReason.length < 10) return;
        evidence = { kind: 'waiver', approval_reason: approvalReason };
      } else if (kind !== 'automatic') {
        setError('Choose automatic, cash, or waiver evidence.');
        return;
      }
    }
    setUpdatingId(row.id);
    setError('');
    try {
      await transitionAdminAppointment('', row.id, {
        action,
        expected_version: Number(row.version),
        reason,
        evidence,
      });
      await load('refresh');
      if (selected?.id === row.id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update appointment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const reschedule = async (row: AdminAppointment) => {
    const doctorName = (
      await promptAdminAction({
        title: 'Choose reschedule doctor',
        description: `Available doctors: ${doctors.map((doctor) => doctor.name).join(', ')}.`,
        label: 'Doctor name',
        defaultValue: row.doctor_name || '',
        minLength: 2,
      })
    )?.trim();
    if (!doctorName) return;
    const doctor = doctors.find(
      (candidate) => candidate.name.toLowerCase() === doctorName.toLowerCase()
    );
    if (!doctor) {
      setError('Choose a doctor using the exact displayed name.');
      return;
    }
    const appointmentDate = (
      await promptAdminAction({
        title: 'Choose reschedule date',
        description: 'Enter the clinic date in YYYY-MM-DD format.',
        label: 'New appointment date',
        defaultValue: String(row.appointment_date).slice(0, 10),
        minLength: 10,
      })
    )?.trim();
    if (!appointmentDate) return;
    setUpdatingId(row.id);
    setError('');
    try {
      const result = await getAppointmentSlots(doctor.id, appointmentDate);
      const available = (result.slots || []).filter((slot) => slot.available);
      if (!available.length) {
        setError('No replacement slots are available. The original appointment was kept.');
        return;
      }
      const startTime = (
        await promptAdminAction({
          title: 'Choose reschedule time',
          description: `Available start times: ${available.map((slot) => String(slot.start_time).slice(0, 5)).join(', ')}.`,
          label: 'Start time',
          defaultValue: String(available[0].start_time).slice(0, 5),
          minLength: 5,
        })
      )?.trim();
      if (!startTime) return;
      if (
        !available.some((slot) => String(slot.start_time).slice(0, 5) === startTime.slice(0, 5))
      ) {
        setError('Choose one of the currently available start times.');
        return;
      }
      const reason = (
        await promptAdminAction({
          title: 'Record reschedule reason',
          description: 'This becomes permanent audit evidence.',
          label: 'Reason',
          multiline: true,
          minLength: 3,
        })
      )?.trim();
      if (!reason || reason.length < 3) return;
      await rescheduleAdminAppointment('', row.id, {
        doctor_id: doctor.id,
        appointment_date: appointmentDate,
        start_time: startTime,
        expected_version: Number(row.version),
        reason,
        cancel_if_unavailable: false,
      });
      await load('refresh');
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reschedule appointment.');
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
              <Button
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={() => load('refresh')}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={exportCsv}
                disabled={exporting}
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
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
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => setRange(value as any)}
            >
              {label}
            </Button>
          ))}
        </div>

        <FilterBar>
          <label className="form-group mb-0">
            <span>Doctor</span>
            <select
              value={doctorId}
              onChange={(event) => {
                setDoctorId(event.target.value);
                resetPaging();
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
                resetPaging();
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
                resetPaging();
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
                resetPaging();
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
                resetPaging();
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
                      onReschedule={reschedule}
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
                              className="font-semibold text-ink hover:text-accent"
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
                            <RowActions
                              row={row}
                              updatingId={updatingId}
                              onStatus={updateStatus}
                              onReschedule={reschedule}
                            />
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
            <CursorPagination
              page={pagination.page}
              canPrevious={cursorHistory.length > 0}
              canNext={pagination.hasMore && Boolean(nextCursor)}
              onPrevious={previousPage}
              onNext={nextPage}
              itemLabel="appointments"
              itemCount={appointments.length}
            />
          </>
        )}

        {selected && (
          <AppointmentDetailDrawer
            row={selected}
            updatingId={updatingId}
            onClose={() => setSelected(null)}
            onStatus={updateStatus}
            onReschedule={reschedule}
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
  onReschedule,
}: {
  row: AdminAppointment;
  updatingId: string | null;
  onStatus: (row: AdminAppointment, status: string) => void;
  onReschedule: (row: AdminAppointment) => void;
}) {
  const actions = row.allowed_actions || [];
  return (
    <div className="flex flex-wrap gap-2">
      {['awaiting_payment', 'payment_pending', 'confirmed'].includes(row.status) && (
        <Button
          variant="outline"
          size="sm"
          disabled={updatingId === row.id}
          onClick={() => onReschedule(row)}
        >
          Reschedule
        </Button>
      )}
      {row.phone && (
        <Button variant="outline" size="sm" href={`tel:${row.phone}`}>
          Call
        </Button>
      )}
      {row.phone && (
        <Button
          size="sm"
          className="bg-[#25D366] text-white hover:bg-[#1fb357]"
          href={whatsAppLink(row.phone)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </Button>
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
  onReschedule,
}: {
  row: AdminAppointment;
  updatingId: string | null;
  onSelect: () => void;
  onStatus: (row: AdminAppointment, status: string) => void;
  onReschedule: (row: AdminAppointment) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-ink">{row.patient_name}</p>
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
        <RowActions
          row={row}
          updatingId={updatingId}
          onStatus={onStatus}
          onReschedule={onReschedule}
        />
      </div>
    </div>
  );
}

function AppointmentDetailDrawer({
  row,
  updatingId,
  onClose,
  onStatus,
  onReschedule,
}: {
  row: AdminAppointment;
  updatingId: string | null;
  onClose: () => void;
  onStatus: (row: AdminAppointment, status: string) => void;
  onReschedule: (row: AdminAppointment) => void;
}) {
  return (
    <AdminDrawer label="Appointment detail" onClose={onClose} widthClass="max-w-[440px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">{row.patient_name}</h2>
          <p className="text-sm text-text-light">{row.appointment_number || row.id}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-4 text-sm">
        <Detail label="Doctor" value={row.doctor_name} />
        <Detail
          label="Date/time"
          value={`${String(row.appointment_date || '-').slice(0, 10)} ${String(row.start_time || '-').slice(0, 5)}`}
        />
        <Detail label="Phone" value={row.phone || row.phone_masked || '-'} />
        <Detail label="Status" value={String(row.status || '-').replace(/_/g, ' ')} />
        {Number(row.reschedule_count || 0) > 0 && (
          <Detail
            label="Rescheduled"
            value={`${row.reschedule_count} time(s); last ${row.last_rescheduled_at ? new Date(row.last_rescheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}`}
          />
        )}
        <Detail
          label="Payment"
          value={
            row.linked_payment_id ? (
              <Link className="font-semibold text-primary underline" href={`/admin/payments?search=${encodeURIComponent(row.linked_payment_reference || row.linked_payment_id)}`}>
                {String(row.linked_payment_status || row.payment_status || 'linked').replace(/_/g, ' ')}
              </Link>
            ) : (
              String(row.payment_status || 'not linked').replace(/_/g, ' ')
            )
          }
        />
        <Detail label="Source" value={row.source || '-'} />
        {row.reason && <Detail label="Reason" value={row.reason} />}
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-text-light">Actions</p>
          <RowActions
            row={row}
            updatingId={updatingId}
            onStatus={onStatus}
            onReschedule={onReschedule}
          />
        </div>
      </div>
    </AdminDrawer>
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
