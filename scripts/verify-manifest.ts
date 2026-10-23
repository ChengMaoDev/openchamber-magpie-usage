import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseManifestJson } from '@openchamber/sdk/schemas';

const root = resolve(import.meta.dir, '..');
const result = parseManifestJson(
  await Bun.file(resolve(root, 'package.json')).text(),
);
const manifest: unknown = await Bun.file(resolve(root, 'package.json')).json();
if (
  typeof manifest === 'object' &&
  manifest !== null &&
  'openchamber' in manifest &&
  typeof manifest.openchamber === 'object' &&
  manifest.openchamber !== null &&
  'contributes' in manifest.openchamber &&
  typeof manifest.openchamber.contributes === 'object' &&
  manifest.openchamber.contributes !== null &&
  'page' in manifest.openchamber.contributes
)
  throw new Error(
    'Magpie Usage must only contribute a sidebar panel and Work Status section',
  );
if (!result.ok)
  throw new Error(`Manifest validation failed: ${JSON.stringify(result)}`);
for (const file of [
  'panel/index.html',
  'panel/main.js',
  'panel/style.css',
  'panel/compact.css',
  'panel/ring.css',
  'service/main.cjs',
  'icon.svg',
  'LICENSE',
  'THIRD-PARTY-NOTICES.md',
])
  await access(resolve(root, file));
const icon = await Bun.file(resolve(root, 'icon.svg')).text();
if (/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=/i.test(icon))
  throw new Error('Icon contains active or external content');
console.log('Official manifest schema and shipped assets verified.');
