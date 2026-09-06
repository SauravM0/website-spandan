'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { CheckSquare, RefreshCw, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  bulkRetryAdminNotifications,
  deadLetterAdminNotification,
  getAdminNotificationDetail,
  getAdminNotifications,
  retryAdminNotification,
} from '@/lib/api';
import {
  AdminDrawer,
  AdminPageHeader,
  FilterBar,
  Pagination,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import Button from '@/components/ui/Button';

const statuses = [
  '',
  'queued',
  'sending',
  'sent',
  'failed',
  'skipped_no_destination',
  'retrying',
  'permanent_failure',
  'manual_follow_up',
];
const channels = ['', 'email'];
const entities = ['', 'appointment', 'package_order', 'payment'];
const sortOptions = [
  ['date_desc', 'Newest'],
  ['date_asc', 'Oldest'],
  ['updated_desc', 'Recently updated'],
  ['updated_asc', 'Least recently updated'],
];

type NotificationFilters = {
  status: string;
  channel: string;
  entity: string;
  from: string;
  to: string;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
};

function filtersFromParams(params: URLSearchParams): NotificationFilters {
  return {
    status: params.get('status') || '',
    channel: params.get('channel') || '',
    entity: params.get('entity') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    search: params.get('search') || '',
    sort: params.get('sort') || 'date_desc',
    page: Number(params.get('page') || 1),
    pageSize: Number(params.get('pageSize') || 25),
  };
}

function queryFromFilters(filters: NotificationFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === undefined) return;
    if (key === 'page' && value === 1) return;
    if (key === 'pageSize' && value === 25) return;
    params.set(key, String(value));
  });
  return params.toString();
}

function label(value: unknown) {
  return String(value || '-').replace(/_/g, ' ');
}

function dateTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'sent') return 'success';
  if (
    ['failed', 'permanent_failure', 'manual_follow_up', 'skipped_no_destination'].includes(status)
  )
    return 'danger';
  if (['queued', 'sending', 'retrying'].includes(status)) return 'warning';
  return 'neutral';
}

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: React.ReactNode;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'warning'
          ? 'text-amber-800'
          : 'text-ink';
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-semibold uppercase text-text-light">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function History({ history }: { history: any[] }) {
  if (!history.length)
    return <p className="rounded-lg bg-bg-alt p-4 text-sm text-text-light">No history recorded.</p>;
  return (
    <ol className="grid gap-3">
      {history.map((item) => (
        <li key={`${item.type}-${item.id}`} className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold capitalize text-ink">
                {label(item.action || item.type)}
              </p>
              <p className="mt-1 text-sm text-text-light">
                {item.status ? `Status: ${label(item.status)}` : 'Recorded'}
                {item.attempt_count !== undefined ? ` / attempts: ${item.attempt_count}` : ''}
              </p>
              {item.reason && <p className="mt-1 text-xs text-text-light">{item.reason}</p>}
              {item.error && <p className="mt-1 text-xs text-danger">{item.error}</p>}
            </div>
            <span className="shrink-0 text-xs text-text-light">{dateTime(item.created_at)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NotificationsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<NotificationFilters>(() =>
    filtersFromParams(searchParams)
  );
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<{ notification: any; history: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retryingId, setRetryingId] = useState('');
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [deadLetterReason, setDeadLetterReason] = useState('');
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<NotificationFilters>) => {
      setFilters((current) => {
        const next = { ...current, ...patch, page: patch.page ?? 1 };
        const query = queryFromFilters(next);
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        return next;
      });
    },
    [pathname, router]
  );

  const load = useCallback(
    async (nextFilters = filters, keepVisible = true) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setError('');
      if (keepVisible) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await getAdminNotifications('', nextFilters);
        if (requestRef.current !== requestId) return;
        setNotifications(data.notifications || []);
        setPagination(
          data.pagination || {
            page: nextFilters.page,
            pageSize: nextFilters.pageSize,
            total: 0,
            totalPages: 1,
          }
        );
        setSummary(data.summary || {});
        setSelectedIds([]);
      } catch (err) {
        if (requestRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : 'Could not load notifications.');
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          hasLoadedRef.current = true;
        }
      }
    },
    [filters]
  );

  useEffect(() => {
    load(filters, hasLoadedRef.current);
  }, [filters, load]);

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDeadLetterReason('');
    try {
      setDetail(await getAdminNotificationDetail('', id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notification detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const retry = async (id: string) => {
    setRetryingId(id);
    setError('');
    setMessage('');
    try {
      await retryAdminNotification('', id);
      setMessage('Notification queued for retry.');
      await load(filters, true);
      if (selectedId === id) setDetail(await getAdminNotificationDetail('', id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notification retry failed.');
    } finally {
      setRetryingId('');
    }
  };

  const bulkRetry = async () => {
    setBulkRetrying(true);
    setError('');
    setMessage('');
    try {
      const data = await bulkRetryAdminNotifications('', selectedIds);
      const ok = data.results.filter((item) => item.ok).length;
      const failed = data.results.length - ok;
      setMessage(`${ok} notification(s) queued${failed ? `, ${failed} skipped` : ''}.`);
      await load(filters, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk retry failed.');
    } finally {
      setBulkRetrying(false);
    }
  };

  const deadLetter = async () => {
    if (!selectedId || deadLetterReason.trim().length < 3) return;
    setError('');
    try {
      await deadLetterAdminNotification('', selectedId, deadLetterReason);
      setMessage('Notification moved to manual follow-up.');
      await load(filters, true);
      setDetail(await getAdminNotificationDetail('', selectedId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not move notification to manual follow-up.'
      );
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const selectedDetail =
    detail?.notification || notifications.find((item) => item.id === selectedId);
  const noRecords =
    !loading &&
    !notifications.length &&
    !filters.search &&
    !filters.status &&
    !filters.channel &&
    !filters.entity &&
    !filters.from &&
    !filters.to;

  const table = notifications.length ? (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-alt">
            {[
              '',
              'Created',
              'Channel',
              'Template',
              'Destination',
              'Reference',
              'Status',
              'Attempts',
              'Action',
            ].map((item) => (
              <th key={item || 'select'} className="p-3">
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {notifications.map((item) => (
            <tr key={item.id} className="border-b border-border align-top hover:bg-bg-alt">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`Select ${item.template}`}
                />
              </td>
              <td className="p-3 text-xs text-text-light">{dateTime(item.created_at)}</td>
              <td className="p-3 capitalize">{item.channel}</td>
              <td className="p-3">
                <button
                  type="button"
                  className="text-left font-semibold text-ink hover:text-accent"
                  onClick={() => loadDetail(item.id)}
                >
                  {label(item.template)}
                </button>
              </td>
              <td className="p-3">
                {item.destination_masked || <span className="text-text-light">No destination</span>}
              </td>
              <td className="p-3">
                {item.receipt_number || item.order_number || item.appointment_number || '-'}
              </td>
              <td className="p-3">
                <StatusBadge tone={statusTone(item.status)}>{label(item.status)}</StatusBadge>
                {item.error && (
                  <p className="mt-1 max-w-[260px] text-xs text-danger">{item.error}</p>
                )}
                {!item.retry_eligible && item.retry_ineligible_reason && (
                  <p className="mt-1 max-w-[260px] text-xs text-text-light">
                    {item.retry_ineligible_reason}
                  </p>
                )}
              </td>
              <td className="p-3">
                {item.attempt_count || 0}/{item.max_attempts || 3}
              </td>
              <td className="p-3">
                <Button
                  variant="outline"
                  className="min-h-11 px-3 py-2 text-xs"
                  onClick={() => retry(item.id)}
                  disabled={!item.retry_eligible || retryingId === item.id}
                >
                  {retryingId === item.id ? 'Retrying' : 'Retry'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const cards = notifications.length
    ? notifications.map((item) => (
        <article key={item.id} className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              className="text-left font-semibold text-ink"
              onClick={() => loadDetail(item.id)}
            >
              {label(item.template)}
            </button>
            <StatusBadge tone={statusTone(item.status)}>{label(item.status)}</StatusBadge>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-text-light">
            <p>
              <strong className="text-text">Destination:</strong>{' '}
              {item.destination_masked || 'No destination'}
            </p>
            <p>
              <strong className="text-text">Reference:</strong>{' '}
              {item.receipt_number || item.order_number || item.appointment_number || '-'}
            </p>
            <p>
              <strong className="text-text">Attempts:</strong> {item.attempt_count || 0}/
              {item.max_attempts || 3}
            </p>
            <p>
              <strong className="text-text">Created:</strong> {dateTime(item.created_at)}
            </p>
            {item.error && <p className="text-danger">{item.error}</p>}
          </div>
          <div className="mt-4 flex flex-col gap-2 min-[390px]:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => toggleSelect(item.id)}
            >
              {selectedIds.includes(item.id) ? 'Selected' : 'Select'}
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="flex-1"
              onClick={() => retry(item.id)}
              disabled={!item.retry_eligible || retryingId === item.id}
            >
              {retryingId === item.id ? 'Retrying' : 'Retry'}
            </Button>
          </div>
          {!item.retry_eligible && item.retry_ineligible_reason && (
            <p className="mt-2 text-xs text-text-light">{item.retry_ineligible_reason}</p>
          )}
        </article>
      ))
    : null;

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <AdminPageHeader
          title="Notifications"
          description="Review masked clinic messages, retry only eligible failures, and move manual cases out of the worker queue."
          action={
            <Button
              variant="outline"
              onClick={bulkRetry}
              disabled={!selectedIds.length || bulkRetrying}
            >
              <CheckSquare size={16} />
              {bulkRetrying ? 'Retrying...' : `Retry Selected (${selectedIds.length})`}
            </Button>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Matched" value={summary.total ?? pagination.total} />
          <SummaryCard title="Queued" value={summary.queued ?? 0} tone="warning" />
          <SummaryCard title="Failed" value={summary.failed ?? 0} tone="danger" />
          <SummaryCard title="Sent" value={summary.sent ?? 0} tone="success" />
        </div>

        <FilterBar>
          <label className="form-group mb-0">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              {statuses.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? label(item) : 'All statuses'}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Channel</span>
            <select
              value={filters.channel}
              onChange={(event) => updateFilters({ channel: event.target.value })}
            >
              {channels.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item || 'All channels'}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Entity</span>
            <select
              value={filters.entity}
              onChange={(event) => updateFilters({ entity: event.target.value })}
            >
              {entities.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? label(item) : 'All entities'}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value })}
            >
              {sortOptions.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => updateFilters({ from: event.target.value })}
            />
          </label>
          <label className="form-group mb-0">
            <span>To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => updateFilters({ to: event.target.value })}
            />
          </label>
          <label className="form-group mb-0">
            <span>Rows</span>
            <select
              value={filters.pageSize}
              onChange={(event) => updateFilters({ pageSize: Number(event.target.value) })}
            >
              {[25, 50].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-3.5 text-text-light" size={16} />
              <input
                className="pl-9"
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Template or reference"
              />
            </span>
          </label>
        </FilterBar>

        {message && (
          <p className="mb-4 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        {loading && !notifications.length ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : (
          <>
            {refreshing && (
              <p className="mb-3 text-sm text-text-light">Refreshing notification queue...</p>
            )}
            <ResponsiveDataView
              table={table}
              cards={cards}
              empty={
                <p className="rounded-lg border border-border bg-white p-6 text-sm text-text-light">
                  {noRecords
                    ? 'No notifications have been queued yet.'
                    : 'No notifications match these filters.'}
                </p>
              }
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => updateFilters({ page })}
            />
            <p className="mt-3 text-xs text-text-light">
              Showing {notifications.length} of {pagination.total} matched notification(s).
              Destinations are masked and raw payloads are not shown.
            </p>
          </>
        )}

        {selectedId && (
          <AdminDrawer
            label="Notification detail"
            onClose={() => {
              setSelectedId('');
              setDetail(null);
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink">Notification detail</h2>
                <p className="text-sm text-text-light">
                  {selectedDetail ? label(selectedDetail.template) : selectedId}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedId('');
                  setDetail(null);
                }}
              >
                <X size={16} />
                Close
              </Button>
            </div>

            {detailLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-bg-alt" />
            ) : selectedDetail ? (
              <>
                <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <Detail
                    label="Status"
                    value={
                      <StatusBadge tone={statusTone(selectedDetail.status)}>
                        {label(selectedDetail.status)}
                      </StatusBadge>
                    }
                  />
                  <Detail
                    label="Destination"
                    value={selectedDetail.destination_masked || 'No destination'}
                  />
                  <Detail label="Channel" value={selectedDetail.channel || '-'} />
                  <Detail
                    label="Attempts"
                    value={`${selectedDetail.attempt_count || 0}/${selectedDetail.max_attempts || 3}`}
                  />
                  <Detail
                    label="Reference"
                    value={
                      selectedDetail.receipt_number ||
                      selectedDetail.order_number ||
                      selectedDetail.appointment_number ||
                      '-'
                    }
                  />
                  <Detail label="Next attempt" value={dateTime(selectedDetail.next_attempt_at)} />
                </div>

                {selectedDetail.payload_preview && (
                  <div className="mt-4 rounded-lg border border-border p-4 text-sm text-text-light">
                    <h3 className="font-bold text-ink">Redacted preview</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedDetail.payload_preview).map(([key, value]) =>
                        value ? (
                          <p key={key}>
                            <strong className="text-text">{label(key)}:</strong> {String(value)}
                          </p>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2 min-[390px]:flex-row">
                  <Button
                    variant="accent"
                    className="flex-1"
                    onClick={() => retry(selectedDetail.id)}
                    disabled={!selectedDetail.retry_eligible || retryingId === selectedDetail.id}
                  >
                    <RefreshCw size={16} />
                    {retryingId === selectedDetail.id ? 'Retrying...' : 'Retry Notification'}
                  </Button>
                </div>
                {!selectedDetail.retry_eligible && selectedDetail.retry_ineligible_reason && (
                  <p className="mt-2 rounded-md bg-bg-alt p-3 text-sm text-text-light">
                    {selectedDetail.retry_ineligible_reason}
                  </p>
                )}

                <div className="mt-6 rounded-lg border border-border p-4">
                  <h3 className="font-bold text-ink">Manual follow-up</h3>
                  <p className="mt-1 text-sm text-text-light">
                    Use this when the worker should stop retrying and staff must contact the patient
                    another way.
                  </p>
                  <textarea
                    className="mt-3 w-full rounded-lg border border-border p-3"
                    value={deadLetterReason}
                    onChange={(event) => setDeadLetterReason(event.target.value)}
                    placeholder="Reason for manual follow-up"
                  />
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={deadLetter}
                    disabled={
                      deadLetterReason.trim().length < 3 || selectedDetail.status === 'sent'
                    }
                  >
                    Move to Manual Follow-up
                  </Button>
                </div>

                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-bold text-ink">History</h3>
                  <History history={detail?.history || []} />
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-bg-alt p-4 text-sm text-text-light">
                Select a notification to view details.
              </p>
            )}
          </AdminDrawer>
        )}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-text-light">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  return (
    <Suspense
      fallback={
        <section className="py-8">
          <div className="container">Loading notifications...</div>
        </section>
      }
    >
      <NotificationsInner />
    </Suspense>
  );
}
