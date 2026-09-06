'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getEnquiries } from '@/lib/api';
import {
  AdminPageHeader,
  FilterBar,
  Pagination,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import Button from '@/components/ui/Button';

const presets = [
  ['', 'All'],
  ['new', 'New'],
  ['contacted', 'Follow-up'],
  ['scheduled', 'Contacted'],
  ['closed_no_response', 'Closed'],
];
const types = [
  ['', 'All types'],
  ['package', 'Package enquiry'],
  ['doctor', 'Doctor consult'],
  ['general', 'General enquiry'],
];
const sortOptions = [
  ['date_desc', 'Newest'],
  ['date_asc', 'Oldest'],
  ['updated_desc', 'Recently updated'],
  ['updated_asc', 'Least recently updated'],
];

type LeadFilters = {
  status: string;
  type: string;
  from: string;
  to: string;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
};

function filtersFromParams(params: URLSearchParams): LeadFilters {
  return {
    status: params.get('status') || '',
    type: params.get('type') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    search: params.get('search') || '',
    sort: params.get('sort') || 'date_desc',
    page: Number(params.get('page') || 1),
    pageSize: Number(params.get('pageSize') || 25),
  };
}

function queryFromFilters(filters: LeadFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === undefined) return;
    if (key === 'page' && value === 1) return;
    if (key === 'pageSize' && value === 25) return;
    params.set(key, String(value));
  });
  return params.toString();
}

function label(value: unknown) {
  return String(value || '-').replace(/_/g, ' ');
}

function leadType(enquiry: any) {
  if (enquiry.package_id) return 'Package enquiry';
  if (enquiry.doctor_id) return 'Doctor consult';
  return 'General enquiry';
}

function leadContext(enquiry: any) {
  return enquiry.package_name || enquiry.doctor_name || 'Clinic enquiry';
}

function dateLabel(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'new') return 'info';
  if (status === 'contacted') return 'warning';
  if (status === 'scheduled') return 'success';
  if (status === 'completed') return 'success';
  if (status === 'closed_no_response') return 'neutral';
  return 'neutral';
}

function LeadsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<LeadFilters>(() => filtersFromParams(searchParams));
  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  const updateFilters = useCallback((patch: Partial<LeadFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch, page: patch.page ?? 1 };
      const query = queryFromFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      return next;
    });
  }, [pathname, router]);

  const load = useCallback(async (nextFilters = filters, keepVisible = true) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setError('');
    if (keepVisible) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getEnquiries('', nextFilters);
      if (requestRef.current !== requestId) return;
      setLeads(data.enquiries || []);
      setPagination({
        page: data.pagination?.page || nextFilters.page,
        pageSize: data.pagination?.pageSize || nextFilters.pageSize,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 1,
      });
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Could not load enquiries.');
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
        hasLoadedRef.current = true;
      }
    }
  }, [filters]);

  useEffect(() => {
    load(filters, hasLoadedRef.current);
  }, [filters, load]);

  const noRecords = !loading && !leads.length && !filters.status && !filters.type && !filters.from && !filters.to && !filters.search;

  const table = leads.length ? (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-alt">
            {['Name', 'Contact', 'Type', 'For', 'Created', 'Preferred', 'Status', 'Action'].map((item) => (
              <th key={item} className="p-3">{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-border align-top hover:bg-bg-alt">
              <td className="p-3">
                <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-ink hover:text-accent">
                  {lead.patient_name}
                </Link>
                <p className="mt-1 text-xs text-text-light">{lead.source_language || 'en'}</p>
              </td>
              <td className="p-3">
                <p>{lead.phone_masked || '-'}</p>
                {lead.email_masked && <p className="text-xs text-text-light">{lead.email_masked}</p>}
              </td>
              <td className="p-3 text-xs text-text-light">{leadType(lead)}</td>
              <td className="p-3 text-xs text-text-light">{leadContext(lead)}</td>
              <td className="p-3 text-xs text-text-light">{dateLabel(lead.created_at)}</td>
              <td className="p-3 text-xs text-text-light">{lead.preferred_date || lead.preferred_time_window || '-'}</td>
              <td className="p-3"><StatusBadge tone={statusTone(lead.status)}>{label(lead.status)}</StatusBadge></td>
              <td className="p-3">
                <Button href={`/admin/leads/${lead.id}`} variant="outline" size="sm">Open</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const cards = leads.length ? leads.map((lead) => (
    <article key={lead.id} className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-ink">
            {lead.patient_name}
          </Link>
          <p className="mt-1 text-xs text-text-light">{lead.phone_masked || '-'}</p>
        </div>
        <StatusBadge tone={statusTone(lead.status)}>{label(lead.status)}</StatusBadge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <Detail label="Type" value={leadType(lead)} />
        <Detail label="For" value={leadContext(lead)} />
        <Detail label="Created" value={dateLabel(lead.created_at)} />
        <Detail label="Preferred" value={lead.preferred_date || lead.preferred_time_window || '-'} />
      </div>
      <div className="mt-4">
        <Button href={`/admin/leads/${lead.id}`} variant="outline" size="sm" className="w-full">Open Detail</Button>
      </div>
    </article>
  )) : null;

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <AdminPageHeader
          title="Enquiries / Leads"
          description="Search and filter the full follow-up queue. Open a lead detail to view full contact, notes, history, and update status."
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {presets.map(([value, text]) => (
            <Button
              key={value || 'all'}
              size="sm"
              variant={filters.status === value ? 'primary' : 'outline'}
              aria-pressed={filters.status === value}
              onClick={() => updateFilters({ status: value })}
            >
              {text}
            </Button>
          ))}
        </div>

        <FilterBar>
          <label className="form-group mb-0">
            <span>Type</span>
            <select value={filters.type} onChange={(event) => updateFilters({ type: event.target.value })}>
              {types.map(([value, text]) => <option key={value || 'all'} value={value}>{text}</option>)}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>From</span>
            <input type="date" value={filters.from} onChange={(event) => updateFilters({ from: event.target.value })} />
          </label>
          <label className="form-group mb-0">
            <span>To</span>
            <input type="date" value={filters.to} onChange={(event) => updateFilters({ to: event.target.value })} />
          </label>
          <label className="form-group mb-0">
            <span>Sort</span>
            <select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
              {sortOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Rows</span>
            <select value={filters.pageSize} onChange={(event) => updateFilters({ pageSize: Number(event.target.value) })}>
              {[25, 50].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="form-group mb-0 sm:col-span-2 lg:col-span-3">
            <span>Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-3.5 text-text-light" size={16} />
              <input
                className="pl-9"
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Name, phone, email, package, or doctor"
              />
            </span>
          </label>
        </FilterBar>

        {error && <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}

        {loading && !leads.length ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-white" />)}
          </div>
        ) : (
          <>
            {refreshing && <p className="mb-3 text-sm text-text-light">Refreshing enquiry queue...</p>}
            <ResponsiveDataView
              table={table}
              cards={cards}
              empty={<p className="rounded-lg border border-border bg-white p-6 text-sm text-text-light">{noRecords ? 'No enquiries have been submitted yet.' : 'No enquiries match these filters.'}</p>}
            />
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => updateFilters({ page })} />
            <p className="mt-3 text-xs text-text-light">
              Showing {leads.length} of {pagination.total} matched enquiry lead(s). Full contact, message, history, and notes stay in the lead detail page.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-text">{label}</p>
      <p className="text-text-light">{value}</p>
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<section className="py-8"><div className="container">Loading enquiries...</div></section>}>
      <LeadsInner />
    </Suspense>
  );
}
