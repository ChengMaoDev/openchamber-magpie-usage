import { afterAll, beforeAll, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { createGateway } from '../src/service/gateway.ts';
import { createService } from '../src/service/server.ts';

const upstreamPaths: string[] = [];
const server = createService(
  'test-service-credential',
  createGateway(3425, async (input) => {
    upstreamPaths.push(String(input));
    return Response.json({ data: [] });
  }),
);
let origin = '';
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);
const auth = { Authorization: 'Bearer test-service-credential' };

test('health 也要求认证', async () => {
  expect((await fetch(`${origin}/health`)).status).toBe(401);
  expect((await fetch(`${origin}/health`, { headers: auth })).status).toBe(200);
});
test('只代理固定的 GET 路径，不允许写入或任意 URL', async () => {
  expect(
    (await fetch(`${origin}/quotas`, { method: 'POST', headers: auth })).status,
  ).toBe(405);
  expect(
    (await fetch(`${origin}/api/providers`, { headers: auth })).status,
  ).toBe(404);
  expect(
    (await fetch(`${origin}/usage?period=invalid`, { headers: auth })).status,
  ).toBe(400);
  const result = await fetch(
    `${origin}/quotas?fresh=1&url=https://example.invalid`,
    { headers: auth },
  );
  expect(result.status).toBe(200);
  expect(upstreamPaths).toEqual(['http://127.0.0.1:3425/v1/magpie/quotas']);
});
test('concurrent readers share a request and a failure does not poison subsequent reads', async () => {
  let reads = 0;
  let fail = true;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const service = createService(
    'concurrency-test',
    createGateway(3425, async () => {
      reads += 1;
      await gate;
      return fail
        ? new Response('upstream details', { status: 503 })
        : Response.json({ data: [] });
    }),
  );
  await new Promise<void>((resolve) => service.listen(0, '127.0.0.1', resolve));
  const address = service.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing service address');
  const url = `http://127.0.0.1:${address.port}/quotas`;
  const headers = { Authorization: 'Bearer concurrency-test' };
  const requests = [fetch(url, { headers }), fetch(url, { headers })];
  try {
    await Bun.sleep(25);
    release?.();
    const results = await Promise.all(requests);
    expect(reads).toBe(1);
    for (const result of results) {
      expect(result.status).toBe(502);
      expect(await result.json()).toEqual({ code: 'upstream' });
    }
    fail = false;
    expect((await fetch(url, { headers })).status).toBe(200);
    expect(reads).toBe(2);
  } finally {
    release?.();
    await new Promise<void>((resolve, reject) =>
      service.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
