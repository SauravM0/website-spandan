import { performance } from 'node:perf_hooks';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { createDatabaseRuntimePolicy } from './databasePolicy';
import { databasePoolSnapshot, recordDatabaseTiming, safeQueryIdentity } from './databaseTelemetry';
import { logger } from '../utils/logger';

const policy = createDatabaseRuntimePolicy(process.env, 'api');
export const pool = new Pool(policy.poolConfig);

const instrumented = Symbol('instrumented-database-client');
type InstrumentedClient = PoolClient & { [instrumented]?: true };

function poolCounts() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };
}

function instrumentClient(client: PoolClient): PoolClient {
  const target = client as InstrumentedClient;
  if (target[instrumented]) return client;
  const originalQuery = client.query.bind(client);
  client.query = (async (first: unknown, ...rest: unknown[]) => {
    const queryText =
      typeof first === 'string'
        ? first
        : typeof first === 'object' && first !== null && 'text' in first
          ? String((first as { text: unknown }).text)
          : '';
    if (
      typeof first === 'object' &&
      first !== null &&
      'name' in first &&
      (first as { name?: unknown }).name
    ) {
      throw new Error(
        'Named prepared statements are disabled for transaction-pooler compatibility.'
      );
    }
    const started = performance.now();
    const identity = safeQueryIdentity(queryText);
    try {
      const result = await (originalQuery as (...args: unknown[]) => Promise<unknown>)(
        first,
        ...rest
      );
      recordDatabaseTiming({
        kind: 'query',
        service: 'api',
        durationMs: performance.now() - started,
        outcome: 'success',
        ...identity,
        ...poolCounts(),
      });
      return result;
    } catch (error) {
      recordDatabaseTiming({
        kind: 'query',
        service: 'api',
        durationMs: performance.now() - started,
        outcome: 'error',
        ...identity,
        ...poolCounts(),
      });
      throw error;
    }
  }) as PoolClient['query'];
  target[instrumented] = true;
  return client;
}

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    code: typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : 'UNKNOWN',
  });
  process.exit(-1);
});

async function acquireClient(): Promise<PoolClient> {
  const started = performance.now();
  try {
    const client = instrumentClient(await pool.connect());
    recordDatabaseTiming({
      kind: 'acquire',
      service: 'api',
      durationMs: performance.now() - started,
      outcome: 'success',
      ...poolCounts(),
    });
    return client;
  } catch (error) {
    recordDatabaseTiming({
      kind: 'acquire',
      service: 'api',
      durationMs: performance.now() - started,
      outcome: 'error',
      ...poolCounts(),
    });
    throw error;
  }
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  const client = await acquireClient();
  try {
    return await client.query<R>(text, params);
  } finally {
    client.release();
  }
}

export async function getClient(): Promise<PoolClient> {
  return acquireClient();
}

export function getDatabasePoolSnapshot() {
  return databasePoolSnapshot(pool);
}
