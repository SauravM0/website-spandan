import { Router } from 'express';
import * as publicDoctorsController from '../controllers/publicDoctorsController';

const router = Router();

router.get('/', publicDoctorsController.listDoctors);

export default router;
