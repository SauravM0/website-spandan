import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth';
import { roleHasPermission, type Permission } from '../security/permissions';
import { forbidden, unauthorized } from '../utils/errors';

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorized(res);
      return;
    }
    if (!roleHasPermission(req.user.role, permission)) {
      forbidden(res, 'You do not have permission to perform this action');
      return;
    }
    next();
  };
}
