'use client';

import React from 'react';
import type { ToolResult } from '@/lib/tools/types';
import { TONE_CLASSES } from '@/lib/tools/types';

export default function ResultPanel({
  result,
  emptyText,
}: {
  result: ToolResult | null;
  emptyText: string;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-lg border p-4 ${result ? TONE_CLASSES[result.tone] : 'border-dashed border-border bg-bg-alt text-sm text-text-light'}`}
    >
      {result ? (
        <>
          {result.value && <p className="text-2xl font-bold leading-tight">{result.value}</p>}
          <p className="font-semibold">{result.label}</p>
          <p className="mt-1 text-sm leading-relaxed">{result.detail}</p>
        </>
      ) : (
        emptyText
      )}
    </div>
  );
}
