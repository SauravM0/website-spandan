'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchAdminWorkflow } from '../../lib/api';
import type { AdminSearchResult } from '../../lib/types';
import { useDebouncedValue, useLatestRequest } from '../../features/admin/shared/hooks';

export default function AdminGlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const runLatest = useLatestRequest();

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    void runLatest((signal) => searchAdminWorkflow(debouncedQuery, signal))
      .then((response) => {
        if (response) {
          setResults(response.data);
          setOpen(true);
        }
      })
      .catch(() => setResults([]));
  }, [debouncedQuery, runLatest]);

  return (
    <div className="relative hidden w-full max-w-xl md:block">
      <label className="sr-only" htmlFor="admin-global-search">
        Search permitted admin records
      </label>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light"
      />
      <input
        id="admin-global-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        className="min-h-[40px] w-full rounded-md border border-border bg-bg-alt pl-9 pr-3 text-sm"
        placeholder="Search patients, appointments, orders, payments..."
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-96 overflow-y-auto rounded-md border border-border bg-white p-2 shadow-xl">
          {results.map((result) => (
            <button
              type="button"
              key={`${result.type}:${result.id}`}
              onClick={() => {
                setOpen(false);
                setQuery('');
                router.push(result.href);
              }}
              className="block min-h-[48px] w-full rounded-md px-3 py-2 text-left hover:bg-bg-alt focus:bg-bg-alt"
            >
              <span className="block text-xs font-bold uppercase text-text-light">
                {String(result.type).replace(/_/g, ' ')}
              </span>
              <span className="block font-semibold text-ink">{result.label}</span>
              <span className="block truncate text-xs text-text-light">{result.context}</span>
            </button>
          ))}
          {!results.length && <p className="p-3 text-sm text-text-light">No permitted results.</p>}
        </div>
      )}
    </div>
  );
}
