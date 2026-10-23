import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const licenses = await Promise.all(
  ['@openchamber/sdk', 'zod'].map(
    async (name) =>
      `${name}\n${await Bun.file(resolve(root, 'node_modules', name, 'LICENSE')).text()}`,
  ),
);
const notice = `\n/*!\n${licenses.join('\n\n')}\n*/\n`;
await Promise.all(
  ['panel', 'service'].map((name) =>
    mkdir(resolve(root, name), { recursive: true }),
  ),
);
for (const [entrypoint, outfile, target, format] of [
  ['src/panel/main.ts', 'panel/main.js', 'browser', 'iife'],
  ['src/service/main.ts', 'service/main.cjs', 'node', 'cjs'],
] as const) {
  const result = await Bun.build({
    entrypoints: [resolve(root, entrypoint)],
    target,
    format,
    minify: true,
  });
  if (!result.success)
    throw new AggregateError(result.logs, `构建失败：${entrypoint}`);
  const output = result.outputs[0];
  if (!output) throw new Error(`未生成构建产物：${entrypoint}`);
  await Bun.write(resolve(root, outfile), `${await output.text()}${notice}`);
}
for (const name of ['index.html', 'style.css', 'compact.css', 'ring.css']) {
  await Bun.write(
    resolve(root, 'panel', name),
    Bun.file(resolve(root, 'src/panel', name)),
  );
}
console.log('已构建 panel/ 和 service/，可在 OpenChamber 中安装此目录。');
