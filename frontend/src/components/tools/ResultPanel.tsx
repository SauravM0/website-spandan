'use client';

import React, { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import type { ToolResult } from '@/lib/tools/types';
import { TONE_CLASSES } from '@/lib/tools/types';
import { whatsappLink } from '@/lib/settings';
import ToolGauge from './ToolGauge';
import Button from '@/components/ui/Button';

export default function ResultPanel({
  result,
  emptyText,
  title,
}: {
  result: ToolResult | null;
  emptyText: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyResult() {
    if (!result) return;
    const text = [title, `${result.value} — ${result.label}`, result.detail]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied - the reading is on screen to copy manually.
    }
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-lg border p-4 ${
        result
          ? TONE_CLASSES[result.tone]
          : 'border-dashed border-border bg-bg-alt text-sm text-text-light'
      }`}
    >
      {result ? (
        <>
          {result.value && (
            <p className="text-3xl font-semibold leading-tight tracking-tight">{result.value}</p>
          )}
          <p className="mt-1 font-semibold">{result.label}</p>
          <p className="mt-1 text-sm leading-relaxed">{result.detail}</p>

          {result.scale ? <ToolGauge scale={result.scale} /> : null}

          {/* The reading itself is never put in a URL. The WhatsApp message is
              generic; copying is a deliberate user action. */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-current/15 pt-4">
            <Button variant="ghost" size="sm" onClick={copyResult}>
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy result'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              href={whatsappLink(
                `Hello, I used the ${title ?? 'health'} tool on your website and would like to discuss what my result means.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Discuss with the clinic
            </Button>
          </div>
        </>
      ) : (
        emptyText
      )}
    </div>
  );
}
