import { parseManifestJson } from '@openchamber/sdk/schemas';
import { createGateway, discoverPort } from '../src/service/gateway.ts';

const parsed = parseManifestJson(
  await Bun.file(new URL('../package.json', import.meta.url)).text(),
);
if (!parsed.ok) throw new Error(`扩展清单校验失败：${JSON.stringify(parsed)}`);
console.log('扩展清单通过官方 SDK 校验');
const gateway = createGateway(await discoverPort());
const quotas = await gateway.quotas(false);
console.log(
  `额度接口通过：${quotas.data.length} 个账户，响应已按 schema 校验和裁剪`,
);
for (const period of ['today', 'week', 'month', 'all'] as const) {
  const usage = await gateway.usage(period);
  if (usage.period !== period)
    throw new Error(`Magpie 返回周期不符：${period}`);
  console.log(
    `用量接口通过：${period}，${usage.agents.length} 个应用分类，${usage.models.length} 个模型分类`,
  );
}
