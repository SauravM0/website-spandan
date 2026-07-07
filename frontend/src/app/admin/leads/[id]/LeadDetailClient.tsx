'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../../components/layout/AdminLayout';
import { getEnquiryById, updateEnquiryStatus } from '../../../../lib/api';

const statuses = ['new', 'contacted', 'scheduled', 'completed', 'closed_no_response'];

function getLeadType(enquiry: any) {
  if (enquiry.package_id) return 'Package enquiry';
  if (enquiry.doctor_id) return 'Doctor consult';
  return 'General enquiry';
}

function getLeadContext(enquiry: any) {
  return enquiry.package_name || enquiry.doctor_name || 'Clinic enquiry';
}

export default function LeadDetailClient({ id }: { id: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [enquiry, setEnquiry] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setToken(saved);
    } else {
      window.location.href = '/admin/login';
    }
  }, []);

  useEffect(() => {
    if (token && id) loadLead();
  }, [token, id]);

  const loadLead = async () => {
    try {
      const data = await getEnquiryById(token!, id);
      setEnquiry(data.enquiry);
      setHistory(data.history || []);
      setNotes(data.notes || []);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    await updateEnquiryStatus(token!, id, newStatus, statusNotes || undefined);
    setStatusNotes('');
    await loadLead();
  };

  if (!token) return null;

  if (loading) {
    return <AdminLayout><div className="container py-8 text-center text-text-light">Loading...</div></AdminLayout>;
  }

  if (!enquiry) {
    return <AdminLayout><div className="container py-8 text-center text-text-light">Lead not found.</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container max-w-[800px]">
          <h1 className="text-2xl font-bold text-navy mb-6">Lead Details</h1>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="grid-2 gap-4">
              <div><strong>Patient Name:</strong> <p>{enquiry.patient_name}</p></div>
              <div><strong>Phone:</strong> <p>{enquiry.phone}</p></div>
              <div><strong>Email:</strong> <p>{enquiry.email || '-'}</p></div>
              <div><strong>Type:</strong> <p>{getLeadType(enquiry)}</p></div>
              <div><strong>For:</strong> <p>{getLeadContext(enquiry)}</p></div>
              <div><strong>Preferred Date:</strong> <p>{enquiry.preferred_date || '-'}</p></div>
              <div><strong>Preferred Time:</strong> <p>{enquiry.preferred_time_window || '-'}</p></div>
              <div><strong>Referring Doctor:</strong> <p>{enquiry.referring_doctor_name || '-'}</p></div>
              <div><strong>Doctor:</strong> <p>{enquiry.doctor_name || '-'}</p></div>
              <div><strong>Language:</strong> <p>{enquiry.source_language || 'en'}</p></div>
            </div>

            {enquiry.message && (
              <div className="mt-4">
                <strong>Message:</strong>
                <p className="text-text-light mt-1">{enquiry.message}</p>
              </div>
            )}

            <div className="mt-4">
              <span className="badge capitalize text-sm px-3 py-1.5 bg-blue-100 text-blue-700">
                {enquiry.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Update Status</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusUpdate(s)}
                  className={`btn btn-sm capitalize ${
                    enquiry.status === s ? 'bg-navy text-white' : 'btn-outline'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add notes about this status change..."
              />
            </div>
          </div>

          {notes.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">Staff Notes</h2>
              <ul className="space-y-2">
                {notes.map((note: any) => (
                  <li key={note.id} className="text-sm text-text-light border-b border-border pb-2">
                    <p>{note.note}</p>
                    <span className="text-xs">
                      {note.created_by_name || 'Staff'} - {new Date(note.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {history.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h2 className="text-lg font-bold mb-4">Status History</h2>
              <ul className="space-y-2">
                {history.map((h: any) => (
                  <li key={h.id} className="text-sm text-text-light border-b border-border pb-2">
                    <span className="font-medium capitalize">{h.old_status || 'new'}</span>
                    {' to '}
                    <span className="font-medium capitalize">{h.new_status}</span>
                    <span className="text-xs ml-2">({new Date(h.changed_at).toLocaleString()})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
