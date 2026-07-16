'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_DOMAIN_EVENT,
  ADMIN_REALTIME_REFRESH,
  type AdminDomainEvent,
} from '@/lib/adminRealtime';

type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'stale';
const FALLBACK_MIN_MS = 15_000;
const FALLBACK_JITTER_MS = 10_000;

export default function AdminRealtimeBridge() {
  const [state, setState] = useState<ConnectionState>('connecting');
  const fallbackTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let disposed = false;
    let failures = 0;
    const source = new EventSource('/api/admin/events', { withCredentials: true });

    const stopFallback = () => {
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = undefined;
    };
    const scheduleFallback = () => {
      stopFallback();
      const delay = FALLBACK_MIN_MS + Math.floor(Math.random() * FALLBACK_JITTER_MS);
      fallbackTimer.current = window.setTimeout(() => {
        if (disposed) return;
        if (document.visibilityState === 'visible') {
          window.dispatchEvent(new Event(ADMIN_REALTIME_REFRESH));
          setState('stale');
        }
        scheduleFallback();
      }, delay);
    };

    source.addEventListener('ready', () => {
      failures = 0;
      stopFallback();
      setState('live');
    });
    source.addEventListener('domain-event', (message) => {
      try {
        const event = JSON.parse((message as MessageEvent).data) as AdminDomainEvent;
        window.dispatchEvent(new CustomEvent(ADMIN_DOMAIN_EVENT, { detail: event }));
        setState('live');
      } catch {
        setState('stale');
      }
    });
    source.onerror = () => {
      failures += 1;
      setState(failures > 2 ? 'stale' : 'reconnecting');
      scheduleFallback();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && source.readyState !== EventSource.OPEN) {
        window.dispatchEvent(new Event(ADMIN_REALTIME_REFRESH));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      stopFallback();
      document.removeEventListener('visibilitychange', onVisibility);
      source.close();
    };
  }, []);

  const tone =
    state === 'live'
      ? 'bg-green-50 text-green-800'
      : state === 'stale'
        ? 'bg-red-50 text-red-800'
        : 'bg-amber-50 text-amber-800';
  return (
    <span
      className={`hidden rounded-full px-2 py-1 text-xs font-bold sm:inline-flex ${tone}`}
      role="status"
      aria-live="polite"
      title="Admin data connection"
    >
      {state === 'live' ? 'Live' : state === 'stale' ? 'Stale - polling' : 'Reconnecting'}
    </span>
  );
}
