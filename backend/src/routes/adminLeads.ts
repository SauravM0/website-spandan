import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as adminLeadsController from '../controllers/adminLeadsController';

const router = Router();

router.use(authenticate);

router.get('/', adminLeadsController.listLeads);
router.get('/:id', adminLeadsController.getLeadById);

router.patch(
  '/:id/status',
  [body('new_status').notEmpty().withMessage('new_status is required')],
  validate,
  adminLeadsController.updateLeadStatus
);

export default router;
