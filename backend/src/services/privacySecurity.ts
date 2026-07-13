import { getClient, query } from '../config/database';
import { AppError } from '../utils/errors';
import crypto from 'crypto';

type Actor = { id: string };

export async function submitRightsRequest(input: any, idempotencyKey: string) {
  const reference = `PR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const result = await query(`INSERT INTO privacy_rights_requests(reference_number,idempotency_key,request_type,requester_name,contact_email,contact_phone,relationship,request_details)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id,reference_number,status,created_at`, [reference,idempotencyKey,input.request_type,input.requester_name,input.contact_email||null,input.contact_phone||null,input.relationship,input.request_details]);
  return result.rows[0];
}

export async function listRightsRequests(status: string | undefined, pageSize: number, cursor?: string) {
  const result = await query(`SELECT id,reference_number,request_type,requester_name,relationship,status,legal_hold,assigned_to,version,created_at,updated_at
    FROM privacy_rights_requests WHERE ($1::text IS NULL OR status=$1) AND ($2::timestamptz IS NULL OR created_at<$2)
    ORDER BY created_at DESC,id DESC LIMIT $3`, [status||null,cursor||null,pageSize+1]);
  const data=result.rows.slice(0,pageSize); return {data,cursor:result.rows.length>pageSize?data[data.length-1].created_at:null};
}

export async function updateRightsRequest(id: string, input: any, actor: Actor) {
  const client=await getClient(); try { await client.query('BEGIN');
    const current=await client.query('SELECT * FROM privacy_rights_requests WHERE id=$1 FOR UPDATE',[id]); const row=current.rows[0];
    if(!row) throw new AppError(404,'PRIVACY_REQUEST_NOT_FOUND','Privacy request not found');
    if(row.version!==input.expected_version) throw new AppError(409,'VERSION_CONFLICT','This request changed. Refresh before retrying.');
    if(['completed','rejected','restricted'].includes(input.status) && !input.decision_notes) throw new AppError(400,'DECISION_NOTES_REQUIRED','Decision notes are required for consequential outcomes.');
    if(input.status!=='pending_identity_verification' && !row.identity_verified_at && !input.confirm_identity_verified) throw new AppError(409,'IDENTITY_VERIFICATION_REQUIRED','Record identity verification before processing this request.');
    const verifiedAt=input.confirm_identity_verified&&!row.identity_verified_at?new Date():row.identity_verified_at;
    const result=await client.query(`UPDATE privacy_rights_requests SET status=$1,decision_notes=COALESCE($2,decision_notes),legal_hold=COALESCE($3,legal_hold),assigned_to=COALESCE($4,assigned_to),identity_verified_at=$5,identity_verified_by=CASE WHEN $6 THEN $7 ELSE identity_verified_by END,completed_at=CASE WHEN $1 IN ('completed','rejected','cancelled') THEN NOW() ELSE NULL END,version=version+1,updated_at=NOW() WHERE id=$8 RETURNING *`,[input.status,input.decision_notes||null,input.legal_hold,input.assigned_to||null,verifiedAt,!!input.confirm_identity_verified,actor.id,id]);
    await client.query(`INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata) VALUES($1,'privacy_request.status_changed','privacy_rights_request',$2,$3)`,[actor.id,id,JSON.stringify({from:row.status,to:input.status,identity_verified:!!verifiedAt,legal_hold:input.legal_hold??row.legal_hold})]);
    await client.query('COMMIT'); return result.rows[0];
  } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
}

export async function revokeSession(sessionId: string, reason: string, actor: Actor) {
  const result=await query(`UPDATE staff_sessions SET revoked_at=COALESCE(revoked_at,NOW()),revoke_reason=$1 WHERE id=$2 AND revoked_at IS NULL RETURNING staff_user_id`,[reason,sessionId]);
  if(!result.rows[0]) throw new AppError(404,'SESSION_NOT_FOUND','Active session not found');
  await query(`INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata) VALUES($1,'staff_session.revoked','staff_session',$2,$3)`,[actor.id,sessionId,JSON.stringify({reason})]);
}
