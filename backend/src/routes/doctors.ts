import { Router } from 'express';
import { body } from 'express-validator';
import * as doctorController from '../controllers/doctorController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', doctorController.list);
router.get('/:slug', doctorController.getBySlug);

router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('speciality').notEmpty().withMessage('Speciality is required'),
  ],
  validate,
  doctorController.create
);

router.put('/:id', authenticate, doctorController.update);
router.delete('/:id', authenticate, doctorController.remove);

export default router;
