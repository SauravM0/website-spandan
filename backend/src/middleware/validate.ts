import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ZodError, ZodTypeAny, z } from 'zod';
import { FieldErrors, sendApiError } from '../utils/errors';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors: FieldErrors = {};
    for (const error of errors.array()) {
      const field = 'path' in error ? String(error.path) : 'request';
      fieldErrors[field] = [...(fieldErrors[field] || []), error.msg];
    }
    sendApiError(res, 400, 'VALIDATION_FAILED', 'Request validation failed', fieldErrors);
    return;
  }
  next();
}

type RequestSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validateZod(schemas: RequestSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query;
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FieldErrors = {};
        for (const issue of err.issues) {
          const field = issue.path.join('.') || 'request';
          fieldErrors[field] = [...(fieldErrors[field] || []), issue.message];
        }
        sendApiError(res, 400, 'VALIDATION_FAILED', 'Request validation failed', fieldErrors);
        return;
      }
      next(err);
    }
  };
}

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});
