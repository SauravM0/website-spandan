import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/public-payment-access-policy.json'));
const migration = read('backend/migrations/035_public_payment_capabilities.sql');
const security = read('backend/src/security/publicPaymentCapabilities.ts');
const routes = read('backend/src/routes/operations.ts');
const controller = read('backend/src/controllers/operationsController.ts');
const notifications = read('backend/src/services/notifications.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP16')
  errors.push('Unsupported public payment access policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Deployment must retain the approved sole-administrator model.');
if (policy.capabilities?.entropyBits < 128 || !policy.capabilities?.storedAsSha256)
  errors.push('Capabilities require at least 128 bits and hash-only storage.');
for (const purpose of ['status', 'receipt'])
  if (!policy.capabilities?.purposes?.includes(purpose)) errors.push(`Missing ${purpose} purpose.`);
for (const contract of [
  "'/public/payments/status/:capability'",
  "'/public/receipts/:capability'",
  "'/public/receipts/:capability/email'",
])
  if (!routes.includes(contract)) errors.push(`Missing public contract ${contract}.`);
for (const forbidden of [
  '/public/checkout/:transactionId/status',
  '/payments/:transactionId/status',
  '/payments/:transactionId/receipt',
  '/public/receipts/:transactionId',
])
  if (routes.includes(forbidden)) errors.push(`Enumerable legacy route remains: ${forbidden}.`);
for (const required of ['randomBytes(32)', "'sha256'", 'purpose=$2', 'expires_at>NOW()'])
  if (!security.includes(required)) errors.push(`Capability enforcement is missing ${required}.`);
for (const required of ['purpose IN', 'expires_at', 'prevent_public_capability_rebinding'])
  if (!migration.includes(required)) errors.push(`Capability migration is missing ${required}.`);
if (!controller.includes('publicPaymentStatusDto') || !controller.includes('publicPaymentStartDto'))
  errors.push('Public payment controllers must return allowlisted DTOs.');
if (!controller.includes('queueVerifiedReceiptEmailByPaymentId'))
  errors.push('Receipt email must use the verified booking destination command.');
if (controller.includes('req.body.email'))
  errors.push('Public receipt email accepts a destination override.');
if (!notifications.includes('details.order_email || details.patient_email'))
  errors.push('Receipt email is not bound to stored booking data.');
if (notifications.includes('queueReceiptEmailByReceiptId'))
  errors.push('Legacy receipt-ID email command remains available.');
if (!routes.includes('paymentStatusLimiter') || !routes.includes('receiptEmailLimiter'))
  errors.push('Public payment access is not rate limited.');
if (!controller.includes('auditPublicPaymentAccess'))
  errors.push('Public payment access is not audited.');

if (errors.length) {
  console.error('Public payment access policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Public payment access policy valid: opaque scoped capabilities and fixed receipt delivery.'
);
