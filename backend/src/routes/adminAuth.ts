import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me } from '../controllers/adminAuthController';
import { authenticate } from '../middleware/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
