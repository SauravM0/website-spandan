import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateZod } from '../middleware/validate';
import * as intake from '../services/remoteIntake';

const router = Router();
const tokenParams = z.object({ token: z.string().min(32).max(128) });
const reportedMedication=z.object({original_text:z.string().trim().min(1).max(4000),display:z.string().trim().max(500),dose:z.string().trim().max(40),unit:z.string().trim().max(40),timing:z.string().trim().max(255),unknown_details:z.string().trim().max(1000),source:z.literal('patient')}).superRefine((value,ctx)=>{if((value.dose==='')!==(value.unit===''))ctx.addIssue({code:z.ZodIssueCode.custom,path:['dose'],message:'Dose number and unit must both be supplied, or both left unknown.'});});
const intakePayload=z.object({medications:z.array(reportedMedication).max(50).optional()}).passthrough();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

router.get('/:token', validateZod({ params: tokenParams }), asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.json({ invitation: await intake.getInvitationPublic(req.params.token) });
}));
router.post('/:token/verification', validateZod({ params: tokenParams }), asyncHandler(async (req, res) => {
  res.status(201).json({ verification: await intake.startVerification(req.params.token, { ip: req.ip, userAgent: req.get('user-agent') }) });
}));
router.post('/:token/verification/confirm', validateZod({ params: tokenParams, body: z.object({ verification_id: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }) }), asyncHandler(async (req, res) => {
  res.json({ session: await intake.verifyContact(req.params.token, req.body.verification_id, req.body.code) });
}));
const bearer = (req: any) => String(req.get('authorization')).slice(7);
router.get('/:token/draft', validateZod({ params: tokenParams }), asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.json({ draft: await intake.loadDraft(req.params.token, bearer(req)) });
}));
router.put('/:token/draft', validateZod({ params: tokenParams, body: z.object({ expected_version: z.number().int().min(0), data: intakePayload }) }), asyncHandler(async (req, res) => {
  res.json({ draft: await intake.saveDraft(req.params.token, bearer(req), req.body.data, req.body.expected_version) });
}));
router.post('/:token/submit', validateZod({ params: tokenParams, body: z.object({ expected_version: z.number().int().positive() }) }), asyncHandler(async (req, res) => {
  res.json({ submission: await intake.submit(req.params.token, bearer(req), req.body.expected_version) });
}));
router.post('/:token/uploads', validateZod({ params: tokenParams, body: z.object({ file_name: z.string().min(1).max(200), mime_type: z.enum(['application/pdf','image/jpeg','image/png']), size_bytes: z.number().int().positive().max(10485760) }) }), asyncHandler(async (req, res) => {
  res.status(201).json({ upload: await intake.createUploadIntent(req.params.token, bearer(req), req.body) });
}));
export default router;
