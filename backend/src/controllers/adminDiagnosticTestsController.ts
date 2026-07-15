import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { listAdminDiagnosticTests, updateDiagnosticTest } from '../services/diagnosticTests';
import { sendApiError } from '../utils/errors';

function handleError(res: Response, err: unknown) {
  const error = err as Error & { status?: number; code?: string };
  sendApiError(res, error.status || 500, error.code || 'DIAGNOSTIC_TEST_ADMIN_FAILED', error.status ? error.message : 'The diagnostic test catalogue could not be updated');
}

export async function list(req: AuthenticatedRequest, res: Response) {
  try {
    const tests = await listAdminDiagnosticTests({
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
    });
    res.json({ tests });
  } catch (err) { handleError(res, err); }
}

export async function update(req: AuthenticatedRequest, res: Response) {
  try {
    const test = await updateDiagnosticTest({ id: req.params.id, ...req.body });
    res.json({ test });
  } catch (err) { handleError(res, err); }
}
