import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler';

/**
 * Body-parser failures are caused by the client, so they must come back as 4xx
 * with a message that names the problem. Before this, every one of them fell
 * through to the generic handler and returned 500, which both misreports a
 * client mistake as a server fault and - in development - leaked the parser's
 * internal message.
 */

let server: Server;
let baseUrl: string;

test.before(async () => {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.post('/echo', (req, res) => {
    res.json({ ok: true, body: req.body });
  });
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('a malformed JSON body is a 400, not a 500', async () => {
  const res = await fetch(`${baseUrl}/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not-json',
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(body.error.code, 'INVALID_JSON');
});

test('a body over the size limit is a 413, not a 500', async () => {
  const res = await fetch(`${baseUrl}/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blob: 'x'.repeat(4096) }),
  });
  assert.equal(res.status, 413);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('the parser message never reaches the client on a malformed body', async () => {
  const res = await fetch(`${baseUrl}/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"a":',
  });
  const text = await res.text();
  assert.doesNotMatch(text, /Unexpected token|SyntaxError|at JSON/i);
});

test('a well-formed body still passes through untouched', async () => {
  const res = await fetch(`${baseUrl}/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Asha' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { body: { name: string } };
  assert.equal(body.body.name, 'Asha');
});

test('an unrelated error still becomes a 500', async () => {
  const failing = express();
  failing.get('/boom', () => {
    throw new Error('database exploded');
  });
  failing.use(errorHandler);
  const failServer = failing.listen(0);
  await new Promise((resolve) => failServer.once('listening', resolve));
  const port = (failServer.address() as AddressInfo).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/boom`);
    assert.equal(res.status, 500);
  } finally {
    await new Promise((resolve) => failServer.close(resolve));
  }
});
