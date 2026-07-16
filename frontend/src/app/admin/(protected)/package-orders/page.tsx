'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  assignAdminPackageOrder,
  confirmAdminPackageOrderPrice,
  getAdminPackageOrderDetail,
  getAdminPackageOrders,
  transitionAdminPackageOrder,
} from '@/lib/api';
import { useAdminRealtimeRefresh } from '@/lib/adminRealtime';

const statuses = [
  '',
  'submitted',
  'price_review',
  'awaiting_payment',
  'paid',
  'scheduled',
  'collection_pending',
  'processing',
  'ready',
  'fulfilled',
  'cancelled',
  'refund_pending',
  'refunded',
];

const label = (value: unknown) => String(value || '-').replace(/_/g, ' ');
const money = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const dateTime = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-';

export default function AdminPackageOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = async (signal?: AbortSignal) => {
    const current = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await getAdminPackageOrders(
        '',
        {
          status: status || undefined,
          search: search.trim() || undefined,
          pageSize: 25,
        },
        signal
      );
      if (current === request.current) {
        setRows(result.data);
        setCursor(result.cursor);
      }
    } catch (err) {
      if (!signal?.aborted && current === request.current)
        setError(err instanceof Error ? err.message : 'Could not load package orders.');
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  useAdminRealtimeRefresh(['package_order.changed', 'payment.changed'], () => void load());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (search.trim()) query.set('search', search.trim());
      router.replace(`${pathname}${query.size ? `?${query}` : ''}`, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, router, search, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => load(controller.signal), 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, status]);

  const openDetail = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      setSelected(await getAdminPackageOrderDetail('', id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order detail.');
    } finally {
      setBusy(false);
    }
  };

  const refreshAfterCommand = async (id: string) => {
    await load();
    await openDetail(id);
  };

  const transition = async (action: string) => {
    if (!selected?.order) return;
    const reason = window.prompt(`Reason for ${label(action)}:`)?.trim();
    if (!reason || reason.length < 3) return;
    let scheduledFor: string | undefined;
    let fulfilmentNotes: string | undefined;
    if (action === 'schedule') {
      const local = window
        .prompt('Schedule date/time in ISO format with offset:', '2026-07-20T09:00:00+05:30')
        ?.trim();
      if (!local) return;
      scheduledFor = local;
    }
    if (action === 'fulfill') {
      fulfilmentNotes = window.prompt('Fulfilment notes:')?.trim();
    }
    setBusy(true);
    try {
      await transitionAdminPackageOrder('', selected.order.id, {
        action,
        expected_version: Number(selected.order.version),
        reason,
        scheduled_for: scheduledFor,
        fulfilment_notes: fulfilmentNotes,
      });
      await refreshAfterCommand(selected.order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order.');
    } finally {
      setBusy(false);
    }
  };

  const assignToMe = async () => {
    if (!selected?.order) return;
    const dueAt = window
      .prompt('Due date/time in ISO format with offset:', '2026-07-20T17:00:00+05:30')
      ?.trim();
    const reason = window.prompt('Assignment reason:')?.trim();
    if (!dueAt || !reason || reason.length < 3) return;
    setBusy(true);
    try {
      await assignAdminPackageOrder('', selected.order.id, {
        expected_version: Number(selected.order.version),
        due_at: dueAt,
        reason,
      });
      await refreshAfterCommand(selected.order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign order.');
    } finally {
      setBusy(false);
    }
  };

  const confirmPrices = async () => {
    if (!selected?.order || !selected.items?.length) return;
    const prices: Array<{ item_id: string; unit_price: number }> = [];
    for (const item of selected.items) {
      const price = Number(
        window.prompt(`Price for ${item.test_name_snapshot}:`, String(item.unit_price || ''))
      );
      if (!Number.isFinite(price) || price <= 0) return;
      prices.push({ item_id: item.id, unit_price: price });
    }
    const reason = window.prompt('Price confirmation reason:')?.trim();
    if (!reason || reason.length < 3) return;
    setBusy(true);
    try {
      await confirmAdminPackageOrderPrice('', selected.order.id, {
        expected_version: Number(selected.order.version),
        reason,
        items: prices,
      });
      await refreshAfterCommand(selected.order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm prices.');
    } finally {
      setBusy(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getAdminPackageOrders('', {
        status: status || undefined,
        search: search.trim() || undefined,
        cursor,
        pageSize: 25,
      });
      setRows((current) => [...current, ...result.data]);
      setCursor(result.cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more orders.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="py-8">
      <div className="container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Package Orders</h1>
          <p className="text-sm text-text-light">
            Owned, due-dated payment and fulfilment workflow.
          </p>
        </div>
        <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-3">
          <label className="form-group mb-0">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? label(item) : 'All statuses'}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0 md:col-span-2">
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number, purchaser, or phone prefix"
            />
          </label>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            {error}
          </div>
        )}
        {loading ? (
          <div
            aria-label="Loading package orders"
            className="h-64 animate-pulse rounded-lg bg-white"
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-alt">
                    {[
                      'Order',
                      'Purchaser',
                      'Items',
                      'Total',
                      'State',
                      'Owner / due',
                      'Next action',
                    ].map((heading) => (
                      <th key={heading} className="p-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.id} className="border-b border-border align-top">
                      <td className="p-3">
                        <button
                          className="font-semibold text-navy underline"
                          onClick={() => openDetail(order.id)}
                        >
                          {order.order_number}
                        </button>
                        <p className="text-xs capitalize">{label(order.order_type)}</p>
                      </td>
                      <td className="p-3">
                        {order.purchaser_name}
                        <p className="text-xs text-text-light">{order.phone_masked}</p>
                      </td>
                      <td className="p-3">{order.item_count || '-'}</td>
                      <td className="p-3">
                        {order.price_status === 'pending'
                          ? 'Price review'
                          : money(order.total_amount)}
                      </td>
                      <td className="p-3 capitalize">{label(order.status)}</td>
                      <td className="p-3">
                        {order.owner_name || 'Unassigned'}
                        <p className="text-xs text-text-light">{dateTime(order.due_at)}</p>
                      </td>
                      <td className="p-3 capitalize">
                        {label(order.allowed_actions?.[0] || 'none')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="p-6 text-sm text-text-light">
                  No package orders match these filters.
                </p>
              )}
            </div>
            {cursor && (
              <div className="mt-4 text-center">
                <button className="btn btn-outline" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

        {selected?.order && (
          <aside
            className="mt-6 rounded-lg border border-border bg-white p-5"
            aria-label="Package order detail"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-navy">{selected.order.order_number}</h2>
                <p className="text-sm">
                  {label(selected.order.status)} · version {selected.order.version}
                </p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <strong>Owner:</strong> {selected.order.owner_name || 'Unassigned'}
              </p>
              <p>
                <strong>Due:</strong> {dateTime(selected.order.due_at)}
              </p>
              <p>
                <strong>Payment:</strong> {label(selected.order.payment_status || 'not started')}
              </p>
              <p>
                <strong>Receipt:</strong> {selected.order.receipt_number || '-'}
              </p>
              <p>
                <strong>Scheduled:</strong> {dateTime(selected.order.scheduled_for)}
              </p>
              <p>
                <strong>Notification:</strong> {label(selected.order.notification_status || 'none')}
              </p>
              <p>
                <strong>Total:</strong> {money(selected.order.total_amount)}
              </p>
              <p>
                <strong>Price:</strong> {label(selected.order.price_status)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-outline" disabled={busy} onClick={assignToMe}>
                Assign to me / set due
              </button>
              {selected.order.price_status === 'pending' && (
                <button className="btn btn-accent" disabled={busy} onClick={confirmPrices}>
                  Confirm prices
                </button>
              )}
              {(selected.order.allowed_actions || []).map((action: string) => (
                <button
                  key={action}
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => transition(action)}
                >
                  {label(action)}
                </button>
              ))}
            </div>
            <h3 className="mt-6 font-bold text-navy">Items</h3>
            <div className="mt-2 grid gap-2">
              {selected.items.map((item: any) => (
                <div key={item.id} className="rounded-md bg-bg-alt p-3 text-sm">
                  {item.package_name_snapshot || item.package_name || item.test_name_snapshot}
                  <span className="float-right">{money(item.unit_price)}</span>
                </div>
              ))}
            </div>
            <h3 className="mt-6 font-bold text-navy">Timeline</h3>
            <ol className="mt-2 grid gap-2">
              {selected.timeline.map((event: any) => (
                <li key={event.id} className="rounded-md border border-border p-3 text-sm">
                  <strong>{label(event.event_type)}</strong> · {label(event.from_status)} →{' '}
                  {label(event.to_status)}
                  <p className="text-text-light">
                    {event.reason} · {dateTime(event.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </section>
  );
}
