'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  getAdminAppointments,
  getAdminDashboard,
  getAdminPackageOrders,
  getAdminPayments,
  updateAdminAppointmentStatus,
} from '../../lib/api';

const today = new Date().toISOString().slice(0, 10);

function paymentLabel(row: any) {
  if (row.payment_status) return row.payment_status;
  if (row.status === 'awaiting_payment' || row.status === 'payment_pending') return 'awaiting';
  if (row.status === 'payment_failed') return 'failed';
  return 'not linked';
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }

    try {
      const [dash, appts, packageOrders, paymentRows] = await Promise.all([
        getAdminDashboard(token),
        getAdminAppointments(token, { from: today, to: today }),
        getAdminPackageOrders(token),
        getAdminPayments(token),
      ]);
      setDashboard(dash.dashboard);
      setAppointments(appts.appointments || []);
      setOrders(packageOrders.orders || []);
      setPayments(paymentRows.payments || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => {
    const todayOrders = orders.filter((order) => String(order.created_at || '').slice(0, 10) === today);
    const todayPayments = payments.filter((payment) => String(payment.created_at || '').slice(0, 10) === today);
    return [
      ['Confirmed appointments', appointments.filter((item) => item.status === 'confirmed').length],
      ['Awaiting payment', appointments.filter((item) => ['awaiting_payment', 'payment_pending'].includes(item.status)).length],
      ['Failed payments', todayPayments.filter((item) => item.status === 'failed').length],
      ['Package purchases', todayOrders.length || dashboard?.orders_today || 0],
      ['Unpaid/expired holds', dashboard?.expired_holds || 0],
      ['Arrived', appointments.filter((item) => item.status === 'checked_in').length],
      ['Completed', appointments.filter((item) => item.status === 'completed').length],
      ['Collections', `Rs. ${dashboard?.collections_today || 0}`],
    ];
  }, [appointments, dashboard, orders, payments]);

  const updateStatus = async (id: string, status: string) => {
    if (status === 'cancelled' && !window.confirm('Cancel this confirmed appointment?')) return;
    const token = localStorage.getItem('admin_token') || '';
    await updateAdminAppointmentStatus(token, id, status);
    setMessage('Appointment updated.');
    load();
  };

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Today Dashboard</h1>
            <p className="text-sm text-text-light">Appointments, collections, payments, and action items for {today}.</p>
          </div>

          {loading ? (
            <p className="text-text-light">Loading...</p>
          ) : (
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {metrics.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-text-light">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
                  </div>
                ))}
              </div>

              {message && <p className="rounded-md bg-success/10 p-3 text-sm font-semibold text-success">{message}</p>}

              <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-alt">
                      {['Time', 'Patient', 'Doctor/package', 'Phone', 'Payment', 'Status', 'Actions'].map((label) => (
                        <th key={label} className="p-3">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((row) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="p-3 font-semibold text-navy">{String(row.start_time || '-').slice(0, 5)}</td>
                        <td className="p-3">{row.patient_name}</td>
                        <td className="p-3">{row.doctor_name}</td>
                        <td className="p-3"><a className="font-semibold text-accent" href={`tel:${row.phone}`}>{row.phone}</a></td>
                        <td className="p-3 capitalize">{paymentLabel(row).replace(/_/g, ' ')}</td>
                        <td className="p-3 capitalize">{String(row.status || '-').replace(/_/g, ' ')}</td>
                        <td className="p-3">
                          <select className="min-w-36 rounded-md border border-border px-2 py-2 text-sm" value="" onChange={(event) => event.target.value && updateStatus(row.id, event.target.value)}>
                            <option value="">Update</option>
                            <option value="checked_in">Checked-in</option>
                            <option value="completed">Completed</option>
                            <option value="no_show">No-show</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {appointments.length === 0 && <p className="p-6 text-sm text-text-light">No appointments scheduled today.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
