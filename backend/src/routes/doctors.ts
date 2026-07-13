import { Router } from 'express';
import { body } from 'express-validator';
import * as doctorController from '../controllers/doctorController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';

const router = Router();

router.get('/', asyncHandler(doctorController.list));
router.get('/:slug', asyncHandler(doctorController.getBySlug));

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CONTENT_WRITE),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('speciality').notEmpty().withMessage('Speciality is required'),
  ],
  validate,
  asyncHandler(doctorController.create)
);

router.put('/:id', authenticate, requirePermission(PERMISSIONS.CONTENT_WRITE), asyncHandler(doctorController.update));
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.CONTENT_WRITE), asyncHandler(doctorController.remove));

export default router;
