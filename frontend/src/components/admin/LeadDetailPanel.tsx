'use client';

import React from 'react';
import LeadSummary from './LeadSummary';
import LeadTimeline from './LeadTimeline';
import LeadMutationForm from './LeadMutationForm';

interface LeadDetailPanelProps {
  enquiry: any;
  history: any[];
  notes: any[];
  allowedActions: string[];
  version: number;
  showFullContact: boolean;
  onStatusUpdate: (newStatus: string, notes: string) => Promise<void>;
}

export default function LeadDetailPanel({
  enquiry,
  history,
  notes,
  allowedActions,
  version,
  showFullContact,
  onStatusUpdate,
}: LeadDetailPanelProps) {
  return (
    <div className="space-y-6">
      <LeadSummary lead={enquiry} showFullContact={showFullContact} />
      <LeadMutationForm
        currentStatus={enquiry.status}
        allowedActions={allowedActions}
        version={version}
        onStatusUpdate={onStatusUpdate}
      />
      <LeadTimeline history={history} notes={notes} />
    </div>
  );
}
