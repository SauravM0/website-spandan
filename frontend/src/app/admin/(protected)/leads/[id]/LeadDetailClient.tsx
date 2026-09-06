'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getEnquiryById, updateEnquiryStatus } from '@/lib/api';
import LeadSummary from '@/components/admin/LeadSummary';
import LeadTimeline from '@/components/admin/LeadTimeline';
import LeadMutationForm from '@/components/admin/LeadMutationForm';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import Button from '@/components/ui/Button';

const CONTACT_CAPABILITY = 'admin.leads.view_contact';

export default function LeadDetailClient({ id }: { id: string }) {
  const { hasCapability } = useAdminSession();
  const [data, setData] = useState<{
    enquiry: any;
    history: any[];
    notes: any[];
    allowedActions: string[];
    version: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const loadLead = useCallback(async () => {
    const reqId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await getEnquiryById('', id);
      if (reqId !== requestRef.current) return;
      setData(result);
    } catch (err) {
      if (reqId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load lead.');
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleStatusUpdate = useCallback(async (newStatus: string, notes: string) => {
    if (!data) return;
    const result = await updateEnquiryStatus('', id, newStatus, notes, data.version);
    setData((prev) =>
      prev
        ? {
            ...prev,
            enquiry: { ...prev.enquiry, status: newStatus },
            version: result.version,
          }
        : prev
    );
    await loadLead();
  }, [id, data?.version, loadLead]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="container max-w-[800px]">
          <div className="mb-6 h-48 animate-pulse rounded-xl bg-white" />
          <div className="mb-6 h-40 animate-pulse rounded-xl bg-white" />
          <div className="h-32 animate-pulse rounded-xl bg-white" />
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="py-8">
        <div className="container max-w-[800px]">
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
            <p className="text-sm font-semibold text-danger">{error}</p>
            <Button onClick={loadLead} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!data || !data.enquiry) {
    return (
      <section className="py-8">
        <div className="container max-w-[800px]">
          <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-light">
            Lead not found.
          </div>
        </div>
      </section>
    );
  }

  const showFullContact = hasCapability(CONTACT_CAPABILITY);

  return (
    <section className="py-6 md:py-8">
      <div className="container max-w-[800px]">
        {error && (
          <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>
        )}

        <div className="mb-6">
          <LeadSummary lead={data.enquiry} showFullContact={showFullContact} />
        </div>

        <div className="mb-6">
          <LeadMutationForm
            currentStatus={data.enquiry.status}
            allowedActions={data.allowedActions}
            version={data.version}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>

        <LeadTimeline history={data.history} notes={data.notes} />
      </div>
    </section>
  );
}
