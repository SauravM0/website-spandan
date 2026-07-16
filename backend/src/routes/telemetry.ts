import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { config } from '../config';
import { observeWebVital, type WebVitalName, type WebVitalRating } from '../observability/metrics';
import { operationalSnapshot, renderPrometheus } from '../observability/operationalSnapshot';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const vitalNames = new Set<WebVitalName>(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
const ratings = new Set<WebVitalRating>(['good', 'needs-improvement', 'poor']);
const routeGroups = new Set([
  'admin',
  'booking-appointment',
  'booking-package',
  'packages',
  'doctors',
  'other-public',
]);

const digest = (value: string) => createHash('sha256').update(value).digest();

export function validMetricsAuthorization(configuredToken: string, authorization = ''): boolean {
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  return Boolean(
    configuredToken && supplied && timingSafeEqual(digest(supplied), digest(configuredToken))
  );
}

export function parseWebVital(input: unknown) {
  const body = (input || {}) as Record<string, unknown>;
  const { name, value, rating, routeGroup } = body;
  if (
    !vitalNames.has(name as WebVitalName) ||
    !ratings.has(rating as WebVitalRating) ||
    !routeGroups.has(String(routeGroup)) ||
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 600_000
  )
    return null;
  return {
    name: name as WebVitalName,
    value,
    rating: rating as WebVitalRating,
    routeGroup: String(routeGroup),
  };
}

export function requireMetricsToken(req: Request, res: Response, next: NextFunction): void {
  if (!config.metricsBearerToken) {
    res
      .status(503)
      .json({ error: { code: 'METRICS_NOT_CONFIGURED', message: 'Metrics unavailable.' } });
    return;
  }
  if (!validMetricsAuthorization(config.metricsBearerToken, req.header('authorization') || '')) {
    res.status(401).json({
      error: { code: 'METRICS_AUTHENTICATION_REQUIRED', message: 'Authentication required.' },
    });
    return;
  }
  next();
}

router.get(
  '/internal/metrics',
  requireMetricsToken,
  asyncHandler(async (_req, res) => {
    res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.send(renderPrometheus(await operationalSnapshot()));
  })
);

router.post('/telemetry/web-vitals', (req, res) => {
  const observation = parseWebVital(req.body);
  if (!observation) {
    res.status(400).json({ error: { code: 'INVALID_WEB_VITAL', message: 'Invalid metric.' } });
    return;
  }
  observeWebVital(observation);
  res.status(202).end();
});

export default router;
