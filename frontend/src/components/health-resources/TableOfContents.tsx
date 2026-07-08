import React from 'react';
import type { TocEntry } from '@/lib/markdown';

export default function TableOfContents({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="soft-card mb-10 p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-navy">On this page</h2>
      <ol className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id} style={{ paddingLeft: `${(entry.level - 1) * 1.25}rem` }}>
            <a
              href={`#${entry.id}`}
              className="block text-sm text-text-light transition-colors hover:text-accent"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
