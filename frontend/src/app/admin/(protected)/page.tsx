'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, CreditCard, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
import {
  ApiError,
  getAdminDashboard,
  getAdminWorkItem,
  transitionAdminAppointment,
} from '@/lib/api';
import type { DashboardData } from '@/lib/types';
import { useAdminRealtimeRefresh } from '@/lib/adminRealtime';

const metricLabels: Array<[keyof DashboardData['metrics'], string]> = [
  ['appointmentsToday', 'Appointments'],
  ['confirmedAppointments', 'Confirmed'],
  ['awaitingPayment', 'Awaiting payment'],
  ['checkedIn', 'Checked-in'],
  ['completed', 'Completed'],
  ['packagePurchases', 'Package purchases'],
  ['paymentIssues', 'Payment issues'],
  ['notificationFailures', 'Notification failures'],
  ['expiredHolds', 'Expired holds'],
  ['identityReviews', 'Identity reviews'],
];

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['confirmed', 'success', 'completed', 'checked_in'].includes(status)) return 'success';
  if (['awaiting_payment', 'payment_pending', 'pending', 'retrying'].includes(status))
    return 'warning';
  if (
    ['failed', 'payment_failed', 'cancelled', 'no_show', 'verification_required'].includes(status)
  )
    return 'danger';
  return 'neutral';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [workItem, setWorkItem] = useState<any | null>(null);
  const [workItemLoading, setWorkItemLoading] = useState(false);
  const [recent, setRecent] = useState<Array<{ type: string; id: string }>>([]);

  const load = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError('');
    setRequestId('');

    try {
      const result = await getAdminDashboard('');
      setDashboard(result.dashboard);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Could not load dashboard.');
        setRequestId(err.payload?.requestId || '');
      } else {
        setError('Could not load dashboard.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useAdminRealtimeRefresh(
    [
      'appointment.changed',
      'package_order.changed',
      'payment.changed',
      'notification.changed',
      'patient_review.changed',
    ],
    () => load('refresh')
  );

  useEffect(() => {
    load();
    try {
      const stored = JSON.parse(sessionStorage.getItem('admin_recent_work_ids') || '[]');
      if (Array.isArray(stored)) setRecent(stored.slice(0, 8));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const reference = searchParams.get('work_item');
    if (!reference) {
      setWorkItem(null);
      return;
    }
    const [type, id] = reference.split(':');
    if (!type || !id) return;
    const controller = new AbortController();
    setWorkItemLoading(true);
    getAdminWorkItem(type, id, controller.signal)
      .then((result) => {
        setWorkItem(result.workItem);
        const next = [
          { type, id },
          ...recent.filter((item) => item.type !== type || item.id !== id),
        ].slice(0, 8);
        setRecent(next);
        sessionStorage.setItem('admin_recent_work_ids', JSON.stringify(next));
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Could not load work item.');
      })
      .finally(() => setWorkItemLoading(false));
    return () => controller.abort();
  }, [searchParams]);

  const openWorkItem = (type: string, id: string) => {
    router.push(`/admin?work_item=${encodeURIComponent(`${type}:${id}`)}`, { scroll: false });
  };

  const activeActions = useMemo(() => {
    return (dashboard?.actionItems || []).filter((item) => item.count > 0);
  }, [dashboard]);

  const updateStatus = async (row: any, action: string) => {
    const reason = window.prompt(`Reason for ${action.replace(/_/g, ' ')}:`)?.trim();
    if (!reason || reason.length < 3) return;
    setUpdatingId(row.id);
    setMessage('');
    try {
      await transitionAdminAppointment('', row.id, {
        action,
        expected_version: Number(row.version),
        reason,
      });
      setMessage('Appointment updated.');
      await load('refresh');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update appointment.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="py-6">
      <div className="container max-w-[1280px]">
        <AdminPageHeader
          title="Today Dashboard"
          description={
            dashboard
              ? `Clinic day ${dashboard.clinicDate} (${dashboard.timezone})`
              : 'Appointments, collections, payments, and action items.'
          }
          action={
            <button
              type="button"
              className="btn btn-outline inline-flex items-center gap-2"
              onClick={() => load('refresh')}
              disabled={loading || refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          }
        />

        {message && (
          <p className="mb-4 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">
            {message}
          </p>
        )}
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
          <DashboardSkeleton />
        ) : dashboard ? (
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="grid gap-6 xl:col-span-8">
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metricLabels.map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-text-light">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-navy">
                      {key === 'collectionsToday'
                        ? money(dashboard.metrics[key] || 0)
                        : dashboard.metrics[key] || 0}
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-text-light">Collections</p>
                  <p className="mt-2 text-2xl font-bold text-navy">
                    {money(dashboard.metrics.collectionsToday || 0)}
                  </p>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-white shadow-sm">
                <div className="border-b border-border p-4">
                  <h2 className="font-bold text-navy">Today Appointment Queue</h2>
                  <p className="text-sm text-text-light">
                    Limited queue for the current clinic day.
                  </p>
                </div>
                <div className="grid gap-3 p-4 md:hidden">
                  {dashboard.todayAppointments.map((row) => (
                    <AppointmentCard
                      key={row.id}
                      row={row}
                      updatingId={updatingId}
                      onStatus={updateStatus}
                    />
                  ))}
                  {dashboard.todayAppointments.length === 0 && (
                    <EmptyState text="No appointments scheduled today." />
                  )}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-alt">
                        {['Time', 'Patient', 'Doctor', 'Phone', 'Payment', 'Status', 'Action'].map(
                          (label) => (
                            <th key={label} className="p-3">
                              {label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.todayAppointments.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="p-3 font-semibold text-navy">
                            {String(row.start_time || '-').slice(0, 5)}
                          </td>
                          <td className="p-3">{row.patient_name}</td>
                          <td className="p-3">{row.doctor_name}</td>
                          <td className="p-3 text-text-light">{row.phone_masked || '-'}</td>
                          <td className="p-3">
                            <StatusBadge tone={statusTone(row.payment_status || row.status)}>
                              {String(row.payment_status || 'not linked').replace(/_/g, ' ')}
                            </StatusBadge>
                          </td>
                          <td className="p-3">
                            <StatusBadge tone={statusTone(row.status)}>
                              {String(row.status || '-').replace(/_/g, ' ')}
                            </StatusBadge>
                          </td>
                          <td className="p-3">
                            <StatusSelect
                              row={row}
                              updatingId={updatingId}
                              onStatus={updateStatus}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboard.todayAppointments.length === 0 && (
                    <EmptyState text="No appointments scheduled today." />
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-border bg-white shadow-sm">
                <div className="border-b border-border p-4">
                  <h2 className="font-bold text-navy">Needs Action</h2>
                  <p className="text-sm text-text-light">
                    Ordered by overdue status, risk, and due time. Every item shows its next
                    decision.
                  </p>
                </div>
                <div className="grid gap-3 p-4">
                  {(dashboard.needsAction || []).slice(0, 15).map((item) => {
                    const supported = ['appointment', 'package_order', 'payment'].includes(
                      item.entity_type
                    );
                    const content = <TaskSummary item={item} />;
                    return supported ? (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => openWorkItem(item.entity_type, item.entity_id)}
                        className="w-full rounded-md border border-border p-3 text-left hover:bg-bg-alt"
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        key={item.id}
                        href={item.href || '/admin'}
                        className="rounded-md border border-border p-3 hover:bg-bg-alt"
                      >
                        {content}
                      </Link>
                    );
                  })}
                  {!dashboard.needsAction?.length && (
                    <EmptyState text="No operational item currently needs attention." />
                  )}
                </div>
              </section>
            </div>

            <aside className="grid content-start gap-6 xl:col-span-4">
              <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-danger" />
                  <h2 className="font-bold text-navy">Action Queue</h2>
                </div>
                <div className="grid gap-3">
                  {(activeActions.length ? activeActions : dashboard.actionItems.slice(0, 3)).map(
                    (item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-bg-alt"
                      >
                        <span className="text-sm font-semibold text-text">{item.label}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.priority === 'high' && item.count > 0
                              ? 'bg-danger/10 text-danger'
                              : item.priority === 'medium' && item.count > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-bg-alt text-text-light'
                          }`}
                        >
                          {item.count}
                        </span>
                      </Link>
                    )
                  )}
                </div>
              </section>

              <IssuePanel
                title="Payment Issues"
                icon={<CreditCard size={18} />}
                rows={dashboard.paymentIssues}
                href="/admin/payments"
                empty="No recent payment issues."
              />

              {recent.length > 0 && (
                <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
                  <h2 className="font-bold text-navy">Recently Viewed IDs</h2>
                  <p className="mb-3 text-xs text-text-light">
                    Session-only entity IDs; no patient names or contact details are stored locally.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((item) => (
                      <button
                        type="button"
                        key={`${item.type}:${item.id}`}
                        onClick={() => openWorkItem(item.type, item.id)}
                        className="rounded-md border border-border px-3 py-2 text-xs font-semibold"
                      >
                        {item.type.replace(/_/g, ' ')} {item.id.slice(0, 8)}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <IssuePanel
                title="Notification Failures"
                icon={<CalendarClock size={18} />}
                rows={dashboard.notificationFailures}
                href="/admin/notifications"
                empty="No notification failures."
              />

              {dashboard.warnings.length > 0 && (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <h2 className="mb-2 font-bold">System Warnings</h2>
                  <ul className="grid gap-2">
                    {dashboard.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        ) : null}
        {(workItem || workItemLoading) && (
          <WorkItemPanel
            item={workItem}
            loading={workItemLoading}
            onClose={() => router.replace('/admin', { scroll: false })}
          />
        )}
      </div>
    </section>
  );
}

function TaskSummary({ item }: { item: any }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
      <div>
        <p className="font-bold text-navy">{item.title}</p>
        <p>{item.patient_name || item.request}</p>
        <p className="text-xs text-text-light">
          {item.service} - {String(item.state).replace(/_/g, ' ')} - {item.owner}
        </p>
      </div>
      <div className="text-right">
        <p className={item.overdue ? 'font-bold text-danger' : 'font-semibold'}>
          {item.overdue
            ? 'Overdue'
            : item.due_at
              ? new Date(item.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
              : 'No due time'}
        </p>
        <p className="text-xs font-bold text-accent">
          Next: {String(item.next_action).replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  );
}

function WorkItemPanel({
  item,
  loading,
  onClose,
}: {
  item: any;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close work item"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl"
        aria-label="Unified work item detail"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-navy">Unified Work Item</h2>
            <p className="text-xs text-text-light">One authoritative view for the next decision.</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {loading || !item ? (
          <p role="status" className="mt-6">
            Loading work item...
          </p>
        ) : (
          <div className="mt-6 grid gap-3 text-sm">
            <WorkField label="Patient" value={item.patient?.name || 'Not linked'} />
            <WorkField label="Requested" value={item.request} />
            <WorkField label="Source page / form" value={item.source} />
            <WorkField
              label="Doctor / package / test"
              value={
                Array.isArray(item.doctor_or_service)
                  ? item.doctor_or_service.join(', ')
                  : item.doctor_or_service
              }
            />
            <WorkField
              label="Payment verified"
              value={`${item.payment?.verified ? 'Yes' : 'No'} - ${String(item.payment?.status || 'not started').replace(/_/g, ' ')}`}
            />
            <WorkField label="Current state" value={String(item.state).replace(/_/g, ' ')} />
            <WorkField label="Owner" value={item.owner} />
            <WorkField
              label="Due"
              value={
                item.due_at
                  ? new Date(item.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                  : 'Not assigned'
              }
            />
            <WorkField
              label="Next action"
              value={
                (item.next_actions || [])
                  .map((action: string) => action.replace(/_/g, ' '))
                  .join(', ') || 'Review'
              }
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {item.links?.patient && (
                <Link className="btn btn-outline" href={item.links.patient}>
                  Open patient journey
                </Link>
              )}
              {item.links?.service && (
                <Link className="btn btn-primary" href={item.links.service}>
                  Open service workflow
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function WorkField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-alt p-3">
      <p className="text-xs font-bold uppercase text-text-light">{label}</p>
      <p className="mt-1 font-semibold">{value || '-'}</p>
    </div>
  );
}

function StatusSelect({
  row,
  updatingId,
  onStatus,
}: {
  row: any;
  updatingId: string | null;
  onStatus: (row: any, action: string) => void;
}) {
  return (
    <select
      className="min-w-36 rounded-md border border-border px-2 py-2 text-sm"
      value=""
      disabled={updatingId === row.id}
      onChange={(event) => event.target.value && onStatus(row, event.target.value)}
    >
      <option value="">{updatingId === row.id ? 'Updating...' : 'Update'}</option>
      {(row.allowed_actions || []).map((action: string) => (
        <option key={action} value={action}>
          {action.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}

function AppointmentCard({
  row,
  updatingId,
  onStatus,
}: {
  row: any;
  updatingId: string | null;
  onStatus: (row: any, action: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-navy">
            {String(row.start_time || '-').slice(0, 5)} · {row.patient_name}
          </p>
          <p className="text-sm text-text-light">
            {row.doctor_name} · {row.phone_masked || '-'}
          </p>
        </div>
        <StatusBadge tone={statusTone(row.status)}>
          {String(row.status || '-').replace(/_/g, ' ')}
        </StatusBadge>
      </div>
      <div className="mt-3">
        <StatusSelect row={row} updatingId={updatingId} onStatus={onStatus} />
      </div>
    </div>
  );
}

function IssuePanel({
  title,
  icon,
  rows,
  href,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: any[];
  href: string;
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          {icon}
          <h2 className="font-bold">{title}</h2>
        </div>
        <Link href={href} className="text-xs font-bold text-accent">
          View all
        </Link>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border p-3 text-sm">
            <p className="font-semibold text-navy">
              {row.order_number ||
                row.appointment_number ||
                row.receipt_number ||
                row.merchant_transaction_id ||
                row.template ||
                'Issue'}
            </p>
            <p className="mt-1 text-text-light">
              {String(row.status || '-').replace(/_/g, ' ')}
              {row.amount ? ` · ${money(row.amount)}` : ''}
            </p>
            {(row.error || row.phone_masked || row.destination_masked) && (
              <p className="mt-1 line-clamp-2 text-xs text-text-light">
                {row.error || row.phone_masked || row.destination_masked}
              </p>
            )}
          </div>
        ))}
        {rows.length === 0 && <EmptyState text={empty} />}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-4 text-sm text-text-light">{text}</p>;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="grid gap-6 xl:col-span-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-80 rounded-lg bg-white shadow-sm" />
      </div>
      <div className="grid gap-6 xl:col-span-4">
        <div className="h-48 rounded-lg bg-white shadow-sm" />
        <div className="h-48 rounded-lg bg-white shadow-sm" />
      </div>
    </div>
  );
}
