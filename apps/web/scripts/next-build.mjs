/**
 * Cross-platform `next build` with V8 heap sized for MSK prod (~8Gi RAM).
 * Keeps existing NODE_OPTIONS unless max-old-space-size is not set.
 * Override: NODE_OPTIONS='--max-old-space-size=2560' pnpm web:build
 *
 * `--webpack` is required since Next 16: Turbopack is the default bundler and it
 * does not support the `resolve.extensionAlias` hook in next.config.ts that the
 * workspace TypeScript packages depend on. See the note in next.config.ts.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const heapFlag = '--max-old-space-size=5120';

if (!/\bmax-old-space-size=\d+/i.test(process.env.NODE_OPTIONS ?? '')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, heapFlag].filter(Boolean).join(' ').trim();
}

const nextBin = path.join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!fs.existsSync(nextBin)) {
  console.error(
    `next-build: cannot find the Next.js CLI at ${nextBin}. ` +
      'The internal bin path moved in this Next.js version - update nextBin in scripts/next-build.mjs.',
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
  cwd: webRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
