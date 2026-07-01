import { Router } from 'express';
import { body } from 'express-validator';
import * as packageController from '../controllers/packageController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', asyncHandler(packageController.list));
router.get('/featured', asyncHandler(packageController.featured));
router.get('/:slug', asyncHandler(packageController.getBySlug));

router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('base_price').isNumeric().withMessage('Price must be a number'),
  ],
  validate,
  asyncHandler(packageController.create)
);

router.put('/:id', authenticate, asyncHandler(packageController.update));
router.delete('/:id', authenticate, asyncHandler(packageController.remove));

export default router;
