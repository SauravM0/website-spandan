import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me } from '../controllers/adminAuthController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateCsrfToken } from '../middleware/csrf';
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
router.post('/logout', validateCsrfToken, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(me));

export default router;
