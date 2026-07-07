'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getEnquiries, getEnquiryById, updateEnquiryStatus } from '../../../lib/api';

const statuses = ['new', 'contacted', 'scheduled', 'completed', 'closed_no_response'];

function getLeadType(enq: any) {
  if (enq.package_id) return 'Package enquiry';
  if (enq.doctor_id) return 'Doctor consult';
  return 'General enquiry';
}

function getLeadContext(enq: any) {
  return enq.package_name || enq.doctor_name || 'Clinic enquiry';
}

function getWhatsAppLink(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge capitalize ${
      status === 'new' ? 'badge-new' :
      status === 'contacted' ? 'bg-amber-100 text-amber-800' :
      status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
      status === 'completed' ? 'bg-green-100 text-green-800' :
      'bg-bg-alt text-text-light'
    }`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminLeadsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setToken(saved);
    } else {
      window.location.href = '/admin/login';
    }
  }, []);

  useEffect(() => {
    if (token) loadEnquiries();
  }, [token, filter]);

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const data = await getEnquiries(token!, filter || undefined);
      setEnquiries(data.enquiries);
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      await updateEnquiryStatus(token!, id, newStatus);
      await loadEnquiries();
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setHistory([]);
      return;
    }

    setExpandedId(id);
    try {
      const data = await getEnquiryById(token!, id);
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    }
  };

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enq) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query ||
        enq.patient_name?.toLowerCase().includes(query) ||
        enq.phone?.toLowerCase().includes(query);
      const matchesType = !typeFilter || getLeadType(enq) === typeFilter;
      const createdAt = new Date(enq.created_at);
      const matchesFrom = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`);
      const matchesTo = !toDate || createdAt <= new Date(`${toDate}T23:59:59`);
      return matchesSearch && matchesType && matchesFrom && matchesTo;
    });
  }, [enquiries, search, typeFilter, fromDate, toDate]);

  if (!token) return null;

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Patient Enquiries</h1>
            <p className="text-sm text-text-light">Track package enquiries, doctor consults, and general clinic messages.</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('')}
              className={`btn btn-sm ${filter === '' ? 'bg-navy text-white' : 'btn-outline'}`}
            >
              All
            </button>
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`btn btn-sm capitalize ${filter === s ? 'bg-navy text-white' : 'btn-outline'}`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-4">
            <div className="form-group mb-0">
              <label>Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patient name or phone"
              />
            </div>
            <div className="form-group mb-0">
              <label>Lead Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All types</option>
                <option value="Package enquiry">Package enquiry</option>
                <option value="Doctor consult">Doctor consult</option>
                <option value="General enquiry">General enquiry</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="form-group mb-0">
              <label>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <p className="text-center text-text-light">Loading...</p>
          ) : filteredEnquiries.length === 0 ? (
            <p className="text-center text-text-light">No enquiries found.</p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {filteredEnquiries.map((enq: any) => (
                  <div key={enq.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                    <button type="button" onClick={() => toggleExpand(enq.id)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-navy">{enq.patient_name}</p>
                          <p className="text-xs text-text-light">{enq.phone}</p>
                        </div>
                        <StatusBadge status={enq.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-text">Type</p>
                          <p className="text-text-light">{getLeadType(enq)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-text">For</p>
                          <p className="text-text-light">{getLeadContext(enq)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-text">Created</p>
                          <p className="text-text-light">{new Date(enq.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-text">Preferred</p>
                          <p className="text-text-light">{enq.preferred_date || enq.preferred_time_window || '-'}</p>
                        </div>
                      </div>
                    </button>

                    <select
                      value={enq.status}
                      onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                      disabled={updating === enq.id}
                      className="mt-4 w-full px-3 py-2 rounded border border-border text-sm bg-white"
                    >
                      {statuses.map(s => (
                        <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a href={`tel:${enq.phone}`} className="btn btn-outline btn-sm justify-center">
                        Call
                      </a>
                      <a
                        href={getWhatsAppLink(enq.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm justify-center bg-[#25D366] text-white hover:bg-[#1fb357]"
                      >
                        WhatsApp
                      </a>
                    </div>

                    {expandedId === enq.id && (
                      <div className="mt-4 border-t border-border pt-4 text-sm">
                        <p><strong>Email:</strong> {enq.email || '-'}</p>
                        <p><strong>Preferred Time:</strong> {enq.preferred_time_window || '-'}</p>
                        <p><strong>Referring Dr.:</strong> {enq.referring_doctor_name || '-'}</p>
                        <p><strong>Message:</strong> {enq.message || '-'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-left">
                      <th className="p-3">Patient</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">For</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnquiries.map((enq: any) => (
                      <React.Fragment key={enq.id}>
                        <tr
                          className="border-b border-border cursor-pointer hover:bg-bg-alt transition-colors"
                          onClick={() => toggleExpand(enq.id)}
                        >
                          <td className="p-3 font-semibold">{enq.patient_name}</td>
                          <td className="p-3">{enq.phone}</td>
                          <td className="p-3 text-xs text-text-light">{getLeadType(enq)}</td>
                          <td className="p-3 text-xs text-text-light">{getLeadContext(enq)}</td>
                          <td className="p-3 text-xs text-text-light">{new Date(enq.created_at).toLocaleDateString()}</td>
                          <td className="p-3"><StatusBadge status={enq.status} /></td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-2">
                              <a href={`tel:${enq.phone}`} className="btn btn-outline btn-sm">Call</a>
                              <a
                                href={getWhatsAppLink(enq.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1fb357]"
                              >
                                WhatsApp
                              </a>
                              <select
                                value={enq.status}
                                onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                                disabled={updating === enq.id}
                                className="px-3 py-1.5 rounded border border-border text-xs bg-white"
                              >
                                {statuses.map(s => (
                                  <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>

                        {expandedId === enq.id && (
                          <tr>
                            <td colSpan={7} className="p-4 pl-12 bg-bg-alt text-sm">
                              <div className="space-y-1">
                                <p><strong>Email:</strong> {enq.email || '-'}</p>
                                <p><strong>Preferred Time:</strong> {enq.preferred_time_window || '-'}</p>
                                <p><strong>Preferred Date:</strong> {enq.preferred_date || '-'}</p>
                                <p><strong>Referring Dr.:</strong> {enq.referring_doctor_name || '-'}</p>
                                <p><strong>Doctor:</strong> {enq.doctor_name || '-'}</p>
                                <p><strong>Message:</strong> {enq.message || '-'}</p>
                                <p><strong>Language:</strong> {enq.source_language || 'en'}</p>
                                {history.length > 0 && (
                                  <div className="mt-3">
                                    <p><strong>Status History:</strong></p>
                                    <ul className="ml-4">
                                      {history.map((h: any) => (
                                        <li key={h.id} className="text-xs text-text-light">
                                          {h.old_status || 'new'} to {h.new_status} ({new Date(h.changed_at).toLocaleString()})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
