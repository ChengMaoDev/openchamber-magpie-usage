import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseManifestJson } from '@openchamber/sdk/schemas';
import { z } from 'zod';

const root = resolve(import.meta.dir, '..');
const temporary = await mkdtemp(join(tmpdir(), 'openchamber-npm-'));
const packageSchema = z.object({
  filename: z.string(),
  files: z.array(z.object({ path: z.string() })),
});
const resultSchema = z.union([
  z.array(packageSchema).length(1),
  z
    .record(z.string(), packageSchema)
    .transform((packages) => Object.values(packages)),
]);
try {
  const packed = Bun.spawnSync(
    ['npm', 'pack', '--json', '--pack-destination', temporary],
    { cwd: root },
  );
  if (packed.exitCode !== 0) throw new Error(packed.stderr.toString());
  const result = resultSchema.parse(JSON.parse(packed.stdout.toString()))[0];
  if (!result) throw new Error('npm pack produced no package');
  const paths = result.files.map((file) => file.path);
  for (const path of paths) {
    if (
      !/^(package\.json|icon\.svg|README(?:\.zh-CN)?\.md|LICENSE|THIRD-PARTY-NOTICES\.md|panel\/(index\.html|main\.js|style\.css)|service\/main\.cjs|docs\/panel-(light|dark)\.png)$/.test(
        path,
      )
    ) {
      throw new Error(`Unexpected published file: ${path}`);
    }
  }
  const extracted = join(temporary, 'extracted');
  await mkdir(extracted);
  const unpack = Bun.spawnSync([
    'tar',
    '-xzf',
    join(temporary, result.filename),
    '-C',
    extracted,
  ]);
  if (unpack.exitCode !== 0) throw new Error(unpack.stderr.toString());
  const manifestText = await readFile(
    join(extracted, 'package/package.json'),
    'utf8',
  );
  const manifest = parseManifestJson(manifestText);
  if (!manifest.ok)
    throw new Error(`Invalid packed extension: ${JSON.stringify(manifest)}`);
  const publication = z
    .object({
      dependencies: z.record(z.string(), z.string()).optional(),
      scripts: z.record(z.string(), z.string()),
    })
    .parse(JSON.parse(manifestText));
  if (Object.keys(publication.dependencies ?? {}).length > 0)
    throw new Error('Packed extension has runtime dependencies');
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
    if (publication.scripts[hook])
      throw new Error(`Unexpected install hook: ${hook}`);
  }
  for (const path of [
    'panel/index.html',
    'panel/main.js',
    'panel/style.css',
    'service/main.cjs',
    'icon.svg',
    'LICENSE',
    'THIRD-PARTY-NOTICES.md',
  ]) {
    if (!paths.includes(path))
      throw new Error(`Missing extension asset: ${path}`);
  }
  console.log(
    `npm tarball verified: ${paths.length} allowed files, official manifest valid, no runtime dependencies or install hooks.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
