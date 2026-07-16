'use client';

import { useEffect, useRef } from 'react';

export type AdminDomainEvent = {
  id: string;
  type: string;
  entity_id: string;
  version: number;
  occurred_at: string;
};

export const ADMIN_DOMAIN_EVENT = 'admin-domain-event';
export const ADMIN_REALTIME_REFRESH = 'admin-realtime-refresh';

export function useAdminRealtimeRefresh(types: string[], refresh: () => void, debounceMs = 250) {
  const refreshRef = useRef(refresh);
  const typesKey = types.join('|');
  refreshRef.current = refresh;

  useEffect(() => {
    const accepted = new Set(typesKey.split('|').filter(Boolean));
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => refreshRef.current(), debounceMs);
    };
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<AdminDomainEvent>).detail;
      if (detail && accepted.has(detail.type)) schedule();
    };
    const onFallback = () => schedule();
    window.addEventListener(ADMIN_DOMAIN_EVENT, onEvent);
    window.addEventListener(ADMIN_REALTIME_REFRESH, onFallback);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(ADMIN_DOMAIN_EVENT, onEvent);
      window.removeEventListener(ADMIN_REALTIME_REFRESH, onFallback);
    };
  }, [debounceMs, typesKey]);
}
