import type { PoolConfig } from 'pg';

export type DatabaseService = 'api' | 'migration';

export type DatabaseBudget = {
  apiPoolMax: number;
  maximumApiReplicas: number;
  rollingSurgeReplicas: number;
  workerReserve: number;
  migrationReserve: number;
  administrationReserve: number;
  connectionQuota: number;
  targetPercent: number;
  plannedConnections: number;
  targetConnections: number;
};

export type DatabaseRuntimePolicy = {
  poolConfig: PoolConfig;
  budget: DatabaseBudget;
  hosted: boolean;
  host: string;
  port: number;
};

const positiveInteger = (env: NodeJS.ProcessEnv, name: string, fallback: number): number => {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer.`);
  return value;
};

const nonNegativeInteger = (env: NodeJS.ProcessEnv, name: string, fallback: number): number => {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`${name} must be a non-negative integer.`);
  return value;
};

function parseConnectionString(raw: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL connection URL.`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
    throw new Error(`${name} must be a PostgreSQL connection URL with a hostname.`);
  }
  for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    if (url.searchParams.has(option)) {
      throw new Error(`${name} must not contain ${option}; verified TLS is configured separately.`);
    }
  }
  return url;
}

const isLocalHost = (host: string) =>
  ['localhost', '127.0.0.1', '::1', 'db'].includes(host.toLowerCase());

function validateHostedEndpoint(url: URL, service: DatabaseService, projectRef: string): void {
  if (!/^[a-z0-9]{8,64}$/i.test(projectRef)) {
    throw new Error('Hosted database connectivity requires a valid SUPABASE_PROJECT_REF.');
  }
  const port = Number(url.port || '5432');
  const sharedPooler = url.hostname.endsWith('.pooler.supabase.com');
  const projectHost = url.hostname === `db.${projectRef}.supabase.co`;
  const usernameMatches = url.username === 'postgres' || url.username === `postgres.${projectRef}`;

  if (!usernameMatches || (!sharedPooler && !projectHost)) {
    throw new Error(
      `${service === 'api' ? 'DATABASE_URL' : 'MIGRATION_DATABASE_URL'} does not match the configured Supabase project.`
    );
  }
  if (service === 'api' && port !== 6543) {
    throw new Error('Hosted DATABASE_URL must use a Supabase transaction pooler on port 6543.');
  }
  if (service === 'migration' && (!projectHost || port !== 5432)) {
    throw new Error(
      'Hosted MIGRATION_DATABASE_URL must use the direct db.<project>.supabase.co:5432 endpoint.'
    );
  }
}

export function calculateDatabaseBudget(env: NodeJS.ProcessEnv): DatabaseBudget {
  const apiPoolMax = positiveInteger(env, 'DB_POOL_MAX', 10);
  const maximumApiReplicas = positiveInteger(env, 'DB_MAX_API_REPLICAS', 2);
  const rollingSurgeReplicas = nonNegativeInteger(env, 'DB_ROLLING_SURGE_REPLICAS', 1);
  const workerReserve = nonNegativeInteger(env, 'DB_WORKER_CONNECTION_RESERVE', 5);
  const migrationReserve = positiveInteger(env, 'DB_MIGRATION_CONNECTION_RESERVE', 1);
  const administrationReserve = nonNegativeInteger(env, 'DB_ADMIN_CONNECTION_RESERVE', 5);
  const connectionQuota = positiveInteger(env, 'DB_CONNECTION_QUOTA', 60);
  const targetPercent = positiveInteger(env, 'DB_CONNECTION_TARGET_PERCENT', 75);
  if (targetPercent < 70 || targetPercent > 80) {
    throw new Error('DB_CONNECTION_TARGET_PERCENT must remain between 70 and 80.');
  }
  const plannedConnections =
    apiPoolMax * (maximumApiReplicas + rollingSurgeReplicas) +
    workerReserve +
    migrationReserve +
    administrationReserve;
  const targetConnections = Math.floor(connectionQuota * (targetPercent / 100));
  if (plannedConnections > targetConnections) {
    throw new Error(
      `Database connection plan requires ${plannedConnections} connections but the ${targetPercent}% target permits ${targetConnections}.`
    );
  }
  return {
    apiPoolMax,
    maximumApiReplicas,
    rollingSurgeReplicas,
    workerReserve,
    migrationReserve,
    administrationReserve,
    connectionQuota,
    targetPercent,
    plannedConnections,
    targetConnections,
  };
}

function validateRegionEvidence(env: NodeJS.ProcessEnv): void {
  const applicationRegion = env.APPLICATION_REGION?.trim();
  const supabaseRegion = env.SUPABASE_REGION?.trim();
  if (!applicationRegion || !supabaseRegion) {
    throw new Error(
      'Hosted database connectivity requires APPLICATION_REGION and SUPABASE_REGION.'
    );
  }
  const target = positiveInteger(env, 'DB_REGION_RTT_TARGET_MS', 100);
  const measured = positiveInteger(env, 'DB_REGION_RTT_P95_MS', target + 1);
  if (measured > target) {
    throw new Error(
      `Measured database region RTT p95 ${measured}ms exceeds the ${target}ms target.`
    );
  }
}

export function createDatabaseRuntimePolicy(
  env: NodeJS.ProcessEnv,
  service: DatabaseService
): DatabaseRuntimePolicy {
  const deployment = env.DEPLOYMENT_ENV || (env.NODE_ENV === 'test' ? 'test' : 'development');
  const hosted =
    env.NODE_ENV === 'production' || deployment === 'staging' || deployment === 'production';
  const runtimeUrl = env.DATABASE_URL?.trim() || 'postgresql://localhost:5432/spandan_clinic';
  const rawUrl =
    service === 'migration' ? env.MIGRATION_DATABASE_URL?.trim() || runtimeUrl : runtimeUrl;
  const variableName = service === 'migration' ? 'MIGRATION_DATABASE_URL' : 'DATABASE_URL';
  const url = parseConnectionString(rawUrl, variableName);
  const budget = calculateDatabaseBudget(env);

  if (hosted) {
    if (!env.DB_CONNECTION_QUOTA?.trim() || !env.DB_MAX_API_REPLICAS?.trim()) {
      throw new Error(
        'Hosted database connectivity requires explicit DB_CONNECTION_QUOTA and DB_MAX_API_REPLICAS.'
      );
    }
    if (isLocalHost(url.hostname))
      throw new Error(`${variableName} cannot use a local host in ${deployment}.`);
    validateHostedEndpoint(url, service, env.SUPABASE_PROJECT_REF?.trim() || '');
    validateRegionEvidence(env);
    if (service === 'migration' && !env.MIGRATION_DATABASE_URL?.trim()) {
      throw new Error('Hosted migrations require a separate MIGRATION_DATABASE_URL.');
    }
  }

  const statementTimeoutMs = positiveInteger(env, 'DB_STATEMENT_TIMEOUT_MS', 10_000);
  const queryTimeoutMs = positiveInteger(env, 'DB_QUERY_TIMEOUT_MS', 12_000);
  if (queryTimeoutMs < statementTimeoutMs) {
    throw new Error(
      'DB_QUERY_TIMEOUT_MS must be greater than or equal to DB_STATEMENT_TIMEOUT_MS.'
    );
  }
  const sslCa = env.DB_SSL_CA?.replace(/\\n/g, '\n').trim();
  const poolConfig: PoolConfig = {
    connectionString: rawUrl,
    max: service === 'migration' ? 1 : budget.apiPoolMax,
    min: 0,
    idleTimeoutMillis: positiveInteger(env, 'DB_IDLE_POOL_TIMEOUT_MS', 30_000),
    connectionTimeoutMillis: positiveInteger(env, 'DB_CONNECTION_TIMEOUT_MS', 5_000),
    maxLifetimeSeconds: positiveInteger(env, 'DB_CONNECTION_MAX_LIFETIME_SECONDS', 1_800),
    statement_timeout: statementTimeoutMs,
    query_timeout: queryTimeoutMs,
    lock_timeout: positiveInteger(env, 'DB_LOCK_TIMEOUT_MS', 3_000),
    idle_in_transaction_session_timeout: positiveInteger(
      env,
      'DB_IDLE_TRANSACTION_TIMEOUT_MS',
      15_000
    ),
    application_name: service === 'migration' ? 'spandan-schema-migrator' : 'spandan-api',
    ssl: hosted ? { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } : false,
  };

  return { poolConfig, budget, hosted, host: url.hostname, port: Number(url.port || '5432') };
}
