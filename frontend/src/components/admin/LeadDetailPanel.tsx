'use client';

import React from 'react';

interface LeadDetailPanelProps {
  enquiry: any;
  history: any[];
}

export default function LeadDetailPanel({ enquiry, history }: LeadDetailPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><strong>Patient Name:</strong><p>{enquiry.patient_name}</p></div>
        <div><strong>Phone:</strong><p>{enquiry.phone}</p></div>
        <div><strong>Email:</strong><p>{enquiry.email || '—'}</p></div>
        <div><strong>Preferred Date:</strong><p>{enquiry.preferred_date || '—'}</p></div>
        <div><strong>Preferred Time:</strong><p>{enquiry.preferred_time_window || '—'}</p></div>
        <div><strong>Referring Doctor:</strong><p>{enquiry.referring_doctor_name || '—'}</p></div>
        <div><strong>Package ID:</strong><p className="text-xs">{enquiry.package_id || '—'}</p></div>
        <div><strong>Language:</strong><p>{enquiry.source_language || 'en'}</p></div>
      </div>
      {enquiry.message && (
        <div><strong>Message:</strong><p className="text-text-light mt-1">{enquiry.message}</p></div>
      )}
      {history.length > 0 && (
        <div>
          <strong>Status History:</strong>
          <ul className="ml-4 mt-1 space-y-1">
            {history.map((h: any) => (
              <li key={h.id} className="text-xs text-text-light">
                <span className="capitalize">{h.old_status || 'new'}</span> → <span className="capitalize">{h.new_status}</span>
                <span className="ml-1">({new Date(h.changed_at).toLocaleString()})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
