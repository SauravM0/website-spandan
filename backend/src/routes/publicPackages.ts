import { Router } from 'express';
import * as publicPackagesController from '../controllers/publicPackagesController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/', asyncHandler(publicPackagesController.listPackages));
router.get('/featured', asyncHandler(publicPackagesController.featured));
router.get('/:slug', asyncHandler(publicPackagesController.getPackageDetail));

export default router;
