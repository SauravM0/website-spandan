import { config } from '../config';
import { query } from '../config/database';

/** Fail closed before disclosing production data to an external processor. */
export async function requireApprovedVendor(vendorName: string): Promise<void> {
  if (config.env !== 'production') return;
  const result=await query(`SELECT id FROM vendor_security_reviews WHERE vendor_name=$1 AND status='approved' AND approved_at IS NOT NULL AND contract_reference IS NOT NULL AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY approved_at DESC LIMIT 1`,[vendorName]);
  if(!result.rows[0]) throw new Error(`VENDOR_GOVERNANCE_BLOCKED: ${vendorName} has no current approved assessment and contract evidence`);
}
