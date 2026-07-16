import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/admin-auth-policy.json'));
const migration = read('backend/migrations/033_admin_auth_hardening.sql');
const service = read('backend/src/services/adminAuth.ts');
const middleware = read('backend/src/middleware/auth.ts');
const authRoutes = read('backend/src/routes/adminAuth.ts');
const operations = read('backend/src/routes/adminOperations.ts');
const diagnosticTests = read('backend/src/routes/adminDiagnosticTests.ts');
const packages = read('backend/src/routes/adminPackages.ts');
const privacy = read('backend/src/routes/privacySecurity.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP14')
  errors.push('Unsupported administrator authentication policy.');
if (policy.administratorModel !== 'single-active-administrator')
  errors.push('The approved deployment has exactly one active administrator.');
if (!policy.mfa?.required || policy.mfa.maximumChallengeAttempts !== 5)
  errors.push('MFA must be mandatory with a five-attempt bounded challenge.');
if (!policy.throttling?.sharedDatabaseState || policy.throttling.scopes?.length !== 2)
  errors.push('Login throttling must use shared account and IP state.');
if (
  policy.sessions?.idleTimeoutMinutes !== 30 ||
  policy.sessions?.absoluteLifetimeHours !== 8 ||
  policy.sessions?.revocationObjectiveSeconds !== 5
)
  errors.push('Session lifetime or revocation policy drifted.');
if (policy.stepUp?.maximumAgeMinutes !== 10 || policy.stepUp.actions?.length < 5)
  errors.push('Sensitive actions require a ten-minute step-up window.');

for (const table of [
  'staff_auth_challenges',
  'staff_login_throttles',
  'staff_mfa_recovery_codes',
]) {
  if (!migration.includes(table)) errors.push(`Authentication migration is missing ${table}.`);
}
if (!migration.includes('uq_single_active_administrator'))
  errors.push('Database enforcement for the single active administrator is missing.');
for (const required of [
  'staff_login_throttles',
  'recoveryCodeHash',
  "revoke_reason='password_changed'",
  'FOR UPDATE',
]) {
  if (!service.includes(required)) errors.push(`Authentication service is missing ${required}.`);
}
for (const required of ['decoded.mfa !== true', 'idle_expires_at>NOW()', 'requireRecentStepUp']) {
  if (!middleware.includes(required)) errors.push(`Session middleware is missing ${required}.`);
}
for (const required of [
  "'/mfa/verify'",
  "'/step-up'",
  "'/sessions'",
  "'/password/change'",
  'PERMISSIONS.SECURITY_ADMIN',
]) {
  if (!authRoutes.includes(required))
    errors.push(`Admin authentication route is missing ${required}.`);
}
for (const [name, source] of [
  ['operations', operations],
  ['diagnostic-test pricing', diagnosticTests],
  ['package pricing', packages],
  ['privacy/security', privacy],
]) {
  if (!source.includes('requireRecentStepUp'))
    errors.push(`${name} is missing step-up protection.`);
}

if (errors.length) {
  console.error('Administrator authentication policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Administrator authentication policy valid: mandatory MFA, bounded sessions, and step-up enforcement.'
);
