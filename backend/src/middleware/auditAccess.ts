import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/** Records consequential reads after the response without delaying it. */
export function auditAccess(action: string, entityType: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    res.once('finish', () => {
      if (!req.user || res.statusCode >= 400) return;
      void query(
        `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, action, entityType, req.params.id || req.params.patientId || null, JSON.stringify({ request_id: res.locals.requestId })]
      ).catch((error: Error) => logger.error('Audit access persistence failed', {
        requestId: res.locals.requestId, action, error: error.message,
      }));
    });
    next();
  };
}
