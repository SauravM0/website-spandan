'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import {
  createAdminAvailabilityRule,
  createAdminCalendarOverride,
  getAdminAppointments,
  getAdminAvailabilityRules,
  getAdminCalendarOverrides,
  getAdminDashboard,
  getAdminPackageOrders,
  getAdminPayments,
  getDoctors,
  updateAdminAppointmentStatus,
} from '../../../lib/api';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminOperationsPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [ruleForm, setRuleForm] = useState({
    doctor_id: '',
    weekday: '1',
    start_time: '10:00',
    end_time: '13:00',
    slot_minutes: '30',
    effective_from: new Date().toISOString().slice(0, 10),
    effective_until: '',
  });
  const [overrideForm, setOverrideForm] = useState({
    doctor_id: '',
    exception_date: new Date().toISOString().slice(0, 10),
    override_type: 'block_time_range',
    start_time: '10:00',
    end_time: '11:00',
    reason: '',
    public_note: '',
    internal_note: '',
  });

  const load = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    Promise.all([
      getDoctors(),
      getAdminDashboard(token),
      getAdminAppointments(token),
      getAdminPackageOrders(token),
      getAdminPayments(token),
      getAdminAvailabilityRules(token),
      getAdminCalendarOverrides(token),
    ]).then(([doctorRows, dash, appts, packageOrders, paymentRows, ruleRows, overrideRows]) => {
      setDoctors(doctorRows.doctors || []);
      setRuleForm((prev) => ({ ...prev, doctor_id: prev.doctor_id || doctorRows.doctors?.[0]?.id || '' }));
      setOverrideForm((prev) => ({ ...prev, doctor_id: prev.doctor_id || doctorRows.doctors?.[0]?.id || '' }));
      setDashboard(dash.dashboard);
      setAppointments(appts.appointments || []);
      setOrders(packageOrders.orders || []);
      setPayments(paymentRows.payments || []);
      setRules(ruleRows.rules || []);
      setOverrides(overrideRows.overrides || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const token = () => localStorage.getItem('admin_token') || '';

  const submitRule = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    await createAdminAvailabilityRule(token(), {
      ...ruleForm,
      weekday: Number(ruleForm.weekday),
      slot_minutes: Number(ruleForm.slot_minutes),
      effective_until: ruleForm.effective_until || undefined,
    });
    setMessage('Availability rule added.');
    load();
  };

  const submitOverride = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    await createAdminCalendarOverride(token(), {
      ...overrideForm,
      start_time: overrideForm.override_type === 'unavailable_whole_day' ? undefined : overrideForm.start_time,
      end_time: overrideForm.override_type === 'unavailable_whole_day' ? undefined : overrideForm.end_time,
    });
    setMessage('Calendar override added.');
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await updateAdminAppointmentStatus(token(), id, status);
    load();
  };

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <h1 className="mb-6 text-2xl font-bold text-navy">Today Dashboard</h1>
          {loading ? <p className="text-text-light">Loading...</p> : (
            <div className="grid gap-8">
              <div className="grid-4">
                {[
                  ['Appointments', dashboard?.appointments_today || 0],
                  ['Package orders', dashboard?.orders_today || 0],
                  ['Collections', `Rs. ${dashboard?.collections_today || 0}`],
                  ['Expired holds', dashboard?.expired_holds || 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-white p-5 shadow">
                    <p className="text-sm text-text-light">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <AppointmentsTable rows={appointments} onStatus={updateStatus} />
                <Table title="Package Orders" rows={orders} columns={['order_number', 'purchaser_name', 'phone', 'total_amount', 'status']} />
                <Table title="Payments" rows={payments} columns={['merchant_transaction_id', 'order_number', 'amount', 'status']} />
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <form onSubmit={submitRule} className="rounded-lg border border-border bg-white p-4 shadow">
                  <h2 className="mb-3 font-bold text-navy">Recurring Availability</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Doctor"><select value={ruleForm.doctor_id} onChange={(event) => setRuleForm({ ...ruleForm, doctor_id: event.target.value })}>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
                    <Field label="Weekday"><select value={ruleForm.weekday} onChange={(event) => setRuleForm({ ...ruleForm, weekday: event.target.value })}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></Field>
                    <Field label="Start"><input type="time" value={ruleForm.start_time} onChange={(event) => setRuleForm({ ...ruleForm, start_time: event.target.value })} /></Field>
                    <Field label="End"><input type="time" value={ruleForm.end_time} onChange={(event) => setRuleForm({ ...ruleForm, end_time: event.target.value })} /></Field>
                    <Field label="Slot minutes"><input type="number" min="5" value={ruleForm.slot_minutes} onChange={(event) => setRuleForm({ ...ruleForm, slot_minutes: event.target.value })} /></Field>
                    <Field label="Effective from"><input type="date" value={ruleForm.effective_from} onChange={(event) => setRuleForm({ ...ruleForm, effective_from: event.target.value })} /></Field>
                    <Field label="Effective until"><input type="date" value={ruleForm.effective_until} onChange={(event) => setRuleForm({ ...ruleForm, effective_until: event.target.value })} /></Field>
                  </div>
                  <button className="btn btn-accent mt-4 justify-center" type="submit">Add availability</button>
                  <MiniList rows={rules} columns={['doctor_name', 'weekday', 'start_time', 'end_time', 'effective_from']} weekday />
                </form>

                <form onSubmit={submitOverride} className="rounded-lg border border-border bg-white p-4 shadow">
                  <h2 className="mb-3 font-bold text-navy">Date Override</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Doctor"><select value={overrideForm.doctor_id} onChange={(event) => setOverrideForm({ ...overrideForm, doctor_id: event.target.value })}>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
                    <Field label="Date"><input type="date" value={overrideForm.exception_date} onChange={(event) => setOverrideForm({ ...overrideForm, exception_date: event.target.value })} /></Field>
                    <Field label="Type"><select value={overrideForm.override_type} onChange={(event) => setOverrideForm({ ...overrideForm, override_type: event.target.value })}><option value="unavailable_whole_day">Unavailable whole day</option><option value="custom_hours">Custom hours</option><option value="block_time_range">Block time range</option><option value="add_extra_hours">Add extra hours</option></select></Field>
                    <Field label="Reason"><input value={overrideForm.reason} onChange={(event) => setOverrideForm({ ...overrideForm, reason: event.target.value })} /></Field>
                    {overrideForm.override_type !== 'unavailable_whole_day' && <Field label="Start"><input type="time" value={overrideForm.start_time} onChange={(event) => setOverrideForm({ ...overrideForm, start_time: event.target.value })} /></Field>}
                    {overrideForm.override_type !== 'unavailable_whole_day' && <Field label="End"><input type="time" value={overrideForm.end_time} onChange={(event) => setOverrideForm({ ...overrideForm, end_time: event.target.value })} /></Field>}
                    <Field label="Public note"><input value={overrideForm.public_note} onChange={(event) => setOverrideForm({ ...overrideForm, public_note: event.target.value })} /></Field>
                    <Field label="Internal note"><input value={overrideForm.internal_note} onChange={(event) => setOverrideForm({ ...overrideForm, internal_note: event.target.value })} /></Field>
                  </div>
                  <button className="btn btn-accent mt-4 justify-center" type="submit">Add override</button>
                  <MiniList rows={overrides} columns={['doctor_name', 'exception_date', 'override_type', 'start_time', 'reason']} />
                </form>
              </div>
              {message && <p className="rounded-md bg-success/10 p-3 text-sm font-semibold text-success">{message}</p>}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-semibold text-navy">{label}{children}</label>;
}

function MiniList({ rows, columns, weekday = false }: { rows: any[]; columns: string[]; weekday?: boolean }) {
  return (
    <div className="mt-4 max-h-56 overflow-auto border-t border-border pt-3 text-xs">
      {rows.slice(0, 12).map((row) => (
        <div key={row.id} className="grid grid-cols-5 gap-2 border-b border-border py-2">
          {columns.map((column) => <span key={column} className="truncate">{weekday && column === 'weekday' ? weekdays[row[column]] : String(row[column] ?? '-')}</span>)}
        </div>
      ))}
      {rows.length === 0 && <p className="py-3 text-text-light">No rows yet.</p>}
    </div>
  );
}

function AppointmentsTable({ rows, onStatus }: { rows: any[]; onStatus: (id: string, status: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white p-4 shadow">
      <h2 className="mb-3 font-bold text-navy">Appointments</h2>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-border">{['Patient', 'Doctor', 'Date', 'Time', 'Status', 'Action'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={row.id} className="border-b border-border">
              <td className="p-2">{row.patient_name}</td>
              <td className="p-2">{row.doctor_name}</td>
              <td className="p-2">{String(row.appointment_date ?? '-').slice(0, 10)}</td>
              <td className="p-2">{String(row.start_time ?? '-').slice(0, 5)}</td>
              <td className="p-2">{row.status}</td>
              <td className="p-2"><select className="min-w-32" value="" onChange={(event) => event.target.value && onStatus(row.id, event.target.value)}><option value="">Update</option><option value="checked_in">Checked-in</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="cancelled">Cancel</option></select></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-4 text-sm text-text-light">No appointments yet.</p>}
    </div>
  );
}

function Table({ title, rows, columns }: { title: string; rows: any[]; columns: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white p-4 shadow">
      <h2 className="mb-3 font-bold text-navy">{title}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => <th key={column} className="p-2 capitalize">{column.replace(/_/g, ' ')}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, index) => (
            <tr key={row.id || index} className="border-b border-border">
              {columns.map((column) => <td key={column} className="p-2">{String(row[column] ?? '-')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-4 text-sm text-text-light">No records yet.</p>}
    </div>
  );
}
