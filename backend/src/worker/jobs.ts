import { query } from '../config/database';
import { processJobs as processDocumentJobs } from '../services/medicalDocuments';
import type { WorkerJobHandler } from './runtime';

export function createWorkerJobHandlers(): Record<string, WorkerJobHandler> {
  return {
    'document-processing': async () => {
      await query(
        `UPDATE document_processing_jobs
         SET status = 'failed', available_at = NOW(), lease_owner = NULL,
             lease_token = NULL, lease_expires_at = NULL, last_error_code = 'WORKER_LEASE_EXPIRED',
             updated_at = NOW()
         WHERE status = 'running' AND locked_at <= NOW() - INTERVAL '30 seconds'`
      );
      await processDocumentJobs();
    },
  };
}
