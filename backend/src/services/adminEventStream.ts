import type { Response } from 'express';
import { query } from '../config/database';
import { PERMISSIONS, roleHasPermission } from '../security/permissions';
import type { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export type AdminDomainEvent = {
  id: string;
  type: string;
  entity_id: string;
  version: number;
  occurred_at: string;
};

type StreamActor = { role: string; doctorId?: string };
type Subscriber = {
  cursor: bigint;
  actor: StreamActor;
  send: (event: AdminDomainEvent) => void;
  close: () => void;
};

const EVENT_PERMISSIONS = {
  'appointment.changed': PERMISSIONS.APPOINTMENTS_READ,
  'package_order.changed': PERMISSIONS.PACKAGE_ORDERS_READ,
  'payment.changed': PERMISSIONS.PAYMENTS_READ,
  'notification.changed': PERMISSIONS.NOTIFICATIONS_READ,
  'patient_review.changed': PERMISSIONS.PATIENT_IDENTITY_REVIEW,
} as const;

const subscribers = new Set<Subscriber>();
let pollTimer: NodeJS.Timeout | null = null;
let polling = false;
let activeConnections = 0;
let acceptingConnections = true;
const MAX_CONNECTIONS_PER_REPLICA = 1_200;
const POLL_INTERVAL_MS = 750;
const BATCH_SIZE = 500;

function permittedTypes(actor: StreamActor): string[] {
  return Object.entries(EVENT_PERMISSIONS)
    .filter(([, permission]) => roleHasPermission(actor.role, permission))
    .map(([type]) => type);
}

function canReceive(event: AdminDomainEvent, actor: StreamActor): boolean {
  const permission = EVENT_PERMISSIONS[event.type as keyof typeof EVENT_PERMISSIONS];
  return Boolean(permission && roleHasPermission(actor.role, permission));
}

async function doctorCanReceive(entityId: string, actor: StreamActor): Promise<boolean> {
  if (actor.role !== 'doctor' || !actor.doctorId) return true;
  const result = await query('SELECT 1 FROM appointments WHERE id=$1 AND doctor_id=$2 LIMIT 1', [
    entityId,
    actor.doctorId,
  ]);
  return result.rowCount === 1;
}

function serialize(row: any): AdminDomainEvent {
  return {
    id: String(row.id),
    type: row.event_type,
    entity_id: row.entity_id,
    version: Number(row.entity_version),
    occurred_at: new Date(row.occurred_at).toISOString(),
  };
}

async function dispatch(event: AdminDomainEvent, subscriber: Subscriber) {
  if (BigInt(event.id) <= subscriber.cursor) return;
  subscriber.cursor = BigInt(event.id);
  if (!canReceive(event, subscriber.actor)) return;
  if (
    event.type === 'appointment.changed' &&
    !(await doctorCanReceive(event.entity_id, subscriber.actor))
  )
    return;
  subscriber.send(event);
}

async function poll() {
  if (polling || subscribers.size === 0) return;
  polling = true;
  try {
    const minimumCursor = Array.from(subscribers).reduce(
      (minimum, subscriber) => (subscriber.cursor < minimum ? subscriber.cursor : minimum),
      Array.from(subscribers)[0].cursor
    );
    const result = await query(
      `SELECT id,event_type,entity_id,entity_version,occurred_at
       FROM admin_domain_events WHERE id>$1 ORDER BY id ASC LIMIT $2`,
      [minimumCursor.toString(), BATCH_SIZE]
    );
    for (const row of result.rows) {
      const event = serialize(row);
      await Promise.all(Array.from(subscribers, (subscriber) => dispatch(event, subscriber)));
    }
  } catch (error) {
    logger.error('Admin event stream poll failed', {
      code: typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN',
    });
  } finally {
    polling = false;
  }
}

function startPoller() {
  if (pollTimer) return;
  pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  pollTimer.unref();
}

function stopPollerIfIdle() {
  if (subscribers.size !== 0 || !pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

async function startingCursor(requested: string | undefined): Promise<bigint> {
  const result = await query('SELECT COALESCE(MAX(id),0)::text AS id FROM admin_domain_events');
  const current = BigInt(result.rows[0]?.id || '0');
  if (!requested || !/^\d{1,19}$/.test(requested)) return current;
  const resume = BigInt(requested);
  return resume <= current ? resume : current;
}

export async function openAdminEventStream(req: AuthenticatedRequest, res: Response) {
  if (!acceptingConnections) {
    res.status(503).set('Retry-After', '3').json({ error: 'Event stream is draining' });
    return;
  }
  if (activeConnections >= MAX_CONNECTIONS_PER_REPLICA) {
    res.status(503).set('Retry-After', '5').json({ error: 'Event stream capacity reached' });
    return;
  }

  const actor = {
    role: req.user?.role || '',
    doctorId: req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined,
  };
  const types = permittedTypes(actor);
  if (types.length === 0) {
    res.status(403).json({ error: 'No event stream capability' });
    return;
  }

  const cursor = await startingCursor(req.get('Last-Event-ID'));
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(`retry: 3000\nevent: ready\ndata: {"cursor":"${cursor}"}\n\n`);

  const subscriber: Subscriber = {
    actor,
    cursor,
    send(event) {
      if (res.writableEnded || res.destroyed) return;
      if (res.writableLength > 64 * 1024) {
        res.end();
        return;
      }
      res.write(`id: ${event.id}\nevent: domain-event\ndata: ${JSON.stringify(event)}\n\n`);
    },
    close() {
      res.end();
    },
  };
  subscribers.add(subscriber);
  activeConnections += 1;
  startPoller();
  void poll();

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);
  heartbeat.unref();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    subscribers.delete(subscriber);
    activeConnections = Math.max(0, activeConnections - 1);
    stopPollerIfIdle();
  };
  req.on('close', close);
  res.on('close', close);
}

export async function stopAdminEventStreams() {
  acceptingConnections = false;
  for (const subscriber of Array.from(subscribers)) subscriber.close();
}

export function adminEventStreamSnapshot() {
  return {
    activeConnections,
    capacityPerReplica: MAX_CONNECTIONS_PER_REPLICA,
    pollIntervalMs: POLL_INTERVAL_MS,
    acceptingConnections,
  };
}
