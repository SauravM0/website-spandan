import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import * as adminPackagesController from '../controllers/adminPackagesController';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/', adminPackagesController.listPackages);
router.get('/:id', adminPackagesController.getPackageDetail);
router.put('/:id', adminPackagesController.updatePackage);

export default router;
