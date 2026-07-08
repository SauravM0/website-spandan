'use client';

import React from 'react';

type HistoryEntry = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  changed_at: string;
  _type: 'status';
};

type NoteEntry = {
  id: string;
  note: string;
  created_by_name: string | null;
  created_at: string;
  _type: 'note';
};

type TimelineEntry = HistoryEntry | NoteEntry;

function isHistory(entry: TimelineEntry): entry is HistoryEntry {
  return entry._type === 'status';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function LeadTimeline({
  history,
  notes,
}: {
  history: any[];
  notes: any[];
}) {
  const entries: TimelineEntry[] = [
    ...history.map((h: any) => ({ ...h, _type: 'status' as const })),
    ...notes.map((n: any) => ({ ...n, _type: 'note' as const })),
  ].sort((a, b) => {
    const aTime = new Date(a.changed_at || a.created_at).getTime();
    const bTime = new Date(b.changed_at || b.created_at).getTime();
    return bTime - aTime;
  });

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-light">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <h2 className="text-lg font-bold text-navy">Activity timeline</h2>
      </div>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <div key={`${entry._type}-${entry.id}`} className="px-4 py-3 sm:px-6">
            {isHistory(entry) ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium capitalize">{entry.old_status || 'new'}</span>
                    <span className="mx-1 text-text-light">&rarr;</span>
                    <span className="font-medium capitalize">{entry.new_status}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-text-light">
                    {entry.changed_by_name || 'System'} &middot; {formatTime(entry.changed_at)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.note}</p>
                  <p className="mt-0.5 text-xs text-text-light">
                    {entry.created_by_name || 'Staff'} &middot; {formatTime(entry.created_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
