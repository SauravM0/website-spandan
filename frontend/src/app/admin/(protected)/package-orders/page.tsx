'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getAdminPackageOrders } from '@/lib/api';

const statuses = ['', 'draft', 'awaiting_payment', 'paid', 'payment_failed', 'cancelled', 'fulfilled'];

export default function AdminPackageOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initialStatus = params.get('status') || '';
  const initialSearch = params.get('search') || '';
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

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
    const current = ++request.current;
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const result = await getAdminPackageOrders('', { status: status || undefined, search: search.trim() || undefined, pageSize: 25 }, controller.signal);
        if (current === request.current) { setRows(result.data); setCursor(result.cursor); }
      } catch (err) {
        if (!controller.signal.aborted && current === request.current) setError(err instanceof Error ? err.message : 'Could not load package orders.');
      } finally { if (current === request.current) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, status]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const result = await getAdminPackageOrders('', { status: status || undefined, search: search.trim() || undefined, cursor, pageSize: 25 });
      setRows((current) => [...current, ...result.data]); setCursor(result.cursor);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load more orders.'); }
    finally { setLoadingMore(false); }
  };

  return <section className="py-8"><div className="container">
    <div className="mb-6"><h1 className="text-2xl font-bold text-navy">Package Orders</h1><p className="text-sm text-text-light">Bounded, privacy-aware purchase and fulfilment queue.</p></div>
    <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-3">
      <label className="form-group mb-0"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((item) => <option key={item || 'all'} value={item}>{item ? item.replace(/_/g, ' ') : 'All statuses'}</option>)}</select></label>
      <label className="form-group mb-0 md:col-span-2"><span>Search</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order number, purchaser, or phone prefix" /></label>
    </div>
    {error && <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</div>}
    {loading ? <div aria-label="Loading package orders" className="h-64 animate-pulse rounded-lg bg-white" /> : <>
      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border bg-bg-alt">{['Order number','Purchaser','Phone','Patients','Preferred date','Total','Payment','Fulfilment'].map((label) => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.map((order) => <tr key={order.id} className="border-b border-border"><td className="p-3 font-semibold text-navy">{order.order_number}</td><td className="p-3">{order.purchaser_name}</td><td className="p-3">{order.phone_masked || '-'}</td><td className="p-3">{order.item_count || '-'}</td><td className="p-3">{order.preferred_date ? String(order.preferred_date).slice(0,10) : '-'}</td><td className="p-3">Rs. {Number(order.total_amount || 0).toLocaleString('en-IN')}</td><td className="p-3 capitalize">{String(order.status || '-').replace(/_/g,' ')}</td><td className="p-3 capitalize">{String(order.fulfilment_status || 'pending').replace(/_/g,' ')}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-6 text-sm text-text-light">No package orders match these filters.</p>}</div>
      {cursor && <div className="mt-4 text-center"><button className="btn btn-outline" type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Load more'}</button></div>}
    </>}
  </div></section>;
}
