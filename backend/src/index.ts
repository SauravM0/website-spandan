import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import packagesRoutes from './routes/packages';
import publicPackagesRoutes from './routes/publicPackages';
import doctorsRoutes from './routes/doctors';
import publicDoctorsRoutes from './routes/publicDoctors';
import publicArticlesRoutes from './routes/publicArticles';
import publicEnquiriesRoutes from './routes/publicEnquiries';
import youtubeRoutes from './routes/youtube';
import adminAuthRoutes from './routes/adminAuth';
import adminLeadsRoutes from './routes/adminLeads';
import adminPackagesRoutes from './routes/adminPackages';
import operationsRoutes from './routes/operations';
import adminOperationsRoutes from './routes/adminOperations';
import { startBackgroundJobs } from './services/background';
import { validateCsrfToken, getCsrfToken } from './middleware/csrf';
import { requestId } from './middleware/requestId';
import { query } from './config/database';
import { logger } from './utils/logger';

const app = express();

app.set('trust proxy', 1);
app.use(requestId);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    callback(null, config.corsOrigins.includes(normalizedOrigin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Global rate limit for all /api routes (backstop)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: (_req: Request, res: Response) => ({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
      fieldErrors: {},
    },
    requestId: res.locals.requestId,
  }),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Stricter rate limit for public GET routes (Section 3.1 - 100 req/min)
const publicGetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: (_req: Request, res: Response) => ({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
      fieldErrors: {},
    },
    requestId: res.locals.requestId,
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Readiness check failed', { error: (err as Error).message });
    res.status(503).json({ status: 'not_ready' });
  }
});

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// === Public Routes (no auth required) ===
// Mounted at both /api/public/* and /api/* for frontend compatibility
app.use('/api/public/packages', publicGetLimiter, publicPackagesRoutes);
app.use('/api/packages', publicGetLimiter, packagesRoutes);
app.use('/api/public/doctors', publicGetLimiter, publicDoctorsRoutes);
app.use('/api/doctors', publicGetLimiter, doctorsRoutes);
app.use('/api/public/articles', publicGetLimiter, publicArticlesRoutes);
app.use('/api/articles', publicGetLimiter, publicArticlesRoutes);
app.use('/api/public/enquiries', validateCsrfToken, publicEnquiriesRoutes);
app.use('/api/enquiries', validateCsrfToken, publicEnquiriesRoutes);
app.use('/api/youtube', publicGetLimiter, youtubeRoutes);
app.use('/api', operationsRoutes);

// === Admin Routes (auth required) ===
app.use('/api/admin', adminAuthRoutes);
app.use('/api/auth', adminAuthRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/packages', adminPackagesRoutes);
app.use('/api/admin/operations', adminOperationsRoutes);

// Error handler
app.use(errorHandler);

// Background jobs (not in test mode)
if (config.env !== 'test') {
  startBackgroundJobs();
}

app.listen(config.port, () => {
  logger.info('Server started', { port: config.port, env: config.env });
});

export default app;
