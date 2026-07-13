import express, { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { validateZod } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { auditAccess } from '../middleware/auditAccess';
import { PERMISSIONS } from '../security/permissions';
import { AppError } from '../utils/errors';
import * as documents from '../services/medicalDocuments';

const router=Router(); router.use(authenticate);
const uuid=z.string().uuid();
const upload=z.object({patient_id:uuid,encounter_id:uuid.optional(),category:z.enum(['lab_report','imaging','prescription','discharge_summary','referral','insurance','other']),filename:z.string().min(1).max(180),media_type:z.enum(['application/pdf','image/jpeg','image/png']),source:z.enum(['patient','guardian','staff','import']),authored_on:z.string().date().optional(),facility:z.string().trim().min(1).max(300).optional(),confidentiality:z.enum(['normal','restricted']).default('normal')});
function actor(req:any){return {id:req.user.id,role:req.user.role,doctor_id:req.user.doctor_id};}
router.get('/',requirePermission(PERMISSIONS.DOCUMENTS_READ),validateZod({query:z.object({patient_id:uuid.optional(),status:z.enum(['scanning','rejected','awaiting_review','reviewed','verified','superseded','deleted']).optional(),limit:z.coerce.number().int().min(1).max(50).default(25),cursor:z.string().datetime().optional()})}),auditAccess('document.list','medical_document'),asyncHandler(async(req:any,res)=>res.json(await documents.list(req.query,actor(req)))));
router.post('/upload',requirePermission(PERMISSIONS.DOCUMENTS_UPLOAD),express.raw({type:['application/pdf','image/jpeg','image/png'],limit:'11mb'}),validateZod({query:upload}),asyncHandler(async(req:any,res)=>{const key=req.header('Idempotency-Key');if(!key||key.length>100)throw new AppError(400,'IDEMPOTENCY_KEY_REQUIRED','A valid Idempotency-Key header is required.');if(!Buffer.isBuffer(req.body))throw new AppError(400,'DOCUMENT_BODY_REQUIRED','Document bytes are required.');res.status(202).json({document:await documents.upload(req.query.patient_id,req.query,req.body,actor(req),key)});}));
router.post('/:id/review',requirePermission(PERMISSIONS.DOCUMENTS_REVIEW),validateZod({params:z.object({id:uuid}),body:z.object({expected_version:z.number().int().positive(),decision:z.enum(['review','verify','reject']),notes:z.string().trim().min(5).max(2000)})}),asyncHandler(async(req:any,res)=>res.json({document:await documents.review(req.params.id,req.body,actor(req))})));
router.get('/:id/download',requirePermission(PERMISSIONS.DOCUMENTS_READ),validateZod({params:z.object({id:uuid})}),asyncHandler(async(req:any,res)=>{const item=await documents.download(req.params.id,actor(req));res.set({'Content-Type':item.media_type,'Content-Length':String(item.data.length),'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(item.original_filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(item.data);}));
export default router;
