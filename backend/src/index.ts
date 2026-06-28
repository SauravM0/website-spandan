import express from 'express';
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
import { startBackgroundJobs } from './services/background';
import { validateCsrfToken, getCsrfToken } from './middleware/csrf';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// Global rate limit for all /api routes (backstop)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Stricter rate limit for public GET routes (Section 3.1 - 100 req/min)
const publicGetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// === Admin Routes (auth required) ===
app.use('/api/admin', adminAuthRoutes);
app.use('/api/auth', adminAuthRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/packages', adminPackagesRoutes);

// Error handler
app.use(errorHandler);

// Background jobs (not in test mode)
if (config.env !== 'test') {
  startBackgroundJobs();
}

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.env} mode`);
});

export default app;
