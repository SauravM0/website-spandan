import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateZod } from '../middleware/validate';
import { PERMISSIONS } from '../security/permissions';
import * as intake from '../services/remoteIntake';

const router = Router(); router.use(authenticate);
const uuid = z.object({ id: z.string().uuid() });
router.post('/invitations', requirePermission(PERMISSIONS.INTAKE_WRITE), validateZod({ body: z.object({ doctor_id: z.string().uuid(), consultation_mode: z.enum(['in_person','video','phone']), contact_type: z.enum(['phone','email']), contact: z.string().min(6).max(254), preferred_language: z.enum(['en','hi','mr']).default('en'), expires_in_hours: z.number().int().min(1).max(168).optional(), earliest_preference_at: z.string().datetime().optional(), latest_preference_at: z.string().datetime().optional() }) }), asyncHandler(async (req: any,res) => res.status(201).json({ invitation: await intake.createInvitation(req.body,req.user.id) })));
router.post('/invitations/:id/revoke', requirePermission(PERMISSIONS.INTAKE_WRITE), validateZod({ params: uuid, body: z.object({ reason: z.string().min(3).max(500) }) }), asyncHandler(async (req: any,res) => res.json({ invitation: await intake.revokeInvitation(req.params.id,req.body.reason,req.user.id) })));
router.get('/reviews', requirePermission(PERMISSIONS.INTAKE_READ), validateZod({ query: z.object({ status: z.enum(['pending','in_review','information_requested','accepted','declined']).optional(), page: z.coerce.number().int().positive().optional(), page_size: z.coerce.number().int().min(1).max(50).optional() }) }), asyncHandler(async (req,res) => res.json(await intake.listReviews(req.query))));
router.get('/reviews/:id', requirePermission(PERMISSIONS.INTAKE_READ), validateZod({ params: uuid }), asyncHandler(async (req,res) => { res.setHeader('Cache-Control','no-store'); res.json({ review: await intake.getReview(req.params.id) }); }));
router.patch('/reviews/:id', requirePermission(PERMISSIONS.INTAKE_WRITE), validateZod({ params: uuid, body: z.object({ status: z.enum(['pending','in_review','information_requested','accepted','declined']), missing_information: z.array(z.string().min(1).max(200)).max(20).optional(), decision_note: z.string().max(2000).optional(), expected_version: z.number().int().positive() }) }), asyncHandler(async (req: any,res) => res.json({ review: await intake.updateReview(req.params.id,req.body,req.user.id) })));
export default router;
