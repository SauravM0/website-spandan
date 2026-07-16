import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRecentStepUp } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/authorize';
import { validateZod } from '../middleware/validate';
import { PERMISSIONS } from '../security/permissions';
import { diagnosticTestFiltersSchema, diagnosticTestUpdateSchema } from '../utils/validation';
import * as controller from '../controllers/adminDiagnosticTestsController';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PRICING_READ),
  validateZod({ query: diagnosticTestFiltersSchema }),
  asyncHandler(controller.list)
);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRICING_WRITE),
  requireRecentStepUp,
  validateZod({ params: z.object({ id: z.string().uuid() }), body: diagnosticTestUpdateSchema }),
  asyncHandler(controller.update)
);

export default router;
