'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, RefreshCw, Search, Settings, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  downloadAdminExport,
  getAdminPaymentDetail,
  getAdminPayments,
  getAdminPaymentsSummary,
  recheckAdminPayment,
  requestAdminPaymentRefund,
  verifyAdminDirectUpiPayment,
  adminPaymentEvidenceUrl,
} from '@/lib/api';
import {
  AdminDrawer,
  AdminPageHeader,
  CursorPagination,
  FilterBar,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import { browserApiUrl } from '@/lib/apiUrl';
import { useAdminRealtimeRefresh } from '@/lib/adminRealtime';
import type { AdminPayment } from '@/lib/types';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { confirmAdminAction, promptAdminAction } from '@/lib/adminDialogs';
import Button from '@/components/ui/Button';

const statuses = [
  '',
  'created',
  'pending',
  'payment_initiated',
  'verification_pending',
  'clarification_requested',
  'success',
  'failed',
  'cancelled',
  'expired',
  'rejected',
  'amount_mismatch',
  'duplicate_transaction',
  'verification_required',
  'refunded',
  'disputed',
];
const entityFilters = ['', 'appointment', 'package_order'];
const sortOptions = [
  ['date_desc', 'Newest payment'],
  ['date_asc', 'Oldest payment'],
  ['updated_desc', 'Recently updated'],
  ['amount_desc', 'Highest amount'],
  ['amount_asc', 'Lowest amount'],
];
type PaymentFilters = {
  status: string;
  from: string;
  to: string;
  search: string;
  provider: string;
  entity: string;
  sort: string;
  pageSize: number;
};

function receiptUrl(paymentId?: string | null) {
  if (!paymentId) return '';
  return browserApiUrl(`/api/admin/operations/payments/${encodeURIComponent(paymentId)}/receipt`);
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function dateTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function label(value: unknown) {
  return String(value || '-').replace(/_/g, ' ');
}

function maskRef(value: unknown) {
  const text = String(value || '');
  if (!text) return '-';
  if (text.length <= 10) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'success') return 'success';
  if (['failed', 'expired', 'rejected', 'duplicate_transaction', 'disputed'].includes(status)) return 'danger';
  if (['pending', 'created', 'payment_initiated', 'verification_pending', 'clarification_requested', 'amount_mismatch', 'verification_required'].includes(status)) return 'warning';
  if (status === 'refunded') return 'info';
  return 'neutral';
}

function filtersFromParams(params: URLSearchParams): PaymentFilters {
  return {
    status: params.get('status') || '',
    from: params.get('from') || new Date().toISOString().slice(0, 10),
    to: params.get('to') || '',
    search: params.get('search') || '',
    provider: params.get('provider') || '',
    entity: params.get('entity') || '',
    sort: params.get('sort') || 'date_desc',
    pageSize: Number(params.get('pageSize') || 25),
  };
}

function queryFromFilters(filters: PaymentFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === undefined) return;
    if (key === 'pageSize' && value === 25) return;
    params.set(key, String(value));
  });
  return params.toString();
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
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
      <p className="text-xs font-semibold uppercase text-text-light">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PaymentTimeline({ events }: { events: any[] }) {
  if (!events.length) {
    return (
      <p className="rounded-lg bg-bg-alt p-4 text-sm text-text-light">
        No payment events recorded yet.
      </p>
    );
  }

  return (
    <ol className="grid gap-3">
      {events.map((event) => (
        <li key={`${event.type}-${event.id}`} className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold capitalize text-ink">
                {label(event.event_name || event.action || event.type)}
              </p>
              <p className="mt-1 text-sm text-text-light">
                {event.status ? `Status: ${label(event.status)}` : 'Recorded'}
                {event.provider ? ` via ${event.provider}` : ''}
              </p>
              {event.provider_transaction_id && (
                <p className="mt-1 text-xs text-text-light">
                  Provider ref {maskRef(event.provider_transaction_id)}
                </p>
              )}
              {event.error && <p className="mt-1 text-xs text-danger">{event.error}</p>}
            </div>
            <span className="shrink-0 text-xs text-text-light">{dateTime(event.created_at)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PaymentsInner() {
  const { hasCapability } = useAdminSession();
  const canVerify = hasCapability('admin.payments.verify');
  const canViewEvidence = hasCapability('admin.payment_evidence.read');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PaymentFilters>(() => filtersFromParams(searchParams));
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, hasMore: false });
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<{ payment: any; events: any[]; evidence?: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [recheckingId, setRecheckingId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundPreview, setRefundPreview] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const [verificationBusy, setVerificationBusy] = useState('');
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
    setCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
    setPagination((current) => ({ ...current, page: 1, hasMore: false }));
  }, [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<PaymentFilters>) => {
      setFilters((current) => {
        const next = { ...current, ...patch };
        const query = queryFromFilters(next);
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        setCursor(null);
        setNextCursor(null);
        setCursorHistory([]);
        setPagination((paging) => ({ ...paging, page: 1, hasMore: false }));
        return next;
      });
    },
    [pathname, router]
  );

  const load = useCallback(
    async (nextFilters = filters, keepVisible = true, pageCursor: string | null = cursor) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setError('');
      if (keepVisible) setRefreshing(true);
      else setLoading(true);
      try {
        const [data, summaryResult] = await Promise.all([
          getAdminPayments('', { ...nextFilters, cursor: pageCursor || undefined }),
          pageCursor ? Promise.resolve(null) : getAdminPaymentsSummary(nextFilters),
        ]);
        if (requestRef.current !== requestId) return;
        setPayments(data.payments || []);
        setPagination((current) => ({
          ...current,
          pageSize: data.pagination?.pageSize || nextFilters.pageSize,
          hasMore: Boolean(data.pagination?.hasMore),
        }));
        setNextCursor(data.cursor || null);
        if (summaryResult) setSummary(summaryResult.summary || {});
      } catch (err) {
        if (requestRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : 'Could not load payments.');
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          hasLoadedRef.current = true;
        }
      }
    },
    [cursor, filters]
  );

  useAdminRealtimeRefresh(['payment.changed'], () => void load(filters, true, cursor));

  useEffect(() => {
    load(filters, hasLoadedRef.current, cursor);
  }, [cursor, filters, load]);

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

  const loadDetail = async (paymentId: string) => {
    setSelectedId(paymentId);
    setDetailLoading(true);
    try {
      const data = await getAdminPaymentDetail('', paymentId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payment detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const recheck = async (paymentId: string) => {
    setRecheckingId(paymentId);
    setError('');
    try {
      const data = await recheckAdminPayment('', paymentId);
      if (selectedId === paymentId) setDetail(data);
      await load(filters, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment recheck failed.');
    } finally {
      setRecheckingId('');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAdminExport('', 'payments', {
        status: filters.status,
        from: filters.from,
        to: filters.to,
        search: filters.search,
        provider: filters.provider,
        entity: filters.entity,
        sort: filters.sort,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const submitRefundRequest = async () => {
    if (!selectedPayment) return;
    setRefundSubmitting(true);
    setError('');
    setRefundMessage('');
    try {
      const result = await requestAdminPaymentRefund(
        '',
        selectedPayment.id,
        Number(refundAmount),
        refundReason
      );
      setRefundMessage(result.message);
      setRefundPreview(false);
      setRefundAmount('');
      setRefundReason('');
      await loadDetail(selectedPayment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund request failed.');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const selectedPayment = detail?.payment || payments.find((payment) => payment.id === selectedId);
  const verifyPayment = async (
    action: 'confirm' | 'reject' | 'amount_mismatch' | 'duplicate' | 'request_clarification'
  ) => {
    if (!selectedPayment) return;
    const reason = await promptAdminAction({
      title: action === 'confirm' ? 'Confirm Direct UPI payment' : `Record ${label(action)}`,
      description:
        action === 'confirm'
          ? `Verify the clinic account entry for ${selectedPayment.public_order_reference || selectedPayment.merchant_transaction_id}, UTR ${selectedPayment.utr || '-'}, and ${money(selectedPayment.amount)}.`
          : 'Enter the audited reason for this decision.',
      label: 'Verification note',
      multiline: true,
      minLength: 10,
      danger: action !== 'confirm',
    });
    if (!reason) return;
    let observedAmountPaisa: number | undefined =
      action === 'confirm' ? Number(selectedPayment.amount_paisa) : undefined;
    let duplicateOfPaymentId: string | undefined;
    if (action === 'amount_mismatch') {
      const observed = await promptAdminAction({
        title: 'Observed bank amount',
        description: `Expected ${money(selectedPayment.amount)}. Enter the amount actually observed in INR.`,
        label: 'Observed amount (INR)',
        defaultValue: String(selectedPayment.amount),
      });
      if (observed === null || !Number.isFinite(Number(observed)) || Number(observed) < 0) return;
      observedAmountPaisa = Math.round(Number(observed) * 100);
    }
    if (action === 'duplicate') {
      const canonical = await promptAdminAction({
        title: 'Canonical payment',
        description: 'Enter the internal payment ID that should remain canonical.',
        label: 'Canonical payment ID',
      });
      if (!canonical) return;
      duplicateOfPaymentId = canonical.trim();
    }
    const confirmed = await confirmAdminAction({
      title: 'Confirm audited payment action',
      description: `Apply ${label(action)} to ${selectedPayment.public_order_reference || selectedPayment.merchant_transaction_id}?`,
      confirmLabel: action === 'confirm' ? 'Confirm as paid' : 'Apply decision',
      danger: action !== 'confirm',
    });
    if (!confirmed) return;
    setVerificationBusy(action);
    setError('');
    try {
      await verifyAdminDirectUpiPayment(selectedPayment.id, {
        action,
        expected_version: Number(selectedPayment.status_version),
        reason,
        observed_amount_paisa: observedAmountPaisa,
        duplicate_of_payment_id: duplicateOfPaymentId,
      });
      await Promise.all([loadDetail(selectedPayment.id), load(filters, true)]);
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Verification action failed.');
    } finally {
      setVerificationBusy('');
    }
  };
  const noRecords =
    !loading &&
    !payments.length &&
    !filters.search &&
    !filters.status &&
    !filters.to &&
    !filters.provider &&
    !filters.entity;
  const rows = useMemo(() => payments, [payments]);

  const table = rows.length ? (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-alt">
            {[
              'Transaction',
              'Entity',
              'Amount',
              'Status',
              'Provider',
              'Receipt',
              'Updated',
              'Action',
            ].map((item) => (
              <th key={item} className="p-3">
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((payment) => (
            <tr key={payment.id} className="border-b border-border align-top hover:bg-bg-alt">
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => loadDetail(payment.id)}
                  className="text-left font-semibold text-ink hover:text-accent"
                >
                  {maskRef(payment.merchant_transaction_id)}
                </button>
                <p className="mt-1 text-xs text-text-light">{dateTime(payment.created_at)}</p>
              </td>
              <td className="p-3">
                <p>{payment.order_number || payment.appointment_number || '-'}</p>
                <p className="text-xs capitalize text-text-light">
                  {payment.order_id
                    ? 'package order'
                    : payment.appointment_id
                      ? 'appointment'
                      : 'unlinked'}
                </p>
              </td>
              <td className="p-3 font-semibold">{money(payment.amount)}</td>
              <td className="p-3">
                <StatusBadge tone={statusTone(payment.status)}>{label(payment.status)}</StatusBadge>
              </td>
              <td className="p-3">
                <p className="capitalize">{payment.provider || '-'}</p>
                <p className="text-xs text-text-light">{payment.payment_method || '-'}</p>
              </td>
              <td className="p-3">
                {payment.pdf_url ? (
                  <a
                    className="inline-flex items-center gap-1 font-semibold text-accent"
                    href={receiptUrl(payment.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-text-light">Not generated</span>
                )}
              </td>
              <td className="p-3 text-xs text-text-light">{dateTime(payment.updated_at)}</td>
              <td className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => recheck(payment.id)}
                  disabled={recheckingId === payment.id}
                >
                  <RefreshCw size={14} />
                  {recheckingId === payment.id ? 'Checking' : 'Recheck'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const cards = rows.length
    ? rows.map((payment) => (
        <article key={payment.id} className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => loadDetail(payment.id)}
              className="text-left font-semibold text-ink"
            >
              {maskRef(payment.merchant_transaction_id)}
            </button>
            <StatusBadge tone={statusTone(payment.status)}>{label(payment.status)}</StatusBadge>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-text-light">
            <p>
              <strong className="text-text">Entity:</strong>{' '}
              {payment.order_number || payment.appointment_number || '-'}
            </p>
            <p>
              <strong className="text-text">Amount:</strong> {money(payment.amount)}
            </p>
            <p>
              <strong className="text-text">Provider:</strong> {payment.provider || '-'} /{' '}
              {payment.payment_method || '-'}
            </p>
            <p>
              <strong className="text-text">Evidence:</strong>{' '}
              {payment.provider_evidence_source
                ? `${label(payment.provider_evidence_source)} at ${dateTime(payment.provider_observed_at)}`
                : payment.status === 'success'
                  ? 'Legacy payment — evidence not recorded'
                  : 'Awaiting provider confirmation'}
            </p>
            <p>
              <strong className="text-text">Updated:</strong> {dateTime(payment.updated_at)}
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2 min-[390px]:flex-row">
            {payment.pdf_url ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                href={receiptUrl(payment.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Receipt
              </Button>
            ) : (
              <span className="btn btn-sm flex-1 cursor-not-allowed bg-bg-alt text-text-light">
                No receipt
              </span>
            )}
            <Button
              variant="accent"
              size="sm"
              className="flex-1"
              onClick={() => recheck(payment.id)}
              disabled={recheckingId === payment.id}
            >
              {recheckingId === payment.id ? 'Checking' : 'Recheck'}
            </Button>
          </div>
        </article>
      ))
    : null;

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <AdminPageHeader
          title="Payments"
          description="Reconcile payment status, receipts, notifications, and provider events without exposing raw provider payloads."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" href="/admin/payments/pricing">
                Service Pricing
              </Button>
              <Button variant="outline" href="/admin/payments/settings">
                <Settings size={16} /> Payment Settings
              </Button>
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={exporting}
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Matched payments" value={summary.total ?? 0} />
          <SummaryCard label="Successful" value={summary.success ?? 0} tone="success" />
          <SummaryCard label="Pending review" value={summary.pending ?? 0} tone="warning" />
          <SummaryCard label="Issues" value={summary.issues ?? 0} tone="danger" />
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
            <span>Entity</span>
            <select
              value={filters.entity}
              onChange={(event) => updateFilters({ entity: event.target.value })}
            >
              {entityFilters.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? label(item) : 'All entities'}
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
            <span>Provider</span>
            <input
              value={filters.provider}
              onChange={(event) => updateFilters({ provider: event.target.value })}
              placeholder="phonepe"
            />
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
          <label className="form-group mb-0 sm:col-span-2 lg:col-span-1">
            <span>Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-3.5 text-text-light" size={16} />
              <input
                className="pl-9"
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Transaction, order, provider ref"
              />
            </span>
          </label>
        </FilterBar>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading && !payments.length ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : (
          <>
            {refreshing && (
              <p className="mb-3 text-sm text-text-light">Refreshing filtered results...</p>
            )}
            <ResponsiveDataView
              table={table}
              cards={cards}
              empty={
                <p className="rounded-lg border border-border bg-white p-6 text-sm text-text-light">
                  {noRecords
                    ? 'No payments have been recorded yet.'
                    : 'No payments match these filters.'}
                </p>
              }
            />
            <CursorPagination
              page={pagination.page}
              canPrevious={cursorHistory.length > 0}
              canNext={pagination.hasMore && Boolean(nextCursor)}
              onPrevious={previousPage}
              onNext={nextPage}
              itemLabel="payments"
              itemCount={payments.length}
            />
          </>
        )}

        {selectedId && (
          <AdminDrawer
            label="Payment detail"
            onClose={() => {
              setSelectedId('');
              setDetail(null);
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink">Payment detail</h2>
                <p className="text-sm text-text-light">
                  {selectedPayment ? maskRef(selectedPayment.merchant_transaction_id) : selectedId}
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
            ) : selectedPayment ? (
              <>
                <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <Detail label="Amount" value={money(selectedPayment.amount)} />
                  <Detail
                    label="Public reference"
                    value={selectedPayment.public_order_reference || '-'}
                  />
                  <Detail
                    label="Status"
                    value={
                      <StatusBadge tone={statusTone(selectedPayment.status)}>
                        {label(selectedPayment.status)}
                      </StatusBadge>
                    }
                  />
                  <Detail
                    label="Entity"
                    value={
                      selectedPayment.order_number || selectedPayment.appointment_number || '-'
                    }
                  />
                  <Detail
                    label="Provider"
                    value={`${selectedPayment.provider || '-'} / ${selectedPayment.payment_method || '-'}`}
                  />
                  <Detail
                    label="Provider reference"
                    value={maskRef(
                      selectedPayment.provider_reference || selectedPayment.provider_order_id
                    )}
                  />
                  <Detail
                    label="Success evidence"
                    value={
                      selectedPayment.provider_evidence_source
                        ? `${label(selectedPayment.provider_evidence_source)} at ${dateTime(selectedPayment.provider_observed_at)}`
                        : selectedPayment.status === 'success'
                          ? 'Legacy payment — evidence not recorded'
                          : 'Awaiting provider confirmation'
                    }
                  />
                  <Detail label="Updated" value={dateTime(selectedPayment.updated_at)} />
                  {selectedPayment.provider === 'direct_upi' && (
                    <>
                      <Detail label="Patient" value={selectedPayment.patient_name || '-'} />
                      <Detail label="Mobile" value={selectedPayment.patient_phone || '-'} />
                      <Detail label="Doctor / service" value={[selectedPayment.doctor_name, selectedPayment.service_name].filter(Boolean).join(' / ') || '-'} />
                      <Detail label="Submitted UTR" value={selectedPayment.utr || 'Not submitted'} />
                      <Detail label="Submitted" value={dateTime(selectedPayment.utr_submitted_at)} />
                      <Detail label="Verification note" value={selectedPayment.verification_note || '-'} />
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2 min-[390px]:flex-row">
                  {selectedPayment.pdf_url ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      href={receiptUrl(selectedPayment.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={16} />
                      Open Receipt
                    </Button>
                  ) : (
                    <span className="btn flex-1 cursor-not-allowed bg-bg-alt text-text-light">
                      Receipt not generated
                    </span>
                  )}
                  {selectedPayment.provider !== 'direct_upi' && (
                    <Button
                      variant="accent"
                      className="flex-1"
                      onClick={() => recheck(selectedPayment.id)}
                      disabled={recheckingId === selectedPayment.id}
                    >
                      <RefreshCw size={16} />
                      {recheckingId === selectedPayment.id ? 'Checking...' : 'Safe Provider Recheck'}
                    </Button>
                  )}
                </div>

                {selectedPayment.provider === 'direct_upi' &&
                  ['verification_pending', 'clarification_requested', 'amount_mismatch'].includes(selectedPayment.status) && (
                    <section className="mt-6 rounded-lg border border-border-strong bg-wash-sage p-4">
                      <h3 className="font-bold text-ink">Manual verification</h3>
                      <p className="mt-1 text-sm text-text-light">
                        Compare the frozen reference, exact amount, and UTR with the clinic bank or merchant UPI application.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="accent" size="sm" disabled={!canVerify || Boolean(verificationBusy)} onClick={() => verifyPayment('confirm')}>Confirm paid</Button>
                        <Button variant="outline" size="sm" disabled={!canVerify || Boolean(verificationBusy)} onClick={() => verifyPayment('request_clarification')}>Request clarification</Button>
                        <Button variant="outline" size="sm" disabled={!canVerify || Boolean(verificationBusy)} onClick={() => verifyPayment('amount_mismatch')}>Amount mismatch</Button>
                        <Button variant="outline" size="sm" disabled={!canVerify || Boolean(verificationBusy)} onClick={() => verifyPayment('duplicate')}>Mark duplicate</Button>
                        <Button variant="outline" size="sm" disabled={!canVerify || Boolean(verificationBusy)} onClick={() => verifyPayment('reject')}>Reject</Button>
                      </div>
                      {!canVerify && <p className="mt-3 text-xs text-text-light">Your role has read-only payment access.</p>}
                    </section>
                  )}

                {selectedPayment.provider === 'direct_upi' && (detail?.evidence?.length || 0) > 0 && (
                  <section className="mt-6">
                    <h3 className="mb-3 text-lg font-bold text-ink">Supporting evidence</h3>
                    <div className="grid gap-2">
                      {detail?.evidence?.map((item) => (
                        <a
                          key={item.id}
                          className={`rounded-lg border border-border p-3 text-sm ${canViewEvidence ? 'text-primary hover:bg-bg-alt' : 'pointer-events-none text-text-light'}`}
                          href={canViewEvidence ? adminPaymentEvidenceUrl(selectedPayment.id, item.id) : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.original_filename} · {item.status} · {Math.ceil(Number(item.byte_size) / 1024)} KB
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {selectedPayment.status === 'success' && (
                  <section
                    className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4"
                    aria-labelledby="refund-heading"
                  >
                    <h3 id="refund-heading" className="font-bold text-ink">
                      Request a refund
                    </h3>
                    <p className="mt-1 text-sm text-text-light">
                      This records an audited request only. A different authorized person must
                      approve it before provider processing.
                    </p>
                    {refundMessage && (
                      <p role="status" className="mt-3 text-sm font-semibold text-success">
                        {refundMessage}
                      </p>
                    )}
                    <div className="mt-3 grid gap-3">
                      <label className="form-group mb-0">
                        <span>Amount in INR</span>
                        <input
                          inputMode="decimal"
                          type="number"
                          min="0.01"
                          max={Number(selectedPayment.amount)}
                          step="0.01"
                          value={refundAmount}
                          onChange={(event) => {
                            setRefundAmount(event.target.value);
                            setRefundPreview(false);
                          }}
                        />
                      </label>
                      <label className="form-group mb-0">
                        <span>Operational reason (minimum 10 characters)</span>
                        <textarea
                          maxLength={500}
                          value={refundReason}
                          onChange={(event) => {
                            setRefundReason(event.target.value);
                            setRefundPreview(false);
                          }}
                        />
                      </label>
                      {!refundPreview ? (
                        <Button
                          variant="outline"
                          disabled={
                            Number(refundAmount) <= 0 ||
                            Number(refundAmount) > Number(selectedPayment.amount) ||
                            refundReason.trim().length < 10
                          }
                          onClick={() => setRefundPreview(true)}
                        >
                          Review refund request
                        </Button>
                      ) : (
                        <div
                          className="rounded-lg border border-amber-400 bg-white p-3"
                          role="alert"
                        >
                          <p className="font-semibold">Confirm request for {money(refundAmount)}</p>
                          <p className="mt-1 text-sm">Reason: {refundReason}</p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="accent"
                              disabled={refundSubmitting}
                              onClick={submitRefundRequest}
                            >
                              {refundSubmitting ? 'Recording...' : 'Record refund request'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setRefundPreview(false)}
                            >
                              Go back
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-bold text-ink">Timeline</h3>
                  <PaymentTimeline events={detail?.events || []} />
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-bg-alt p-4 text-sm text-text-light">
                Select a payment to view details.
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

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <section className="py-8">
          <div className="container">Loading payments...</div>
        </section>
      }
    >
      <PaymentsInner />
    </Suspense>
  );
}
