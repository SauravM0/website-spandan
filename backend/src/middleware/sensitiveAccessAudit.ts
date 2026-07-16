import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export function auditSensitiveAccess(action: string, entityType: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    res.once('finish', () => {
      if (!req.user || ![200, 201, 202, 204, 403].includes(res.statusCode)) return;
      const outcome = res.statusCode === 403 ? 'denied' : 'success';
      void query(
        `INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata)
         VALUES($1,$2,$3,$4,$5)`,
        [
          req.user.id,
          `${action}.${outcome}`,
          entityType,
          req.params.id || req.params.patientId || null,
          JSON.stringify({
            request_id: res.locals.requestId,
            outcome,
            status_code: res.statusCode,
          }),
        ]
      ).catch((error: Error) =>
        logger.error('Sensitive access audit persistence failed', {
          requestId: res.locals.requestId,
          action,
          error: error.message,
        })
      );
    });
    next();
  };
}
