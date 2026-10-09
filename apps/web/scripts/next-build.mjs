/**
 * Cross-platform `next build` with V8 heap sized for MSK prod (~8Gi RAM).
 * Keeps existing NODE_OPTIONS unless max-old-space-size is not set.
 * Override: NODE_OPTIONS='--max-old-space-size=2560' pnpm web:build
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const heapFlag = '--max-old-space-size=5120';

if (!/\bmax-old-space-size=\d+/i.test(process.env.NODE_OPTIONS ?? '')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, heapFlag].filter(Boolean).join(' ').trim();
}

const nextBin = path.join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: webRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
