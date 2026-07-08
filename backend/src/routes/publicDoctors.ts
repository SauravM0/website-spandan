import { Router } from 'express';
import * as publicDoctorsController from '../controllers/publicDoctorsController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/', asyncHandler(publicDoctorsController.listDoctors));
router.get('/:slug', asyncHandler(publicDoctorsController.getDoctorDetail));

export default router;
