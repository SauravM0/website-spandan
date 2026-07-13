import { Router } from 'express';
import { body } from 'express-validator';
import * as packageController from '../controllers/packageController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';

const router = Router();

router.get('/', asyncHandler(packageController.list));
router.get('/featured', asyncHandler(packageController.featured));
router.get('/:slug', asyncHandler(packageController.getBySlug));

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PACKAGES_WRITE),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('base_price').isNumeric().withMessage('Price must be a number'),
  ],
  validate,
  asyncHandler(packageController.create)
);

router.put('/:id', authenticate, requirePermission(PERMISSIONS.PACKAGES_WRITE), asyncHandler(packageController.update));
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.PACKAGES_WRITE), asyncHandler(packageController.remove));

export default router;
