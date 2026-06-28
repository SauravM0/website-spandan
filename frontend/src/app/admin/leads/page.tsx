'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getEnquiries, getEnquiryById, updateEnquiryStatus } from '../../../lib/api';

export default function AdminLeadsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('');
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
    } catch {
      // ignore
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

  if (!token) return null;

  const statuses = ['new', 'contacted', 'scheduled', 'completed', 'closed_no_response'];

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
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

          {loading ? (
            <p className="text-center text-text-light">Loading...</p>
          ) : enquiries.length === 0 ? (
            <p className="text-center text-text-light">No enquiries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-left">
                    <th className="p-3">Patient</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Package</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((enq: any) => (
                    <React.Fragment key={enq.id}>
                      <tr
                        className="border-b border-border cursor-pointer hover:bg-bg-alt transition-colors"
                        onClick={() => toggleExpand(enq.id)}
                      >
                        <td className="p-3 font-semibold">{enq.patient_name}</td>
                        <td className="p-3">{enq.phone}</td>
                        <td className="p-3 text-xs text-text-light">{enq.package_id?.substring(0, 8) || '-'}</td>
                        <td className="p-3 text-xs text-text-light">
                          {new Date(enq.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className={`badge capitalize ${
                            enq.status === 'new' ? 'badge-new' :
                            enq.status === 'contacted' ? 'bg-amber-100 text-amber-800' :
                            enq.status === 'completed' ? 'bg-green-100 text-green-800' : ''
                          }`}>
                            {enq.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
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
                        </td>
                      </tr>
                      {expandedId === enq.id && (
                        <tr>
                          <td colSpan={6} className="p-4 pl-12 bg-bg-alt text-sm">
                            <div className="space-y-1">
                              <p><strong>Email:</strong> {enq.email || '—'}</p>
                              <p><strong>Preferred Time:</strong> {enq.preferred_time_window || '—'}</p>
                              <p><strong>Preferred Date:</strong> {enq.preferred_date || '—'}</p>
                              <p><strong>Referring Dr.:</strong> {enq.referring_doctor_name || '—'}</p>
                              <p><strong>Message:</strong> {enq.message || '—'}</p>
                              <p><strong>Language:</strong> {enq.source_language || 'en'}</p>
                              {history.length > 0 && (
                                <div className="mt-3">
                                  <p><strong>Status History:</strong></p>
                                  <ul className="ml-4">
                                    {history.map((h: any) => (
                                      <li key={h.id} className="text-xs text-text-light">
                                        {h.old_status || 'new'} → {h.new_status} ({new Date(h.changed_at).toLocaleString()})
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
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
