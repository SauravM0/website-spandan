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
import remoteIntakeRoutes from './routes/remoteIntake';
import adminIntakeRoutes from './routes/adminIntake';
import adminPatientRecordRoutes from './routes/adminPatientRecords';
import adminMedicationRoutes from './routes/adminMedications';
import adminMedicalDocumentRoutes from './routes/adminMedicalDocuments';
import adminObservationRoutes from './routes/adminObservations';
import adminDeviceIntegrationRoutes from './routes/adminDeviceIntegrations';
import { validateCsrfToken, getCsrfToken } from './middleware/csrf';
import { requestId } from './middleware/requestId';
import { requestTelemetry } from './middleware/requestTelemetry';
import { pool, query } from './config/database';
import { logger } from './utils/logger';
import { publicPrivacyRouter, adminPrivacyRouter } from './routes/privacySecurity';
import diagnosticTestsRoutes from './routes/diagnosticTests';
import adminDiagnosticTestsRoutes from './routes/adminDiagnosticTests';
import telemetryRoutes from './routes/telemetry';
import {
  createApplicationLifecycle,
  CachedHealthProbe,
  installTerminationHandlers,
  ReadinessState,
} from './lifecycle/applicationLifecycle';

const app = express();
export const readiness = new ReadinessState();
const databaseReadiness = new CachedHealthProbe(async () => {
  await query('SELECT 1');
}, 1_000);

app.set('trust proxy', 1);
app.use(requestId);
app.use(requestTelemetry);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      callback(null, config.corsOrigins.includes(normalizedOrigin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(validateCsrfToken);

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
  res.json({
    status: 'ok',
    version: process.env.APP_VERSION || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', async (_req, res) => {
  if (!readiness.isReady) {
    res.status(503).json({ status: 'not_ready', phase: readiness.current });
    return;
  }
  if (await databaseReadiness.run()) {
    res.json({
      status: 'ready',
      version: process.env.APP_VERSION || 'development',
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.warn('Readiness check failed', { error_code: 'DATABASE_NOT_READY' });
    res.status(503).json({ status: 'not_ready' });
  }
});

// Liveness and readiness are deliberately mounted before ordinary API rate limiting.
app.use('/api', globalLimiter);
app.use('/api', telemetryRoutes);

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
app.use('/api/public/enquiries', publicEnquiriesRoutes);
app.use('/api/enquiries', publicEnquiriesRoutes);
app.use('/api/youtube', publicGetLimiter, youtubeRoutes);
app.use('/api', operationsRoutes);
app.use('/api', diagnosticTestsRoutes);
app.use('/api/intake', remoteIntakeRoutes);
app.use('/api/privacy', publicPrivacyRouter);

// === Admin Routes (auth required) ===
app.use('/api/admin', adminAuthRoutes);
app.use('/api/auth', adminAuthRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/packages', adminPackagesRoutes);
app.use('/api/admin/operations', adminOperationsRoutes);
app.use('/api/admin/intake', adminIntakeRoutes);
app.use('/api/admin/patients', adminPatientRecordRoutes);
app.use('/api/admin/medications', adminMedicationRoutes);
app.use('/api/admin/documents', adminMedicalDocumentRoutes);
app.use('/api/admin/observations', adminObservationRoutes);
app.use('/api/admin/device-integrations', adminDeviceIntegrationRoutes);
app.use('/api/admin/diagnostic-tests', adminDiagnosticTestsRoutes);
app.use('/api/admin/privacy-security', adminPrivacyRouter);

// Error handler
app.use(errorHandler);

const idleBackground = {
  stopAccepting: async () => {},
  drain: async () => {},
};

export function startApplication() {
  if (
    !Number.isInteger(config.shutdownTimeoutMs) ||
    config.shutdownTimeoutMs <= 0 ||
    config.shutdownTimeoutMs > 29_000
  ) {
    throw new Error('SHUTDOWN_TIMEOUT_MS must be an integer between 1 and 29000.');
  }
  const background = idleBackground;
  const server = app.listen(config.port, '0.0.0.0', () => {
    readiness.markReady();
    logger.info('Server started', { port: config.port, env: config.env });
  });
  const lifecycle = createApplicationLifecycle({
    server,
    readiness,
    background,
    closeDatabase: () => pool.end(),
    timeoutMs: config.shutdownTimeoutMs,
    log: logger,
  });
  const removeTerminationHandlers = installTerminationHandlers(lifecycle);
  return { server, lifecycle, readiness, background, removeTerminationHandlers };
}

if (require.main === module) startApplication();

export default app;
