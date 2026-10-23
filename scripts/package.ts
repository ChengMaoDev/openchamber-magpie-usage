import { mkdir, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
await mkdir(resolve(root, 'release'), { recursive: true });
const archive = resolve(root, 'release/openchamber-magpie-usage.zip');
const temporary = resolve(root, `release/.package-${process.pid}.zip`);
const result = Bun.spawnSync(
  [
    'zip',
    '-q',
    '-r',
    temporary,
    'package.json',
    'icon.svg',
    'panel',
    'service',
    'docs',
    'README.md',
    'README.zh-CN.md',
    'LICENSE',
    'THIRD-PARTY-NOTICES.md',
  ],
  {
    cwd: root,
  },
);
if (result.exitCode !== 0) {
  await rm(temporary, { force: true });
  throw new Error(result.stderr.toString());
}
await rename(temporary, archive);
await Bun.write(
  `${archive}.sha256`,
  `${new Bun.CryptoHasher('sha256').update(await Bun.file(archive).arrayBuffer()).digest('hex')}  openchamber-magpie-usage.zip\n`,
);
console.log(archive);
