export type DeploymentEnvironment = 'development' | 'test' | 'staging' | 'production';

export type EnvironmentIsolationInput = {
  runtimeEnvironment: string;
  deploymentEnvironment: string;
  environmentName: string;
  databaseUrl: string;
  supabaseProjectRef: string;
  dataPolicy: string;
};

const DEPLOYMENTS = new Set<DeploymentEnvironment>(['development', 'test', 'staging', 'production']);

export function validateEnvironmentIsolation(input: EnvironmentIsolationInput): DeploymentEnvironment {
  if (!DEPLOYMENTS.has(input.deploymentEnvironment as DeploymentEnvironment)) {
    throw new Error(`DEPLOYMENT_ENV must be one of ${Array.from(DEPLOYMENTS).join(', ')}`);
  }

  const deployment = input.deploymentEnvironment as DeploymentEnvironment;
  const expectedName = `spandan-${deployment}`;
  if (input.environmentName !== expectedName) {
    throw new Error(`ENVIRONMENT_NAME must be ${expectedName} for ${deployment}`);
  }

  if (deployment === 'production' || deployment === 'staging') {
    if (input.runtimeEnvironment !== 'production') {
      throw new Error(`${deployment} must run with NODE_ENV=production`);
    }
    if (!/^[a-z0-9]{8,64}$/i.test(input.supabaseProjectRef)) {
      throw new Error(`${deployment} requires a valid SUPABASE_PROJECT_REF`);
    }
    if (!input.databaseUrl.includes(input.supabaseProjectRef)) {
      throw new Error('DATABASE_URL does not match SUPABASE_PROJECT_REF');
    }
    if (/(@|\/\/)(localhost|127\.0\.0\.1|db)(:|\/)/i.test(input.databaseUrl)) {
      throw new Error(`${deployment} cannot use a local development database`);
    }
  }

  if (deployment === 'production') {
    if (input.dataPolicy !== 'production-patient-data') {
      throw new Error('Production requires DATA_POLICY=production-patient-data');
    }
  } else if (input.dataPolicy !== 'synthetic-only') {
    throw new Error(`${deployment} must use DATA_POLICY=synthetic-only`);
  }

  if (deployment === 'test' && input.runtimeEnvironment !== 'test') {
    throw new Error('Test deployment requires NODE_ENV=test');
  }
  if (deployment === 'development' && input.runtimeEnvironment === 'production') {
    throw new Error('Development deployment cannot run with NODE_ENV=production');
  }

  return deployment;
}
