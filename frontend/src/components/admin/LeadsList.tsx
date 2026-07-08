'use client';

import React from 'react';
import Link from 'next/link';

interface LeadsListProps {
  enquiries: any[];
}

export default function LeadsList({ enquiries }: LeadsListProps) {
  if (enquiries.length === 0) {
    return <p className="py-8 text-center text-text-light">No enquiries found.</p>;
  }

  return (
    <div className="space-y-3">
      {enquiries.map((enq: any) => (
        <div key={enq.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <Link href={`/admin/leads/${enq.id}`} className="font-semibold text-navy hover:underline">
              {enq.patient_name}
            </Link>
            <p className="text-xs text-text-light">{enq.phone} &bull; {new Date(enq.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`badge min-w-[100px] rounded-full px-3 py-1 text-center text-xs capitalize ${
            enq.status === 'new' ? 'bg-blue-100 text-blue-700' :
            enq.status === 'contacted' ? 'bg-amber-100 text-amber-800' :
            enq.status === 'completed' || enq.status === 'scheduled' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {enq.status.replace(/_/g, ' ')}
          </span>
          <Link href={`/admin/leads/${enq.id}`} className="btn btn-outline btn-sm">Open Detail</Link>
        </div>
      ))}
    </div>
  );
}
