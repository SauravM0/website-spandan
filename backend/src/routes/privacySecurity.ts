import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { validateZod } from '../middleware/validate';
import { PERMISSIONS } from '../security/permissions';
import * as service from '../services/privacySecurity';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors';

export const publicPrivacyRouter=Router();
const rightsLimiter=rateLimit({windowMs:60*60*1000,max:10,standardHeaders:true,legacyHeaders:false});
const requestSchema=z.object({request_type:z.enum(['access','correction','consent_withdrawal','export','deletion','restriction','complaint']),requester_name:z.string().trim().min(2).max(150),contact_email:z.string().email().max(254).optional(),contact_phone:z.string().regex(/^\+?[0-9 ()-]{8,20}$/).optional(),relationship:z.enum(['self','parent_guardian','authorised_proxy','other']),request_details:z.string().trim().min(10).max(4000)}).refine(v=>v.contact_email||v.contact_phone,{message:'Email or phone is required'});
publicPrivacyRouter.post('/rights-requests',rightsLimiter,validateZod({body:requestSchema}),asyncHandler(async(req,res)=>{const key=req.header('Idempotency-Key');if(!key||key.length>100) throw new AppError(400,'IDEMPOTENCY_KEY_REQUIRED','A valid Idempotency-Key is required');res.status(202).json({request:await service.submitRightsRequest(req.body,key),message:'Request received. The clinic will verify your identity before taking any action.'});}));

export const adminPrivacyRouter=Router(); adminPrivacyRouter.use(authenticate);
adminPrivacyRouter.get('/rights-requests',requirePermission(PERMISSIONS.PRIVACY_REQUESTS_READ),validateZod({query:z.object({status:z.enum(['pending_identity_verification','identity_verified','in_review','restricted','completed','rejected','cancelled']).optional(),page_size:z.coerce.number().int().min(1).max(50).default(25),cursor:z.string().datetime().optional()})}),asyncHandler(async(req:any,res)=>res.json(await service.listRightsRequests(req.query.status,req.query.page_size,req.query.cursor))));
adminPrivacyRouter.patch('/rights-requests/:id',requirePermission(PERMISSIONS.PRIVACY_REQUESTS_MANAGE),validateZod({params:z.object({id:z.string().uuid()}),body:z.object({expected_version:z.number().int().positive(),status:z.enum(['pending_identity_verification','identity_verified','in_review','restricted','completed','rejected','cancelled']),confirm_identity_verified:z.boolean().optional(),decision_notes:z.string().trim().min(5).max(4000).optional(),legal_hold:z.boolean().optional(),assigned_to:z.string().uuid().optional()})}),asyncHandler(async(req:any,res)=>res.json({request:await service.updateRightsRequest(req.params.id,req.body,{id:req.user.id})})));
adminPrivacyRouter.post('/sessions/:id/revoke',requirePermission(PERMISSIONS.SECURITY_ADMIN),validateZod({params:z.object({id:z.string().uuid()}),body:z.object({reason:z.string().trim().min(5).max(500)})}),asyncHandler(async(req:any,res)=>{await service.revokeSession(req.params.id,req.body.reason,{id:req.user.id});res.json({success:true});}));
