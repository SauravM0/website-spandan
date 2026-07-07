'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { downloadAdminExport, getAdminAppointments, getDoctors, updateAdminAppointmentStatus } from '../../../lib/api';

const statuses = ['', 'awaiting_payment', 'payment_pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'payment_failed'];

function whatsAppLink(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    setLoading(true);
    try {
      const [doctorRows, apptRows] = await Promise.all([
        getDoctors(false),
        getAdminAppointments(token, { doctor_id: doctorId, status, from, to }),
      ]);
      setDoctors(doctorRows.doctors || []);
      setAppointments(apptRows.appointments || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [doctorId, status, from, to]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((row) => (
      row.patient_name?.toLowerCase().includes(query)
      || row.phone?.toLowerCase().includes(query)
      || row.doctor_name?.toLowerCase().includes(query)
    ));
  }, [appointments, search]);

  const updateStatus = async (id: string, nextStatus: string) => {
    if (nextStatus === 'cancelled' && !window.confirm('Cancel this confirmed appointment?')) return;
    const token = localStorage.getItem('admin_token') || '';
    await updateAdminAppointmentStatus(token, id, nextStatus);
    load();
  };

  const exportCsv = async () => {
    const token = localStorage.getItem('admin_token') || '';
    setExporting(true);
    try {
      await downloadAdminExport(token, 'appointments', { doctor_id: doctorId, status, from, to, search });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Appointments</h1>
            <p className="text-sm text-text-light">Filter, follow up, and update patient visit status.</p>
          </div>

          <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-5">
            <label className="form-group mb-0">
              <span>Doctor</span>
              <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
                <option value="">All doctors</option>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
              </select>
            </label>
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
            <label className="form-group mb-0">
              <span>Search</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, doctor" />
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
                    {['Patient', 'Doctor', 'Date', 'Time', 'Phone', 'Status', 'Actions'].map((label) => <th key={label} className="p-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="p-3 font-semibold text-navy">{row.patient_name}</td>
                      <td className="p-3">{row.doctor_name}</td>
                      <td className="p-3">{String(row.appointment_date || '-').slice(0, 10)}</td>
                      <td className="p-3">{String(row.start_time || '-').slice(0, 5)}</td>
                      <td className="p-3">{row.phone}</td>
                      <td className="p-3 capitalize">{String(row.status || '-').replace(/_/g, ' ')}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <a className="btn btn-outline btn-sm" href={`tel:${row.phone}`}>Call</a>
                          <a className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1fb357]" href={whatsAppLink(row.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                          <select className="rounded-md border border-border px-2 py-2 text-xs" value="" onChange={(event) => event.target.value && updateStatus(row.id, event.target.value)}>
                            <option value="">Update</option>
                            <option value="checked_in">Checked-in</option>
                            <option value="completed">Completed</option>
                            <option value="no_show">No-show</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="p-6 text-sm text-text-light">No appointments match these filters.</p>}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
