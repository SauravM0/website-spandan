import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironmentIsolation } from '../src/config/environment';

const hostedUrl = (projectRef: string) => `postgresql://postgres.${projectRef}:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

test('accepts local development and test with synthetic data only', () => {
  assert.equal(validateEnvironmentIsolation({
    runtimeEnvironment: 'development', deploymentEnvironment: 'development', environmentName: 'spandan-development',
    databaseUrl: 'postgresql://localhost:5432/spandan_clinic', supabaseProjectRef: '', dataPolicy: 'synthetic-only',
  }), 'development');
  assert.equal(validateEnvironmentIsolation({
    runtimeEnvironment: 'test', deploymentEnvironment: 'test', environmentName: 'spandan-test',
    databaseUrl: 'postgresql://localhost:5432/spandan_test', supabaseProjectRef: '', dataPolicy: 'synthetic-only',
  }), 'test');
});

test('accepts isolated hosted staging and production contracts', () => {
  for (const deployment of ['staging', 'production'] as const) {
    const ref = deployment === 'staging' ? 'stagingref123456' : 'productionref1234';
    assert.equal(validateEnvironmentIsolation({
      runtimeEnvironment: 'production', deploymentEnvironment: deployment, environmentName: `spandan-${deployment}`,
      databaseUrl: hostedUrl(ref), supabaseProjectRef: ref,
      dataPolicy: deployment === 'production' ? 'production-patient-data' : 'synthetic-only',
    }), deployment);
  }
});

test('rejects cross-project, local production, and non-synthetic lower environments', () => {
  assert.throws(() => validateEnvironmentIsolation({
    runtimeEnvironment: 'production', deploymentEnvironment: 'production', environmentName: 'spandan-production',
    databaseUrl: hostedUrl('stagingref123456'), supabaseProjectRef: 'productionref1234', dataPolicy: 'production-patient-data',
  }), /does not match/);
  assert.throws(() => validateEnvironmentIsolation({
    runtimeEnvironment: 'production', deploymentEnvironment: 'production', environmentName: 'spandan-production',
    databaseUrl: 'postgresql://localhost:5432/spandan', supabaseProjectRef: 'productionref1234', dataPolicy: 'production-patient-data',
  }));
  assert.throws(() => validateEnvironmentIsolation({
    runtimeEnvironment: 'production', deploymentEnvironment: 'staging', environmentName: 'spandan-staging',
    databaseUrl: hostedUrl('stagingref123456'), supabaseProjectRef: 'stagingref123456', dataPolicy: 'production-patient-data',
  }), /synthetic-only/);
});

test('rejects runtime and environment-name mismatches', () => {
  assert.throws(() => validateEnvironmentIsolation({
    runtimeEnvironment: 'development', deploymentEnvironment: 'production', environmentName: 'spandan-production',
    databaseUrl: hostedUrl('productionref1234'), supabaseProjectRef: 'productionref1234', dataPolicy: 'production-patient-data',
  }), /NODE_ENV=production/);
  assert.throws(() => validateEnvironmentIsolation({
    runtimeEnvironment: 'production', deploymentEnvironment: 'staging', environmentName: 'spandan-production',
    databaseUrl: hostedUrl('stagingref123456'), supabaseProjectRef: 'stagingref123456', dataPolicy: 'synthetic-only',
  }), /ENVIRONMENT_NAME/);
});
