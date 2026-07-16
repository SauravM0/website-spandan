import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  completeMfa,
  login,
  logout,
  me,
  revokeSession,
  sessions,
  stepUp,
} from '../controllers/adminAuthController';
import { authenticate, requireRecentStepUp } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendApiError } from '../utils/errors';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (_req, res) => {
    sendApiError(res, 429, 'RATE_LIMITED', 'Too many login attempts. Please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, asyncHandler(login));
router.post('/mfa/verify', loginLimiter, asyncHandler(completeMfa));
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(me));
router.post('/step-up', authenticate, loginLimiter, asyncHandler(stepUp));
router.get(
  '/sessions',
  authenticate,
  requirePermission(PERMISSIONS.SECURITY_ADMIN),
  asyncHandler(sessions)
);
router.post(
  '/sessions/:id/revoke',
  authenticate,
  requirePermission(PERMISSIONS.SECURITY_ADMIN),
  requireRecentStepUp,
  asyncHandler(revokeSession)
);
router.post(
  '/password/change',
  authenticate,
  requirePermission(PERMISSIONS.SECURITY_ADMIN),
  requireRecentStepUp,
  asyncHandler(changePassword)
);

export default router;
