'use client';

import { useReportWebVitals } from 'next/web-vitals';

const routeGroup = (): string => {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/book-appointment')) return 'booking-appointment';
  if (path.startsWith('/book-package') || path.startsWith('/build-package'))
    return 'booking-package';
  if (path.startsWith('/packages')) return 'packages';
  if (path.startsWith('/doctors')) return 'doctors';
  return 'other-public';
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
        routeGroup: routeGroup(),
      }),
    }).catch(() => undefined);
  });
  return null;
}
