import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { normalizeMetricRoute, observeHttp } from '../observability/metrics';

export function requestTelemetry(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  res.setHeader('x-app-version', process.env.APP_VERSION || 'development');
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const matched = res.locals.metricRoute as
      | { baseUrl?: string; path?: unknown }
      | undefined;
    const route = normalizeMetricRoute(
      req.method,
      matched?.baseUrl ?? req.baseUrl,
      matched?.path ?? req.route?.path
    );
    observeHttp({ method: req.method, route, status: res.statusCode, durationMs });
    if (route.includes('/api/admin/') || res.statusCode >= 500 || durationMs >= 1_000) {
      logger.info('http.request.completed', {
        requestId: res.locals.requestId,
        method: req.method,
        route,
        status: res.statusCode,
        duration_ms: Math.round(durationMs),
        version: process.env.APP_VERSION || 'development',
      });
    }
  });
  next();
}
