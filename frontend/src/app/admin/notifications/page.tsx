'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getAdminNotifications, retryAdminNotification } from '../../../lib/api';

const statuses = ['', 'queued', 'sending', 'sent', 'failed', 'skipped_no_destination', 'retrying'];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    const data = await getAdminNotifications(token);
    setNotifications(data.notifications || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter((item) => !status || item.status === status);
  }, [notifications, status]);

  async function retry(id: string) {
    const token = localStorage.getItem('admin_token') || '';
    await retryAdminNotification(token, id);
    setMessage('Notification queued for retry.');
    await load();
  }

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Notifications</h1>
            <p className="text-sm text-text-light">Receipt email delivery status, skipped destinations, and retry controls.</p>
          </div>

          <div className="mb-6 max-w-xs rounded-lg border border-border bg-white p-4">
            <label className="form-group mb-0">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => <option key={item || 'all'} value={item}>{item ? item.replace(/_/g, ' ') : 'All statuses'}</option>)}
              </select>
            </label>
          </div>

          {message && <p className="mb-4 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">{message}</p>}

          {loading ? (
            <p className="text-text-light">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-alt">
                    {['Created', 'Channel', 'Template', 'Destination', 'Reference', 'Status', 'Attempts', 'Action'].map((label) => <th key={label} className="p-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="p-3 text-xs text-text-light">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                      <td className="p-3 capitalize">{item.channel}</td>
                      <td className="p-3">{String(item.template || '-').replace(/_/g, ' ')}</td>
                      <td className="p-3">{item.destination || <span className="text-text-light">No email</span>}</td>
                      <td className="p-3">{item.receipt_number || item.order_number || item.appointment_number || '-'}</td>
                      <td className="p-3">
                        <span className="capitalize">{String(item.status || '-').replace(/_/g, ' ')}</span>
                        {item.error && <p className="mt-1 max-w-[260px] text-xs text-danger">{item.error}</p>}
                      </td>
                      <td className="p-3">{item.attempt_count || 0}</td>
                      <td className="p-3">
                        {['failed', 'retrying', 'queued'].includes(item.status) ? (
                          <button className="btn btn-outline min-h-10 px-3 py-2 text-xs" type="button" onClick={() => retry(item.id)}>Retry</button>
                        ) : (
                          <span className="text-xs text-text-light">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="p-6 text-sm text-text-light">No notifications match these filters.</p>}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
