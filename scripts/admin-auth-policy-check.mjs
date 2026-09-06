import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/admin-auth-policy.json'));
const migration = read('backend/migrations/033_admin_auth_hardening.sql');
const service = read('backend/src/services/adminAuth.ts');
const middleware = read('backend/src/middleware/auth.ts');
const authRoutes = read('backend/src/routes/adminAuth.ts');
const errors = [];

if (policy.schemaVersion !== 2 || policy.workPackage !== 'WP14')
  errors.push('Unsupported administrator authentication policy.');
if (policy.administratorModel !== 'single-active-administrator')
  errors.push('The approved deployment has exactly one active administrator.');
if (
  policy.login?.fields?.join(',') !== 'email,password' ||
  policy.login?.additionalFactorRequired !== false
)
  errors.push('Administrator login must use email and password only.');
if (!policy.throttling?.sharedDatabaseState || policy.throttling.scopes?.length !== 2)
  errors.push('Login throttling must use shared account and IP state.');
if (
  policy.sessions?.idleTimeoutMinutes !== 30 ||
  policy.sessions?.absoluteLifetimeHours !== 8 ||
  policy.sessions?.revocationObjectiveSeconds !== 5
)
  errors.push('Session lifetime or revocation policy drifted.');
if (!migration.includes('staff_login_throttles'))
  errors.push('Authentication migration is missing shared login throttling.');
if (!migration.includes('uq_single_active_administrator'))
  errors.push('Database enforcement for the single active administrator is missing.');
for (const required of [
  'staff_login_throttles',
  "revoke_reason='password_changed'",
  'loginAdmin',
]) {
  if (!service.includes(required)) errors.push(`Authentication service is missing ${required}.`);
}
for (const required of ['idle_expires_at>NOW()', 'absolute_expires_at>NOW()']) {
  if (!middleware.includes(required)) errors.push(`Session middleware is missing ${required}.`);
}
for (const required of ["'/login'", "'/sessions'", "'/password/change'", 'PERMISSIONS.SECURITY_ADMIN']) {
  if (!authRoutes.includes(required))
    errors.push(`Admin authentication route is missing ${required}.`);
}

if (errors.length) {
  console.error('Administrator authentication policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Administrator authentication policy valid: email/password login and bounded sessions.');
