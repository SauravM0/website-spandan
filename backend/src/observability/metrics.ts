import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

type HttpObservation = {
  method: string;
  route: string;
  status: number;
  durationMs: number;
};

export type WebVitalName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

type WebVitalObservation = {
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  routeGroup: string;
};

const maximumSamples = 2_000;
const maximumSeries = 250;
const durations: number[] = [];
const webVitalSamples = new Map<
  string,
  { name: WebVitalName; routeGroup: string; samples: number[] }
>();
const requestSeries = new Map<string, number>();
let totalRequests = 0;
let response4xx = 0;
let response5xx = 0;
let auth401 = 0;
let auth403 = 0;
let rateLimited429 = 0;
let bookingHolds = 0;
let bookingConfirmations = 0;
let bookingConflicts = 0;

const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();
const processStartedAt = performance.now();

const boundedPush = (samples: number[], value: number) => {
  samples.push(value);
  if (samples.length > maximumSamples) samples.shift();
};

const percentile = (samples: number[], value: number): number => {
  if (!samples.length) return 0;
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * value) - 1)];
};

export function normalizeMetricRoute(method: string, baseUrl: string, routePath?: unknown): string {
  const route = typeof routePath === 'string' ? `${baseUrl}${routePath}` : 'unmatched';
  if (!route.startsWith('/api/') || route.length > 160 || /[?#]/.test(route)) return 'unmatched';
  return `${method.toUpperCase()} ${route.replace(/\/+/, '/')}`;
}

export function observeHttp(observation: HttpObservation): void {
  totalRequests += 1;
  boundedPush(durations, Math.max(0, observation.durationMs));
  if (observation.status >= 400 && observation.status < 500) response4xx += 1;
  if (observation.status >= 500) response5xx += 1;
  if (observation.status === 401) auth401 += 1;
  if (observation.status === 403) auth403 += 1;
  if (observation.status === 429) rateLimited429 += 1;
  if (
    observation.status === 409 &&
    /booking|appointment|slot|hold/.test(observation.route.toLowerCase())
  )
    bookingConflicts += 1;

  const key = `${observation.method.toUpperCase()}|${observation.route}|${Math.floor(observation.status / 100)}xx`;
  if (requestSeries.has(key) || requestSeries.size < maximumSeries) {
    requestSeries.set(key, (requestSeries.get(key) || 0) + 1);
  }
}

export function observeBookingHold(): void {
  bookingHolds += 1;
}

export function observeBookingConfirmation(): void {
  bookingConfirmations += 1;
}

export function observeWebVital(observation: WebVitalObservation): void {
  const key = `${observation.name}|${observation.routeGroup}`;
  const series = webVitalSamples.get(key) || {
    name: observation.name,
    routeGroup: observation.routeGroup,
    samples: [],
  };
  boundedPush(series.samples, observation.value);
  webVitalSamples.set(key, series);
}

export function telemetrySnapshot() {
  const memory = process.memoryUsage();
  const webVitals = [...webVitalSamples.values()].map(({ name, routeGroup, samples }) => ({
    name,
    routeGroup,
    sampleCount: samples.length,
    p75: percentile(samples, 0.75),
  }));
  return {
    application: {
      version: process.env.APP_VERSION || 'development',
      processRole: process.env.PROCESS_ROLE || 'api',
      uptimeSeconds: Math.floor((performance.now() - processStartedAt) / 1_000),
    },
    http: {
      totalRequests,
      response4xx,
      response5xx,
      auth401,
      auth403,
      rateLimited429,
      latencySampleCount: durations.length,
      latencyMs: {
        p50: percentile(durations, 0.5),
        p95: percentile(durations, 0.95),
        p99: percentile(durations, 0.99),
      },
      series: [...requestSeries].map(([key, count]) => {
        const [method, route, statusClass] = key.split('|');
        return { method, route, statusClass, count };
      }),
    },
    process: {
      residentMemoryBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      eventLoopLagP95Ms: eventLoop.count ? eventLoop.percentile(95) / 1_000_000 : 0,
    },
    bookings: {
      holds: bookingHolds,
      confirmations: bookingConfirmations,
      conflicts: bookingConflicts,
      conversionRatio: bookingHolds ? bookingConfirmations / bookingHolds : 0,
    },
    webVitals,
  };
}

export function resetTelemetryForTests(): void {
  durations.length = 0;
  webVitalSamples.clear();
  requestSeries.clear();
  totalRequests = 0;
  response4xx = 0;
  response5xx = 0;
  auth401 = 0;
  auth403 = 0;
  rateLimited429 = 0;
  bookingHolds = 0;
  bookingConfirmations = 0;
  bookingConflicts = 0;
  eventLoop.reset();
}
