import { createService } from './server.ts';

const port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
const token = process.env.OPENCHAMBER_SERVICE_TOKEN;
if (!Number.isInteger(port) || port < 1 || port > 65535 || !token) {
  throw new Error('OpenChamber 未提供有效的本地服务连接信息。');
}
const server = createService(token);
server.listen(port, '127.0.0.1');
server.on('error', (error) => {
  console.error(`Magpie 用量服务启动失败：${error.message}`);
  process.exitCode = 1;
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
