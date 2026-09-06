'use client';

import { useReportWebVitals } from 'next/web-vitals';

const routeGroup = (): string => {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/packages')) return 'packages';
  if (path.startsWith('/doctors')) return 'doctors';
  if (path.startsWith('/facilities')) return 'facilities';
  if (path.startsWith('/tools')) return 'tools';
  if (path.startsWith('/health-resources')) return 'health-resources';
  return 'other-public';
};

/**
 * Performance budgets for this site, in the units each metric reports.
 * These are the Core Web Vitals "good" thresholds; `overBudget` is sent with
 * every sample so a regression is queryable rather than something to eyeball.
 */
export const PERFORMANCE_BUDGETS: Record<string, number> = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
};

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!['CLS', 'FCP', 'INP', 'LCP', 'TTFB'].includes(metric.name)) return;
    void fetch('/api/telemetry/web-vitals', {
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        budget: PERFORMANCE_BUDGETS[metric.name],
        overBudget: metric.value > PERFORMANCE_BUDGETS[metric.name],
        routeGroup: routeGroup(),
      }),
    }).catch(() => undefined);
  });
  return null;
}
