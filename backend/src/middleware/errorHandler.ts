import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { UnknownColumnError } from '../persistence/sqlBuilders';
import { apiErrorBody, AppError, FieldErrors } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json(apiErrorBody(err.code, err.message, err.fieldErrors, res.locals.requestId));
    return;
  }

  // A write naming a column the table does not accept is a bad request, not a
  // server fault: surfacing it as a 500 would hide a caller's mistake and log
  // noise for something the client can correct.
  if (err instanceof UnknownColumnError) {
    res
      .status(400)
      .json(apiErrorBody('UNKNOWN_FIELD', err.message, {}, res.locals.requestId));
    return;
  }

  // body-parser reports client-side body problems with a `type` and `status`
  // of its own. These are the caller's fault, so they get a 4xx that names the
  // problem, and the parser's internal message is withheld from the response.
  const parserError = err as Error & { type?: string; status?: number };
  if (parserError.type === 'entity.parse.failed') {
    res.status(400).json(apiErrorBody('INVALID_JSON', 'Request body is not valid JSON', {}, res.locals.requestId));
    return;
  }
  if (parserError.type === 'entity.too.large') {
    res.status(413).json(apiErrorBody('PAYLOAD_TOO_LARGE', 'Request body is too large', {}, res.locals.requestId));
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
