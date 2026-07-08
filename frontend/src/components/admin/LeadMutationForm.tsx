'use client';

import React, { useState } from 'react';

function label(status: string): string {
  return status.replace(/_/g, ' ');
}

type LeadMutationFormProps = {
  currentStatus: string;
  allowedActions: string[];
  version: number;
  onStatusUpdate: (newStatus: string, notes: string) => Promise<void>;
};

export default function LeadMutationForm({
  currentStatus,
  allowedActions,
  version,
  onStatusUpdate,
}: LeadMutationFormProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    setError('');
    try {
      await onStatusUpdate(selectedStatus, notes);
      setSelectedStatus('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (allowedActions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-light">
        No further status changes available for this lead.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-navy">Update status</h2>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-light">
          Current: <span className="normal-case">{label(currentStatus)}</span>
          <span className="ml-2 text-text-light">(v{version})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {allowedActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setSelectedStatus(action)}
              className={`btn btn-sm capitalize ${
                selectedStatus === action ? 'bg-navy text-white' : 'btn-outline'
              }`}
            >
              {label(action)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="mutation-notes" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light">
          Notes (optional)
        </label>
        <textarea
          id="mutation-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this status change..."
          className="min-h-[80px] w-full rounded-lg border border-border bg-white p-3 text-sm"
          disabled={submitting}
        />
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedStatus || submitting}
        className="btn btn-primary min-h-10 w-full sm:w-auto"
      >
        {submitting ? 'Updating...' : `Mark as ${selectedStatus ? label(selectedStatus) : '...'}`}
      </button>
    </div>
  );
}
