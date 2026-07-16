import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateZod } from '../middleware/validate';
import { customTestOrderSchema, diagnosticTestFiltersSchema } from '../utils/validation';
import * as controller from '../controllers/diagnosticTestsController';
import { requirePublicCommerceAccess } from '../middleware/publicRelease';

const router = Router();

router.get(
  '/diagnostic-tests',
  validateZod({ query: diagnosticTestFiltersSchema }),
  asyncHandler(controller.catalog)
);
router.post(
  '/custom-test-orders',
  requirePublicCommerceAccess,
  validateZod({ body: customTestOrderSchema }),
  asyncHandler(controller.createOrder)
);

export default router;
