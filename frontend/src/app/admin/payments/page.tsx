'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { downloadAdminExport, getAdminPayments } from '../../../lib/api';

const statuses = ['', 'created', 'pending', 'success', 'failed', 'expired', 'verification_required', 'refunded', 'disputed'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function receiptUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/api') ? path.slice(4) : path}`;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    setLoading(true);
    getAdminPayments(token, { status, from, to })
      .then((data) => setPayments(data.payments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status, from, to]);

  const exportCsv = async () => {
    const token = localStorage.getItem('admin_token') || '';
    setExporting(true);
    try {
      await downloadAdminExport(token, 'payments', { status, from, to, search });
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = !status || payment.status === status;
      const matchesSearch = !query
        || payment.merchant_transaction_id?.toLowerCase().includes(query)
        || payment.order_number?.toLowerCase().includes(query)
        || payment.provider_reference?.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [payments, search, status]);

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Payments</h1>
            <p className="text-sm text-text-light">Search transactions, review failed or pending payments, and open receipts.</p>
          </div>

          <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-5">
            <label className="form-group mb-0">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => <option key={item || 'all'} value={item}>{item ? item.replace(/_/g, ' ') : 'All statuses'}</option>)}
              </select>
            </label>
            <label className="form-group mb-0">
              <span>From</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="form-group mb-0">
              <span>To</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <label className="form-group mb-0 md:col-span-2">
              <span>Search</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Transaction, order, provider reference" />
            </label>
          </div>

          <div className="mb-4 flex justify-end">
            <button className="btn btn-outline inline-flex items-center gap-2" onClick={exportCsv} disabled={exporting}>
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {loading ? (
            <p className="text-text-light">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-alt">
                    {['Transaction', 'Order', 'Amount', 'Status', 'Method', 'Receipt', 'Delivery', 'Updated'].map((label) => <th key={label} className="p-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payment) => (
                    <tr key={payment.id} className="border-b border-border">
                      <td className="p-3 font-semibold text-navy">{payment.merchant_transaction_id}</td>
                      <td className="p-3">{payment.order_number || payment.appointment_id || '-'}</td>
                      <td className="p-3">Rs. {payment.amount || 0}</td>
                      <td className="p-3 capitalize">{String(payment.status || '-').replace(/_/g, ' ')}</td>
                      <td className="p-3">{payment.payment_method || '-'}</td>
                      <td className="p-3">
                        {payment.pdf_url ? (
                          <a className="font-semibold text-accent" href={receiptUrl(payment.pdf_url)} target="_blank" rel="noopener noreferrer">Open</a>
                        ) : (
                          <span className="text-text-light">Not generated</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="capitalize">{String(payment.notification_status || '-').replace(/_/g, ' ')}</span>
                        {payment.notification_error && <p className="mt-1 max-w-[220px] text-xs text-danger">{payment.notification_error}</p>}
                      </td>
                      <td className="p-3 text-xs text-text-light">{payment.updated_at ? new Date(payment.updated_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="p-6 text-sm text-text-light">No payments match these filters.</p>}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
