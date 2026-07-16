'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

export function useLatestRequest() {
  const current = useRef<{ id: number; controller: AbortController } | null>(null);
  useEffect(() => () => current.current?.controller.abort(), []);

  return useCallback(async <T>(request: (signal: AbortSignal) => Promise<T>) => {
    current.current?.controller.abort();
    const state = {
      id: (current.current?.id || 0) + 1,
      controller: new AbortController(),
    };
    current.current = state;
    try {
      const result = await request(state.controller.signal);
      return current.current?.id === state.id ? result : undefined;
    } catch (error) {
      if (state.controller.signal.aborted || current.current?.id !== state.id) return undefined;
      throw error;
    }
  }, []);
}
