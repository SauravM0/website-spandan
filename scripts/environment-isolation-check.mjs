import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'infrastructure/environments.json'), 'utf8'));
const errors = [];

if (contract.schemaVersion !== 1) errors.push('Unsupported environment contract schema.');
if (contract.provider !== 'render') errors.push('Managed container provider must be Render.');
if (contract.databaseProvider !== 'supabase') errors.push('Database provider must be Supabase.');

const expected = ['development', 'staging', 'production'];
const environments = Array.isArray(contract.environments) ? contract.environments : [];
const names = environments.map((item) => item.name);
for (const name of expected) if (!names.includes(name)) errors.push(`Missing environment: ${name}.`);
if (new Set(names).size !== names.length) errors.push('Environment names must be unique.');

const environmentNames = environments.map((item) => item.environmentName);
const refs = environments.map((item) => item.supabaseProjectRefSecret);
const renderNames = environments.map((item) => item.renderEnvironment);
if (new Set(environmentNames).size !== environments.length) errors.push('ENVIRONMENT_NAME values must be unique.');
if (new Set(refs).size !== environments.length) errors.push('Supabase project-ref secret names must be unique.');
if (new Set(renderNames).size !== environments.length) errors.push('Render environment names must be unique.');

for (const environment of environments) {
  const expectedPolicy = environment.name === 'production' ? 'production-patient-data' : 'synthetic-only';
  if (environment.dataPolicy !== expectedPolicy) errors.push(`${environment.name} has invalid data policy.`);
  if (environment.productionTrafficAllowed !== (environment.name === 'production')) errors.push(`${environment.name} has invalid production traffic policy.`);
}

const serialized = JSON.stringify(contract);
const forbiddenCredentialKeys = new Set(['password', 'secret', 'token', 'databaseUrl']);
const containsCredentialValue = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    forbiddenCredentialKeys.has(key) || containsCredentialValue(child));
};
if (/postgres(?:ql)?:\/\//i.test(serialized) || containsCredentialValue(contract)) {
  errors.push('Environment contract must not contain credential values.');
}

const example = fs.readFileSync(path.join(root, 'backend/.env.example'), 'utf8');
for (const key of ['DEPLOYMENT_ENV', 'ENVIRONMENT_NAME', 'SUPABASE_PROJECT_REF', 'DATA_POLICY']) {
  if (!example.includes(`${key}=`)) errors.push(`backend/.env.example is missing ${key}.`);
}

if (errors.length) {
  console.error('Environment isolation check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Environment isolation valid: development, staging, and production are distinct; lower environments are synthetic-only.');
