import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as adminLeadsController from '../controllers/adminLeadsController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.LEADS_READ), asyncHandler(adminLeadsController.listLeads));
router.get('/:id', requirePermission(PERMISSIONS.LEADS_READ), asyncHandler(adminLeadsController.getLeadById));

router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.LEADS_WRITE),
  [
    body('new_status').notEmpty().withMessage('new_status is required'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be at most 1000 characters'),
    body('expected_version').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('expected_version must be a positive integer'),
  ],
  validate,
  asyncHandler(adminLeadsController.updateLeadStatus)
);

export default router;
