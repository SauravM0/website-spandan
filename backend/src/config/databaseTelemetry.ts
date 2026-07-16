import { createHash } from 'node:crypto';
import { logger } from '../utils/logger';

export type DatabaseTimingEvent = {
  kind: 'acquire' | 'query';
  service: 'api' | 'worker';
  durationMs: number;
  outcome: 'success' | 'error';
  operation?: string;
  fingerprint?: string;
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
};

export type DatabasePoolSnapshot = {
  acquisitionSampleCount: number;
  acquisitionP95Ms: number;
  querySampleCount: number;
  queryP95Ms: number;
  queryErrorCount: number;
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
};

const acquisitionSamples: number[] = [];
const querySamples: number[] = [];
let queryErrorCount = 0;
const maximumSamples = 2_000;
const defaultObserver = (event: DatabaseTimingEvent) => {
  if (event.outcome === 'error' || event.durationMs >= 1_000) {
    logger.warn('database.slow_or_failed', event);
  }
};
let observer: (event: DatabaseTimingEvent) => void = defaultObserver;

export function safeQueryIdentity(text: string): { operation: string; fingerprint: string } {
  const operation =
    text
      .trim()
      .match(/^([a-z]+)/i)?.[1]
      ?.toUpperCase() || 'UNKNOWN';
  return {
    operation,
    fingerprint: createHash('sha256').update(text).digest('hex').slice(0, 16),
  };
}

export function recordDatabaseTiming(event: DatabaseTimingEvent): void {
  if (event.kind === 'acquire') {
    acquisitionSamples.push(event.durationMs);
    if (acquisitionSamples.length > maximumSamples) acquisitionSamples.shift();
  } else {
    querySamples.push(event.durationMs);
    if (querySamples.length > maximumSamples) querySamples.shift();
    if (event.outcome === 'error') queryErrorCount += 1;
  }
  observer(event);
}

export function setDatabaseTimingObserver(next?: (event: DatabaseTimingEvent) => void): void {
  observer = next || defaultObserver;
}

function percentile95(samples: number[]): number {
  const ordered = [...samples].sort((a, b) => a - b);
  return ordered.length ? ordered[Math.ceil(ordered.length * 0.95) - 1] : 0;
}

export function databasePoolSnapshot(pool: {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}): DatabasePoolSnapshot {
  return {
    acquisitionSampleCount: acquisitionSamples.length,
    acquisitionP95Ms: percentile95(acquisitionSamples),
    querySampleCount: querySamples.length,
    queryP95Ms: percentile95(querySamples),
    queryErrorCount,
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };
}

export function resetDatabaseTimingForTests(): void {
  acquisitionSamples.length = 0;
  querySamples.length = 0;
  queryErrorCount = 0;
}
