'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, RefreshCw, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  downloadAdminExport,
  getAdminPaymentDetail,
  getAdminPayments,
  recheckAdminPayment,
  requestAdminPaymentRefund,
} from '@/lib/api';
import {
  AdminPageHeader,
  FilterBar,
  Pagination,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import { browserApiUrl } from '@/lib/apiUrl';
import { useAdminRealtimeRefresh } from '@/lib/adminRealtime';

const statuses = [
  '',
  'created',
  'pending',
  'success',
  'failed',
  'expired',
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
  page: number;
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
  if (['failed', 'expired', 'disputed'].includes(status)) return 'danger';
  if (['pending', 'created', 'verification_required'].includes(status)) return 'warning';
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
    page: Number(params.get('page') || 1),
    pageSize: Number(params.get('pageSize') || 25),
  };
}

function queryFromFilters(filters: PaymentFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === undefined) return;
    if (key === 'page' && value === 1) return;
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
          : 'text-navy';
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
              <p className="font-semibold capitalize text-navy">
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PaymentFilters>(() => filtersFromParams(searchParams));
  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<{ payment: any; events: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [recheckingId, setRecheckingId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundPreview, setRefundPreview] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<PaymentFilters>) => {
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
        const data = await getAdminPayments('', nextFilters);
        if (requestRef.current !== requestId) return;
        setPayments(data.payments || []);
        setPagination(
          data.pagination || {
            page: nextFilters.page,
            pageSize: nextFilters.pageSize,
            total: 0,
            totalPages: 1,
          }
        );
        setSummary(data.summary || {});
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
    [filters]
  );

  useAdminRealtimeRefresh(['payment.changed'], () => void load(filters, true));

  useEffect(() => {
    load(filters, hasLoadedRef.current);
  }, [filters, load]);

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
                  className="text-left font-semibold text-navy hover:text-accent"
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
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => recheck(payment.id)}
                  disabled={recheckingId === payment.id}
                >
                  <RefreshCw size={14} />
                  {recheckingId === payment.id ? 'Checking' : 'Recheck'}
                </button>
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
              className="text-left font-semibold text-navy"
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
              <a
                className="btn btn-outline btn-sm flex-1"
                href={receiptUrl(payment.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Receipt
              </a>
            ) : (
              <span className="btn btn-sm flex-1 cursor-not-allowed bg-bg-alt text-text-light">
                No receipt
              </span>
            )}
            <button
              type="button"
              className="btn btn-accent btn-sm flex-1"
              onClick={() => recheck(payment.id)}
              disabled={recheckingId === payment.id}
            >
              {recheckingId === payment.id ? 'Checking' : 'Recheck'}
            </button>
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
              <Link className="btn btn-accent" href="/admin/payments/pricing">
                Service Pricing
              </Link>
              <button
                className="btn btn-outline"
                type="button"
                onClick={exportCsv}
                disabled={exporting}
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Matched payments" value={summary.total ?? pagination.total} />
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
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => updateFilters({ page })}
            />
            <p className="mt-3 text-xs text-text-light">
              Showing {payments.length} of {pagination.total} matched payment(s). All amounts and
              states come from the backend payment record.
            </p>
          </>
        )}

        {selectedId && (
          <div className="fixed inset-0 z-50 bg-black/40">
            <aside className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-navy">Payment detail</h2>
                  <p className="text-sm text-text-light">
                    {selectedPayment
                      ? maskRef(selectedPayment.merchant_transaction_id)
                      : selectedId}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setSelectedId('');
                    setDetail(null);
                  }}
                >
                  <X size={16} />
                  Close
                </button>
              </div>

              {detailLoading ? (
                <div className="h-40 animate-pulse rounded-lg bg-bg-alt" />
              ) : selectedPayment ? (
                <>
                  <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                    <Detail label="Amount" value={money(selectedPayment.amount)} />
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
                  </div>

                  <div className="mt-4 flex flex-col gap-2 min-[390px]:flex-row">
                    {selectedPayment.pdf_url ? (
                      <a
                        className="btn btn-outline flex-1"
                        href={receiptUrl(selectedPayment.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={16} />
                        Open Receipt
                      </a>
                    ) : (
                      <span className="btn flex-1 cursor-not-allowed bg-bg-alt text-text-light">
                        Receipt not generated
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-accent flex-1"
                      onClick={() => recheck(selectedPayment.id)}
                      disabled={recheckingId === selectedPayment.id}
                    >
                      <RefreshCw size={16} />
                      {recheckingId === selectedPayment.id
                        ? 'Checking...'
                        : 'Safe Provider Recheck'}
                    </button>
                  </div>

                  {selectedPayment.status === 'success' && (
                    <section
                      className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4"
                      aria-labelledby="refund-heading"
                    >
                      <h3 id="refund-heading" className="font-bold text-navy">
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
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={
                              Number(refundAmount) <= 0 ||
                              Number(refundAmount) > Number(selectedPayment.amount) ||
                              refundReason.trim().length < 10
                            }
                            onClick={() => setRefundPreview(true)}
                          >
                            Review refund request
                          </button>
                        ) : (
                          <div
                            className="rounded-lg border border-amber-400 bg-white p-3"
                            role="alert"
                          >
                            <p className="font-semibold">
                              Confirm request for {money(refundAmount)}
                            </p>
                            <p className="mt-1 text-sm">Reason: {refundReason}</p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                className="btn btn-accent"
                                disabled={refundSubmitting}
                                onClick={submitRefundRequest}
                              >
                                {refundSubmitting ? 'Recording...' : 'Record refund request'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setRefundPreview(false)}
                              >
                                Go back
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  <div className="mt-6">
                    <h3 className="mb-3 text-lg font-bold text-navy">Timeline</h3>
                    <PaymentTimeline events={detail?.events || []} />
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-bg-alt p-4 text-sm text-text-light">
                  Select a payment to view details.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-text-light">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-navy">{value}</div>
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
