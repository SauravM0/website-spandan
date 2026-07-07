import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { apiErrorBody, AppError, FieldErrors } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json(apiErrorBody(err.code, err.message, err.fieldErrors, res.locals.requestId));
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: FieldErrors = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || 'body';
      fieldErrors[field] = [...(fieldErrors[field] || []), issue.message];
    }
    res.status(400).json(apiErrorBody('VALIDATION_FAILED', 'Request validation failed', fieldErrors, res.locals.requestId));
    return;
  }

  logger.error('Unhandled request error', {
    error: err.message,
    method: req.method,
    path: req.path,
    requestId: res.locals.requestId,
  });
  res.status(500).json({
    ...apiErrorBody('INTERNAL_SERVER_ERROR', 'Internal server error', {}, res.locals.requestId),
    ...(config.env === 'development' && { detail: err.message }),
  });
}
