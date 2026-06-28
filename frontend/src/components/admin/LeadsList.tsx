'use client';

import React from 'react';
import Link from 'next/link';

interface LeadsListProps {
  enquiries: any[];
  onStatusChange: (id: string, status: string) => void;
  updating: string | null;
}

const statuses = ['new', 'contacted', 'scheduled', 'completed', 'closed_no_response'];

export default function LeadsList({ enquiries, onStatusChange, updating }: LeadsListProps) {
  if (enquiries.length === 0) {
    return <p className="text-center text-text-light py-8">No enquiries found.</p>;
  }

  return (
    <div className="space-y-3">
      {enquiries.map((enq: any) => (
        <div key={enq.id} className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1">
            <Link href={`/admin/leads/${enq.id}`} className="font-semibold text-navy hover:underline">
              {enq.patient_name}
            </Link>
            <p className="text-xs text-text-light">{enq.phone} • {new Date(enq.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`badge capitalize text-xs ${
            enq.status === 'new' ? 'badge-new' :
            enq.status === 'contacted' ? 'bg-amber-100 text-amber-800' :
            enq.status === 'completed' ? 'bg-green-100 text-green-800' : ''
          }`}>
            {enq.status.replace(/_/g, ' ')}
          </span>
          <select
            value={enq.status}
            onChange={(e) => onStatusChange(enq.id, e.target.value)}
            disabled={updating === enq.id}
            className="px-3 py-1.5 rounded border border-border text-xs bg-white min-w-[120px]"
          >
            {statuses.map(s => (
              <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
