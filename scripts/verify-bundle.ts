import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { quotasSchema, usageSchema } from '../src/shared/schema.ts';

const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const address = probe.address();
if (!address || typeof address === 'string')
  throw new Error('无法分配测试端口');
await new Promise<void>((done, reject) =>
  probe.close((error) => (error ? reject(error) : done())),
);
const credential = randomBytes(24).toString('hex');
const child = spawn('node', [resolve(import.meta.dir, '../service/main.cjs')], {
  env: {
    ...process.env,
    OPENCHAMBER_SERVICE_PORT: String(address.port),
    OPENCHAMBER_SERVICE_TOKEN: credential,
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
const endpoint = `http://127.0.0.1:${address.port}`;
const headers = { Authorization: `Bearer ${credential}` };
try {
  const healthy = await new Promise<boolean>((done, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(timer);
      reject(new Error('打包服务启动超时'));
    }, 5000);
    const timer = setInterval(() => {
      void fetch(`${endpoint}/health`, { headers }).then(
        (response) => {
          if (!response.ok) return;
          clearInterval(timer);
          clearTimeout(timeout);
          done(true);
        },
        () => {
          /* The process may not have bound its port yet. */
        },
      );
    }, 100);
  });
  if (!healthy) throw new Error('服务未就绪');
  if ((await fetch(`${endpoint}/health`)).status !== 401)
    throw new Error('服务未执行认证检查');
  const quotas = quotasSchema.parse(
    await (await fetch(`${endpoint}/quotas`, { headers })).json(),
  );
  const usage = usageSchema.parse(
    await (await fetch(`${endpoint}/usage?period=week`, { headers })).json(),
  );
  if (usage.period !== 'week') throw new Error('服务统计周期不符');
  console.log(
    `打包服务在 Node ${process.version} 下通过：健康检查、认证、${quotas.data.length} 个账户、7 天统计`,
  );
} finally {
  const ended = once(child, 'exit');
  child.kill('SIGTERM');
  await ended;
}
