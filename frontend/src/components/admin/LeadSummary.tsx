'use client';

import React from 'react';
import Link from 'next/link';
import { StatusBadge } from './AdminPrimitives';

type LeadData = {
  id: string;
  patient_name: string;
  phone: string;
  email: string | null;
  status: string;
  source_language: string;
  package_id: string | null;
  package_name: string | null;
  package_slug: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  doctor_slug: string | null;
  referring_doctor_name: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  message: string;
  created_at: string;
};

function leadType(enquiry: LeadData): string {
  if (enquiry.package_id) return 'Package enquiry';
  if (enquiry.doctor_id) return 'Doctor consult';
  return 'General enquiry';
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'new') return 'info';
  if (status === 'contacted') return 'warning';
  if (status === 'scheduled') return 'success';
  if (status === 'completed') return 'success';
  if (status === 'closed_no_response') return 'neutral';
  return 'neutral';
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

function maskEmail(email: string): string {
  return email.replace(/(^.{1,2}).*(@.*$)/, '$1***$2');
}

export default function LeadSummary({
  lead,
  showFullContact,
}: {
  lead: LeadData;
  showFullContact: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-navy sm:text-2xl">{lead.patient_name}</h1>
            <p className="mt-1 text-sm text-text-light">
              {leadType(lead)} &middot; {lead.source_language || 'en'}
              &middot; Created {new Date(lead.created_at).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge tone={statusTone(lead.status)}>
            {lead.status.replace(/_/g, ' ')}
          </StatusBadge>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Contact</p>
          {showFullContact ? (
            <>
              <p className="mt-1">{lead.phone}</p>
              {lead.email && <p className="text-sm text-text-light">{lead.email}</p>}
            </>
          ) : (
            <>
              <p className="mt-1">{maskPhone(lead.phone)}</p>
              {lead.email && <p className="text-sm text-text-light">{maskEmail(lead.email)}</p>}
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Context</p>
          {lead.package_name ? (
            <p className="mt-1">
              <Link href={`/admin/packages/${lead.package_slug || lead.package_id}`} className="text-accent hover:underline">
                {lead.package_name}
              </Link>
            </p>
          ) : lead.doctor_name ? (
            <p className="mt-1">
              <Link href={`/admin/doctors/${lead.doctor_slug || lead.doctor_id}`} className="text-accent hover:underline">
                {lead.doctor_name}
              </Link>
            </p>
          ) : (
            <p className="mt-1 text-text-light">Clinic enquiry</p>
          )}
          {lead.referring_doctor_name && (
            <p className="text-xs text-text-light">Referred by {lead.referring_doctor_name}</p>
          )}
        </div>

        {(lead.preferred_date || lead.preferred_time_window) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Preferred</p>
            {lead.preferred_date && <p className="mt-1">{new Date(lead.preferred_date).toLocaleDateString()}</p>}
            {lead.preferred_time_window && <p className="text-sm text-text-light">{lead.preferred_time_window}</p>}
          </div>
        )}
      </div>

      {lead.message && (
        <div className="border-t border-border px-4 pb-4 sm:px-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-light">Original enquiry</p>
          <p className="whitespace-pre-wrap rounded-lg bg-bg-alt p-3 text-sm text-text">{lead.message}</p>
        </div>
      )}
    </div>
  );
}
