import { Response } from 'express';

export type FieldErrors = Record<string, string[]>;

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fieldErrors: FieldErrors;
  };
  requestId?: string;
};

export class AppError extends Error {
  status: number;
  code: string;
  fieldErrors: FieldErrors;

  constructor(status: number, code: string, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function apiErrorBody(
  code: string,
  message: string,
  fieldErrors: FieldErrors = {},
  requestId?: string
): ApiErrorBody {
  return {
    error: { code, message, fieldErrors },
    ...(requestId ? { requestId } : {}),
  };
}

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fieldErrors: FieldErrors = {}
): void {
  res.status(status).json(apiErrorBody(code, message, fieldErrors, res.locals.requestId));
}

export function badRequest(res: Response, message: string): void {
  sendApiError(res, 400, 'BAD_REQUEST', message);
}

export function unauthorized(res: Response, message = 'Authentication required'): void {
  sendApiError(res, 401, 'UNAUTHORIZED', message);
}

export function forbidden(res: Response, message = 'Access denied'): void {
  sendApiError(res, 403, 'FORBIDDEN', message);
}

export function notFound(res: Response, message = 'Resource not found'): void {
  sendApiError(res, 404, 'NOT_FOUND', message);
}

export function tooMany(res: Response, message = 'Rate limit exceeded'): void {
  sendApiError(res, 429, 'RATE_LIMITED', message);
}

export function serverError(res: Response, message = 'Internal server error'): void {
  sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}
