import { Router } from 'express';
import { body } from 'express-validator';
import * as packageController from '../controllers/packageController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', packageController.list);
router.get('/featured', packageController.featured);
router.get('/:slug', packageController.getBySlug);

router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('base_price').isNumeric().withMessage('Price must be a number'),
  ],
  validate,
  packageController.create
);

router.put('/:id', authenticate, packageController.update);
router.delete('/:id', authenticate, packageController.remove);

export default router;
