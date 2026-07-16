import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/authoritative-payment-policy.json'));
const migration = read('backend/migrations/036_authoritative_payment_evidence.sql');
const evidence = read('backend/src/security/paymentEvidence.ts');
const provider = read('backend/src/services/phonePe.ts');
const service = read('backend/src/services/operations.ts');
const controller = read('backend/src/controllers/operationsController.ts');
const routes = read('backend/src/routes/operations.ts');
const security = read('backend/src/config/security.ts');
const frontendApi = read('frontend/src/lib/api.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP17')
  errors.push('Unsupported authoritative payment policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Deployment must retain the approved sole-administrator model.');
if (!policy.webhook?.callbackIsWakeupOnly || !policy.successEvidence?.providerStatusApiRequired)
  errors.push('PhonePe callbacks must be confirmed through the status API.');
for (const required of [
  'provider_evidence_hash',
  'provider_evidence_source',
  'provider_observed_at',
  'New successful payments require authoritative provider evidence',
  'payment_provider_evidence_immutable',
])
  if (!migration.includes(required)) errors.push(`Evidence migration is missing ${required}.`);
for (const required of [
  'assertPaymentEvidenceAllowed',
  "'test.mock'",
  "['development', 'test']",
  'providerVerified',
])
  if (!evidence.includes(required)) errors.push(`Evidence boundary is missing ${required}.`);
for (const required of [
  'validatePhonePeWebhook',
  'timingSafeEqual',
  'PHONEPE_WEBHOOK_EXPIRED',
  'details=true',
  'untrusted checkout URL',
])
  if (!provider.includes(required)) errors.push(`PhonePe validation is missing ${required}.`);
for (const required of [
  'successEvidenceComplete',
  'providerOrderMatches',
  'Number(incomingPaisa) === expectedPaisa',
  'paymentEventIdentityHash',
  'provider_evidence_hash',
])
  if (!service.includes(required)) errors.push(`Payment command is missing ${required}.`);
if (!controller.includes('getPhonePeOrderStatus(callback.merchantOrderId)'))
  errors.push('Webhook does not confirm callback state through PhonePe.');
if (!controller.includes("source: 'phonepe.webhook'"))
  errors.push('Webhook evidence source is not explicit.');
if (routes.includes("'/payments/webhook'")) errors.push('Legacy duplicate webhook route remains.');
if (!routes.includes("'/webhooks/phonepe'"))
  errors.push('Canonical PhonePe webhook route is missing.');
if (!security.includes('Production deployment cannot use the PhonePe sandbox'))
  errors.push('Production sandbox configuration is not rejected.');
if (!security.includes('Production PhonePe endpoints must use api.phonepe.com'))
  errors.push('Production PhonePe endpoints are not pinned.');
if (!service.includes('PAYMENT_PROVIDER_DISABLED'))
  errors.push('Provider-disabled commerce does not fail closed.');
if (!frontendApi.includes("error.code !== 'PAYMENT_PROVIDER_DISABLED'"))
  errors.push('The public provider-disabled error state is missing.');

if (errors.length) {
  console.error('Authoritative payment policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Authoritative payment policy valid: provider-confirmed success and replay-safe callbacks.'
);
