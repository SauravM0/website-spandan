import { Router } from 'express';
import { body } from 'express-validator';
import * as doctorController from '../controllers/doctorController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';

const router = Router();

// optionalAuth lets the list read a staff session when one is present, which
// the `?all=true` branch needs. Anonymous callers still reach the public list.
router.get('/', optionalAuth, asyncHandler(doctorController.list));
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

// The update route validates like the create route: without it the body went
// straight into the SQL builder, so a malformed or hostile field was only
// caught at the database layer.
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTENT_WRITE),
  [
    body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
    body('slug').optional().isString().trim().notEmpty().withMessage('Slug cannot be empty'),
    body('speciality')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Speciality cannot be empty'),
    body('qualifications').optional().isString(),
    body('bio').optional({ nullable: true }).isString(),
    body('photo_url').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  asyncHandler(doctorController.update)
);
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.CONTENT_WRITE), asyncHandler(doctorController.remove));

export default router;
