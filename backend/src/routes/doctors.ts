import { Router } from 'express';
import { body } from 'express-validator';
import * as doctorController from '../controllers/doctorController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', asyncHandler(doctorController.list));
router.get('/:slug', asyncHandler(doctorController.getBySlug));

router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('speciality').notEmpty().withMessage('Speciality is required'),
  ],
  validate,
  asyncHandler(doctorController.create)
);

router.put('/:id', authenticate, asyncHandler(doctorController.update));
router.delete('/:id', authenticate, asyncHandler(doctorController.remove));

export default router;
