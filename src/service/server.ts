import { timingSafeEqual } from 'node:crypto';
import { createServer, type ServerResponse } from 'node:http';
import { periodSchema } from '../shared/schema.ts';
import { createGateway, discoverPort, GatewayError } from './gateway.ts';

type Gateway = ReturnType<typeof createGateway>;
export function createService(token: string, gateway?: Gateway) {
  let local: { port: number; client: Gateway } | undefined;
  const pending = new Map<string, Promise<unknown>>();
  const read = async (
    path: string,
    period: 'today' | 'week' | 'month' | 'all',
    fresh: boolean,
  ) => {
    const key = `${path}:${period}:${fresh}`;
    const existing = pending.get(key);
    if (existing) return existing;
    const operation = (async () => {
      let client = gateway;
      if (!client) {
        const port = await discoverPort();
        if (!local || local.port !== port)
          local = { port, client: createGateway(port) };
        client = local.client;
      }
      return path === '/quotas' ? client.quotas(fresh) : client.usage(period);
    })().finally(() => pending.delete(key));
    pending.set(key, operation);
    return operation;
  };
  const json = (response: ServerResponse, status: number, body: unknown) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(body));
  };
  return createServer(async (request, response) => {
    const actual = Buffer.from(request.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    if (request.method !== 'GET') {
      json(response, 405, { code: 'method' });
      return;
    }
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/health') {
      json(response, 200, { ok: true });
      return;
    }
    if (!['/usage', '/quotas'].includes(url.pathname)) {
      json(response, 404, { error: 'not-found' });
      return;
    }
    const period = periodSchema.safeParse(
      url.searchParams.get('period') ?? 'today',
    );
    if (!period.success) {
      json(response, 400, { code: 'periodInvalid' });
      return;
    }
    try {
      const data = await read(
        url.pathname,
        period.data,
        url.searchParams.get('fresh') === '1',
      );
      json(response, 200, data);
    } catch (error) {
      json(response, error instanceof GatewayError ? error.status : 500, {
        code: error instanceof GatewayError ? error.code : 'unknownError',
      });
    }
  });
}
