import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireRecentStepUp } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as adminPackagesController from '../controllers/adminPackagesController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PACKAGES_READ),
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'inactive']),
    query('sort')
      .optional()
      .isIn([
        'order',
        'name_asc',
        'name_desc',
        'updated_desc',
        'updated_asc',
        'price_asc',
        'price_desc',
      ]),
  ],
  validate,
  asyncHandler(adminPackagesController.listPackages)
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PACKAGES_READ),
  asyncHandler(adminPackagesController.getPackageDetail)
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.PACKAGES_WRITE),
  requireRecentStepUp,
  [
    body('expected_version').isInt({ min: 1 }).withMessage('expected_version is required'),
    body('name').optional().notEmpty().withMessage('name cannot be empty'),
    body('base_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('base_price must be non-negative'),
    body('discounted_price')
      .optional({ values: 'null' })
      .isFloat({ min: 0 })
      .withMessage('discounted_price must be non-negative'),
    body('tax_rate')
      .optional({ values: 'null' })
      .isFloat({ min: 0, max: 100 })
      .withMessage('tax_rate must be between 0 and 100'),
    body('tests').optional().isArray().withMessage('tests must be an array'),
    body('tests.*.test_name')
      .if(body('tests').exists())
      .notEmpty()
      .withMessage('test_name is required'),
  ],
  validate,
  asyncHandler(adminPackagesController.updatePackage)
);

export default router;
