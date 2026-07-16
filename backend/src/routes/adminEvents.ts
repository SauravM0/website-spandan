import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';
import { openAdminEventStream } from '../services/adminEventStream';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), (req, res) => {
  void openAdminEventStream(req as AuthenticatedRequest, res).catch(() => {
    if (!res.headersSent) res.status(500).json({ error: 'Could not open event stream' });
    else res.end();
  });
});

export default router;
