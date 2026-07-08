'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getAdminPackagesFiltered } from '@/lib/api';
import {
  AdminPageHeader,
  FilterBar,
  Pagination,
  ResponsiveDataView,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';

const sortOptions = [
  ['order', 'Default order'],
  ['name_asc', 'Name A-Z'],
  ['name_desc', 'Name Z-A'],
  ['updated_desc', 'Recently updated'],
  ['updated_asc', 'Least recently updated'],
  ['price_asc', 'Price low-high'],
  ['price_desc', 'Price high-low'],
];

const categories = [
  '',
  'cardiac',
  'diabetes',
  'thyroid',
  'full_body',
  'general',
];

const statuses = [
  ['', 'All'],
  ['active', 'Active'],
  ['inactive', 'Inactive'],
];

type PackageFilters = {
  search: string;
  category: string;
  status: string;
  sort: string;
  page: number;
  pageSize: number;
};

function filtersFromParams(params: URLSearchParams): PackageFilters {
  return {
    search: params.get('search') || '',
    category: params.get('category') || '',
    status: params.get('status') || '',
    sort: params.get('sort') || 'order',
    page: Number(params.get('page') || 1),
    pageSize: Number(params.get('pageSize') || 25),
  };
}

function queryFromFilters(filters: PackageFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === undefined) return;
    if (key === 'page' && value === 1) return;
    if (key === 'pageSize' && value === 25) return;
    if (key === 'sort' && value === 'order') return;
    params.set(key, String(value));
  });
  return params.toString();
}

function priceLabel(pkg: any): string {
  if (pkg.discounted_price && pkg.discounted_price < pkg.base_price) {
    return `₹${pkg.discounted_price.toLocaleString()}`;
  }
  return `₹${pkg.base_price.toLocaleString()}`;
}

function dateLabel(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function statusTone(pkg: any): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (!pkg.is_active) return 'neutral';
  if (pkg.publication_status === 'published' && pkg.purchase_status === 'available') return 'success';
  if (pkg.publication_status === 'published') return 'info';
  return 'warning';
}

function statusLabel(pkg: any): string {
  if (!pkg.is_active) return 'Inactive';
  if (pkg.publication_status === 'published') return 'Published';
  if (pkg.purchase_status === 'hidden') return 'Hidden';
  if (pkg.purchase_status === 'temporarily_unavailable') return 'Unavailable';
  return 'Draft';
}

function PackagesInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PackageFilters>(() => filtersFromParams(searchParams));
  const [packages, setPackages] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<PackageFilters>) => {
      setFilters((current) => {
        const next = { ...current, ...patch, page: patch.page ?? 1 };
        const query = queryFromFilters(next);
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        return next;
      });
    },
    [pathname, router]
  );

  const load = useCallback(
    async (nextFilters = filters, keepVisible = true) => {
      const requestId = ++requestRef.current;
      setError('');
      if (keepVisible) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await getAdminPackagesFiltered('', nextFilters);
        if (requestRef.current !== requestId) return;
        setPackages(data.data || []);
        setPagination({
          page: data.page || nextFilters.page,
          pageSize: data.pageSize || nextFilters.pageSize,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (err) {
        if (requestRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : 'Could not load packages.');
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          hasLoadedRef.current = true;
        }
      }
    },
    [filters]
  );

  useEffect(() => {
    load(filters, hasLoadedRef.current);
  }, [filters, load]);

  const noRecords =
    !loading && !packages.length && !filters.search && !filters.category && !filters.status;

  const table = packages.length ? (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-alt">
            {['Name', 'Category', 'Price', 'Status', 'Updated', 'Action'].map((item) => (
              <th key={item} className="p-3">{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg) => (
            <tr key={pkg.id} className="border-b border-border align-top hover:bg-bg-alt">
              <td className="p-3">
                <Link href={`/admin/packages/${pkg.id}`} className="font-semibold text-navy hover:text-accent">
                  {pkg.name}
                </Link>
                <p className="mt-1 text-xs text-text-light">{pkg.slug}</p>
              </td>
              <td className="p-3 text-xs text-text-light capitalize">{pkg.category || '-'}</td>
              <td className="p-3 text-xs text-text-light">{priceLabel(pkg)}</td>
              <td className="p-3">
                <StatusBadge tone={statusTone(pkg)}>{statusLabel(pkg)}</StatusBadge>
              </td>
              <td className="p-3 text-xs text-text-light">{dateLabel(pkg.updated_at)}</td>
              <td className="p-3">
                <Link href={`/admin/packages/${pkg.id}`} className="btn btn-outline btn-sm">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const cards = packages.length
    ? packages.map((pkg) => (
        <article key={pkg.id} className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/admin/packages/${pkg.id}`} className="font-semibold text-navy">
                {pkg.name}
              </Link>
              <p className="mt-0.5 text-xs text-text-light">{pkg.category}</p>
            </div>
            <StatusBadge tone={statusTone(pkg)}>{statusLabel(pkg)}</StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-text">Price</p>
              <p className="text-text-light">{priceLabel(pkg)}</p>
            </div>
            <div>
              <p className="font-semibold text-text">Updated</p>
              <p className="text-text-light">{dateLabel(pkg.updated_at)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href={`/admin/packages/${pkg.id}`} className="btn btn-outline btn-sm w-full">
              Edit package
            </Link>
          </div>
        </article>
      ))
    : null;

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <AdminPageHeader
          title="Package Management"
          description="Create, edit, and publish health checkup packages. Open a package for full editing with tests, pricing, and publish controls."
        />

        <FilterBar>
          <label className="form-group mb-0 sm:col-span-2 lg:col-span-3">
            <span>Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-3.5 text-text-light" size={16} />
              <input
                className="pl-9"
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Name, slug, or description"
              />
            </span>
          </label>
          <label className="form-group mb-0">
            <span>Category</span>
            <select
              value={filters.category}
              onChange={(event) => updateFilters({ category: event.target.value })}
            >
              <option value="">All categories</option>
              {categories.filter(Boolean).map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              {statuses.map(([value, text]) => (
                <option key={value || 'all'} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value })}
            >
              {sortOptions.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group mb-0">
            <span>Rows</span>
            <select
              value={filters.pageSize}
              onChange={(event) => updateFilters({ pageSize: Number(event.target.value) })}
            >
              {[25, 50].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>
        )}

        {loading && !packages.length ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : (
          <>
            {refreshing && <p className="mb-3 text-sm text-text-light">Refreshing package list...</p>}
            <ResponsiveDataView
              table={table}
              cards={cards}
              empty={
                <p className="rounded-lg border border-border bg-white p-6 text-sm text-text-light">
                  {noRecords
                    ? 'No packages have been created yet.'
                    : 'No packages match these filters.'}
                </p>
              }
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => updateFilters({ page })}
            />
            <p className="mt-3 text-xs text-text-light">
              Showing {packages.length} of {pagination.total} package(s).
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default function AdminPackagesPage() {
  return (
    <Suspense fallback={<section className="py-8"><div className="container">Loading packages...</div></section>}>
      <PackagesInner />
    </Suspense>
  );
}
