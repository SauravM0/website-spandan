import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRecentStepUp } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { validateZod } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { auditSensitiveAccess } from '../middleware/sensitiveAccessAudit';
import { PERMISSIONS } from '../security/permissions';
import { AppError } from '../utils/errors';
import * as records from '../services/patientRecord';
import * as documents from '../services/medicalDocuments';
import * as identityReviews from '../services/patientIdentityReview';

const router = Router();
router.use(authenticate);
const id = z.object({ id: z.string().uuid() });
const patientId = z.object({ patientId: z.string().uuid() });
const patientDocumentId = patientId.extend({ id: z.string().uuid() });
const identityReviewId = z.object({ reviewId: z.string().uuid() });
const identityReviewResolution = z.object({
  outcome: z.enum(['same_person', 'different_person', 'insufficient_evidence']),
  canonical_patient_id: z.string().uuid().optional(),
  confirmed_factors: z
    .array(z.enum(['name', 'date_of_birth', 'phone', 'authorized_identifier']))
    .max(4)
    .default([]),
  reason: z.string().trim().min(3).max(500),
  expected_version: z.number().int().positive(),
});
const encounter = z.object({
  appointment_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid(),
  type: z.string().min(2).max(40).default('consultation'),
  started_at: z.string().datetime().optional(),
});
const resource = z.object({
  encounter_id: z.string().uuid().optional(),
  resource_type: z.enum([
    'condition',
    'allergy',
    'observation',
    'diagnostic_report',
    'document',
    'procedure',
    'care_plan',
  ]),
  status: z.string().min(2).max(30),
  verification_status: z.enum([
    'unconfirmed',
    'provisional',
    'differential',
    'confirmed',
    'refuted',
    'entered_in_error',
  ]),
  code_system: z.string().url().max(120).optional(),
  code: z.string().max(120).optional(),
  display: z.string().min(1).max(500),
  value: z.record(z.unknown()).default({}),
  original_text: z.string().max(4000).optional(),
  source: z.enum(['patient', 'guardian', 'clinician', 'device', 'import']),
  confidentiality: z.enum(['normal', 'restricted']).default('normal'),
});
const note = z.object({
  note_id: z.string().uuid().optional(),
  encounter_id: z.string().uuid(),
  expected_version: z.number().int().min(0),
  body: z.string().min(1).max(50000),
  confidentiality: z.enum(['normal', 'restricted']).default('normal'),
});
function actor(req: any) {
  return { id: req.user.id, role: req.user.role, doctor_id: req.user.doctor_id };
}

router.get(
  '/',
  auditSensitiveAccess('patient.search', 'patient'),
  requirePermission(PERMISSIONS.PATIENTS_READ),
  validateZod({
    query: z.object({
      search: z.string().max(100).default(''),
      page_size: z.coerce.number().int().min(1).max(50).default(25),
      cursor: z.string().max(500).optional(),
    }),
  }),
  asyncHandler(async (req: any, res) =>
    res.json(
      await records.searchPatients(
        req.query.search,
        req.query.page_size,
        actor(req),
        req.query.cursor
      )
    )
  )
);
router.get(
  '/identity-reviews',
  requirePermission(PERMISSIONS.PATIENT_IDENTITY_REVIEW),
  validateZod({
    query: z.object({
      status: z
        .enum(['pending', 'same_person', 'different_person', 'insufficient_evidence'])
        .default('pending'),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  }),
  asyncHandler(async (req: any, res) =>
    res.json(await identityReviews.listIdentityReviews(req.query.status, req.query.limit))
  )
);
router.post(
  '/identity-reviews/:reviewId/resolution',
  requirePermission(PERMISSIONS.PATIENT_IDENTITY_REVIEW),
  requireRecentStepUp,
  validateZod({ params: identityReviewId, body: identityReviewResolution }),
  asyncHandler(async (req: any, res) => {
    const idempotencyKey = req.header('idempotency-key');
    if (!idempotencyKey)
      throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
    res.json({
      review: await identityReviews.resolveIdentityReview({
        reviewId: req.params.reviewId,
        outcome: req.body.outcome,
        canonicalPatientId: req.body.canonical_patient_id,
        confirmedFactors: req.body.confirmed_factors,
        reason: req.body.reason,
        expectedVersion: req.body.expected_version,
        actorStaffId: req.user.id,
        idempotencyKey,
      }),
    });
  })
);
router.get(
  '/:patientId/summary',
  auditSensitiveAccess('patient.summary.read', 'patient'),
  requirePermission(PERMISSIONS.PATIENTS_READ),
  validateZod({ params: patientId }),
  asyncHandler(async (req: any, res) =>
    res.json(await records.getPatientSummary(req.params.patientId, actor(req)))
  )
);
router.get(
  '/:patientId/appointments',
  auditSensitiveAccess('patient.appointments.read', 'patient'),
  requirePermission(PERMISSIONS.APPOINTMENTS_READ),
  validateZod({
    params: patientId,
    query: z.object({
      page_size: z.coerce.number().int().min(1).max(50).default(25),
      cursor: z.string().max(500).optional(),
    }),
  }),
  asyncHandler(async (req: any, res) =>
    res.json(
      await records.getPatientAppointments(
        req.params.patientId,
        actor(req),
        req.query.page_size,
        req.query.cursor
      )
    )
  )
);
router.get(
  '/:patientId/clinical/timeline',
  auditSensitiveAccess('patient.clinical.read', 'patient'),
  requirePermission(PERMISSIONS.CLINICAL_READ),
  validateZod({ params: patientId }),
  asyncHandler(async (req: any, res) =>
    res.json(await records.getPatientClinical(req.params.patientId, actor(req)))
  )
);
router.get(
  '/:patientId/documents',
  auditSensitiveAccess('patient.document.metadata.read', 'patient'),
  requirePermission(PERMISSIONS.DOCUMENTS_READ),
  validateZod({
    params: patientId,
    query: z.object({
      status: z
        .enum([
          'scanning',
          'rejected',
          'awaiting_review',
          'reviewed',
          'verified',
          'superseded',
          'deleted',
        ])
        .optional(),
      limit: z.coerce.number().int().min(1).max(50).default(25),
      cursor: z.string().datetime().optional(),
    }),
  }),
  asyncHandler(async (req: any, res) =>
    res.json(await documents.list({ ...req.query, patient_id: req.params.patientId }, actor(req)))
  )
);
router.get(
  '/:patientId/documents/:id/content',
  auditSensitiveAccess('patient.document.content.read', 'medical_document'),
  requirePermission(PERMISSIONS.DOCUMENTS_CONTENT_READ),
  validateZod({ params: patientDocumentId }),
  asyncHandler(async (req: any, res) => {
    const item = await documents.download(req.params.id, actor(req), req.params.patientId);
    res
      .set({
        'Content-Type': item.media_type,
        'Content-Length': String(item.data.length),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(item.original_filename)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(item.data);
  })
);
router.post(
  '/:patientId/encounters',
  auditSensitiveAccess('patient.clinical.write', 'patient'),
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateZod({ params: patientId, body: encounter }),
  asyncHandler(async (req: any, res) =>
    res.status(201).json({
      encounter: await records.createEncounter(req.params.patientId, req.body, actor(req)),
    })
  )
);
router.post(
  '/encounters/:id/close',
  auditSensitiveAccess('patient.clinical.write', 'encounter'),
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateZod({ params: id, body: z.object({ expected_version: z.number().int().positive() }) }),
  asyncHandler(async (req: any, res) =>
    res.json({
      encounter: await records.closeEncounter(req.params.id, req.body.expected_version, actor(req)),
    })
  )
);
router.post(
  '/:patientId/resources',
  auditSensitiveAccess('patient.clinical.write', 'patient'),
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateZod({ params: patientId, body: resource }),
  asyncHandler(async (req: any, res) => {
    const key = req.header('Idempotency-Key');
    if (!key || key.length > 100)
      throw new AppError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'A valid Idempotency-Key header is required'
      );
    res.status(201).json({
      resource: await records.createResource(req.params.patientId, req.body, actor(req), key),
    });
  })
);
router.put(
  '/:patientId/notes',
  auditSensitiveAccess('patient.clinical.write', 'patient'),
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateZod({ params: patientId, body: note }),
  asyncHandler(async (req: any, res) =>
    res.json({ note: await records.saveNote(req.params.patientId, req.body, actor(req)) })
  )
);
router.post(
  '/notes/:id/sign',
  auditSensitiveAccess('patient.clinical.write', 'clinical_note'),
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateZod({
    params: id,
    body: z.object({
      expected_version: z.number().int().positive(),
      confirm_patient_id: z.string().uuid(),
    }),
  }),
  asyncHandler(async (req: any, res) =>
    res.json({
      note: await records.signNote(
        req.params.id,
        req.body.expected_version,
        req.body.confirm_patient_id,
        actor(req)
      ),
    })
  )
);
router.post(
  '/notes/:id/amend',
  auditSensitiveAccess('patient.clinical.write', 'clinical_note'),
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validateZod({
    params: id,
    body: z.object({
      expected_version: z.number().int().positive(),
      body: z.string().min(1).max(50000),
      reason: z.string().min(5).max(1000),
      confidentiality: z.enum(['normal', 'restricted']).default('normal'),
    }),
  }),
  asyncHandler(async (req: any, res) =>
    res.status(201).json({ note: await records.amendNote(req.params.id, req.body, actor(req)) })
  )
);
export default router;
