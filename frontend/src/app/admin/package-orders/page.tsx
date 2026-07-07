'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getAdminPackageOrders } from '../../../lib/api';

const statuses = ['', 'draft', 'awaiting_payment', 'paid', 'payment_failed', 'cancelled', 'fulfilled'];

export default function AdminPackageOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    getAdminPackageOrders(token)
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = !status || order.status === status;
      const matchesSearch = !query
        || order.order_number?.toLowerCase().includes(query)
        || order.purchaser_name?.toLowerCase().includes(query)
        || order.phone?.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, status]);

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Package Orders</h1>
            <p className="text-sm text-text-light">Monitor package purchases, totals, payment state, and fulfilment readiness.</p>
          </div>

          <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-3">
            <label className="form-group mb-0">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => <option key={item || 'all'} value={item}>{item ? item.replace(/_/g, ' ') : 'All statuses'}</option>)}
              </select>
            </label>
            <label className="form-group mb-0 md:col-span-2">
              <span>Search</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, purchaser, phone" />
            </label>
          </div>

          {loading ? (
            <p className="text-text-light">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-alt">
                    {['Order number', 'Purchaser', 'Phone', 'Patients', 'Preferred date', 'Total', 'Payment', 'Fulfilment'].map((label) => <th key={label} className="p-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order.id} className="border-b border-border">
                      <td className="p-3 font-semibold text-navy">{order.order_number}</td>
                      <td className="p-3">{order.purchaser_name}</td>
                      <td className="p-3"><a className="font-semibold text-accent" href={`tel:${order.phone}`}>{order.phone}</a></td>
                      <td className="p-3">{order.item_count || '-'}</td>
                      <td className="p-3">{order.preferred_date ? String(order.preferred_date).slice(0, 10) : '-'}</td>
                      <td className="p-3">Rs. {order.total_amount || 0}</td>
                      <td className="p-3 capitalize">{String(order.status || '-').replace(/_/g, ' ')}</td>
                      <td className="p-3 capitalize">{String(order.fulfilment_status || 'pending').replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="p-6 text-sm text-text-light">No package orders match these filters.</p>}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
