import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { validateZod } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { PERMISSIONS } from '../security/permissions';
import { AppError } from '../utils/errors';
import * as records from '../services/patientRecord';

const router=Router(); router.use(authenticate);
const id=z.object({id:z.string().uuid()});
const patientId=z.object({patientId:z.string().uuid()});
const encounter=z.object({appointment_id:z.string().uuid().optional(),doctor_id:z.string().uuid(),type:z.string().min(2).max(40).default('consultation'),started_at:z.string().datetime().optional()});
const resource=z.object({encounter_id:z.string().uuid().optional(),resource_type:z.enum(['condition','allergy','observation','diagnostic_report','document','procedure','care_plan']),status:z.string().min(2).max(30),verification_status:z.enum(['unconfirmed','provisional','differential','confirmed','refuted','entered_in_error']),code_system:z.string().url().max(120).optional(),code:z.string().max(120).optional(),display:z.string().min(1).max(500),value:z.record(z.unknown()).default({}),original_text:z.string().max(4000).optional(),source:z.enum(['patient','guardian','clinician','device','import']),confidentiality:z.enum(['normal','restricted']).default('normal')});
const note=z.object({note_id:z.string().uuid().optional(),encounter_id:z.string().uuid(),expected_version:z.number().int().min(0),body:z.string().min(1).max(50000),confidentiality:z.enum(['normal','restricted']).default('normal')});
function actor(req:any){ return {id:req.user.id,role:req.user.role,doctor_id:req.user.doctor_id}; }

router.get('/',requirePermission(PERMISSIONS.PATIENTS_READ),validateZod({query:z.object({search:z.string().max(100).default(''),page_size:z.coerce.number().int().min(1).max(50).default(25),cursor:z.string().datetime().optional()})}),asyncHandler(async(req:any,res)=>res.json(await records.searchPatients(req.query.search,req.query.page_size,req.query.cursor))));
router.get('/:patientId',requirePermission(PERMISSIONS.PATIENTS_READ),validateZod({params:patientId}),asyncHandler(async(req:any,res)=>res.json(await records.getPatient(req.params.patientId,actor(req)))));
router.post('/:patientId/encounters',requirePermission(PERMISSIONS.CLINICAL_WRITE),validateZod({params:patientId,body:encounter}),asyncHandler(async(req:any,res)=>res.status(201).json({encounter:await records.createEncounter(req.params.patientId,req.body,actor(req))})));
router.post('/encounters/:id/close',requirePermission(PERMISSIONS.CLINICAL_WRITE),validateZod({params:id,body:z.object({expected_version:z.number().int().positive()})}),asyncHandler(async(req:any,res)=>res.json({encounter:await records.closeEncounter(req.params.id,req.body.expected_version,actor(req))})));
router.post('/:patientId/resources',requirePermission(PERMISSIONS.CLINICAL_WRITE),validateZod({params:patientId,body:resource}),asyncHandler(async(req:any,res)=>{const key=req.header('Idempotency-Key');if(!key||key.length>100)throw new AppError(400,'IDEMPOTENCY_KEY_REQUIRED','A valid Idempotency-Key header is required');res.status(201).json({resource:await records.createResource(req.params.patientId,req.body,actor(req),key)});}));
router.put('/:patientId/notes',requirePermission(PERMISSIONS.CLINICAL_WRITE),validateZod({params:patientId,body:note}),asyncHandler(async(req:any,res)=>res.json({note:await records.saveNote(req.params.patientId,req.body,actor(req))})));
router.post('/notes/:id/sign',requirePermission(PERMISSIONS.CLINICAL_WRITE),validateZod({params:id,body:z.object({expected_version:z.number().int().positive(),confirm_patient_id:z.string().uuid()})}),asyncHandler(async(req:any,res)=>res.json({note:await records.signNote(req.params.id,req.body.expected_version,req.body.confirm_patient_id,actor(req))})));
router.post('/notes/:id/amend',requirePermission(PERMISSIONS.CLINICAL_WRITE),validateZod({params:id,body:z.object({expected_version:z.number().int().positive(),body:z.string().min(1).max(50000),reason:z.string().min(5).max(1000),confidentiality:z.enum(['normal','restricted']).default('normal')})}),asyncHandler(async(req:any,res)=>res.status(201).json({note:await records.amendNote(req.params.id,req.body,actor(req))})));
export default router;
