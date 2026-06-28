import { Router } from 'express';
import * as publicPackagesController from '../controllers/publicPackagesController';

const router = Router();

router.get('/', publicPackagesController.listPackages);
router.get('/featured', publicPackagesController.featured);
router.get('/:slug', publicPackagesController.getPackageDetail);

export default router;
