/**
 * Post catalog-sync cache step:
 * 1) Next ISR revalidate (home/catalog tags)
 * 2) API in-process invalidate + light|full warm via /api/internal/public-cache
 * 3) INC.504.4: rebuild public catalog DTO disk snapshot (outside daibilet-web)
 *
 * Env:
 *   TC_CATALOG_SYNC_FULL_WARM=1  → warm=full (nightly opt-in)
 *   otherwise warm=light
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revalidateNextHome } from '../apps/backend/src/revalidate-next-home.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reason = process.argv.includes('--full') || process.env.TC_CATALOG_SYNC_FULL_WARM === '1'
  ? 'tc-catalog-sync-full'
  : 'tc-catalog-sync-light';
const warm =
  process.argv.includes('--full') ||
  ['1', 'true', 'yes', 'on', 'full'].includes(String(process.env.TC_CATALOG_SYNC_FULL_WARM || '').toLowerCase())
    ? 'full'
    : 'light';

async function main() {
  const nextResult = await revalidateNextHome(reason);
  const apiResult = await warmApiCaches(warm, reason);
  const diskResult = rebuildCatalogDtoDisk(reason);
  console.log(
    JSON.stringify(
      {
        ok:
          Boolean(nextResult?.ok || nextResult?.skipped) &&
          Boolean(apiResult?.ok || apiResult?.skipped) &&
          Boolean(diskResult?.ok || diskResult?.skipped),
        warm,
        next: nextResult,
        api: apiResult,
        catalogDtoDisk: diskResult,
      },
      null,
      2,
    ),
  );
  if (apiResult?.ok === false && !apiResult?.skipped) {
    process.exitCode = 1;
  }
  if (diskResult?.ok === false && !diskResult?.skipped) {
    process.exitCode = 1;
  }
}

function rebuildCatalogDtoDisk(warmReason) {
  const script = path.join(rootDir, 'scripts', 'rebuild-public-catalog-dto-cache.mjs');
  const tsxBin = path.join(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
  const lock = process.env.DAIBILET_CATALOG_REBUILD_LOCK || '/var/lock/daibilet-catalog-dto.lock';

  // Prefer flock on Linux so we don't stack with cron child rebuilds.
  const useFlock = process.platform !== 'win32';
  const command = useFlock ? 'flock' : tsxBin;
  const args = useFlock
    ? ['-n', lock, 'timeout', '--kill-after=15s', '180s', tsxBin, script, `--reason=${warmReason}`]
    : [script, `--reason=${warmReason}`];

  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      DAIBILET_CATALOG_REBUILD_MODE: 'inline',
      DAIBILET_WEB_PORT: '',
      NEXT_RUNTIME: '',
    },
    encoding: 'utf8',
  });

  if (useFlock && result.status === 1 && !result.stdout && !result.stderr) {
    // flock -n failed: another rebuild holds the lock - OK for sync path.
    console.log('[post-catalog-sync-warm] catalog DTO disk rebuild skipped (lock busy)');
    return { ok: true, skipped: true, reason: 'lock_busy' };
  }
  if (result.status !== 0) {
    console.warn('[post-catalog-sync-warm] catalog DTO disk rebuild failed:', result.stderr || result.stdout);
    return { ok: false, status: result.status, stderr: result.stderr, stdout: result.stdout };
  }
  console.log('[post-catalog-sync-warm] catalog DTO disk OK:', (result.stdout || '').trim());
  return { ok: true, stdout: result.stdout };
}

async function warmApiCaches(warmMode, warmReason) {
  const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET?.trim();
  const base = (process.env.DAIBILET_API_INTERNAL_URL || process.env.PUBLIC_API_URL || 'http://127.0.0.1:4000').replace(
    /\/$/,
    '',
  );
  if (!secret) {
    console.warn('[post-catalog-sync-warm] DAIBILET_NEXT_REVALIDATE_SECRET missing — skip API warm');
    return { ok: false, skipped: true, reason: 'missing_secret' };
  }

  const response = await fetch(`${base}/api/internal/public-cache`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ warm: warmMode, reason: warmReason }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn(`[post-catalog-sync-warm] API HTTP ${response.status}:`, payload);
    return { ok: false, status: response.status, payload };
  }
  console.log('[post-catalog-sync-warm] API OK:', payload);
  return { ok: true, payload };
}

main().catch((error) => {
  console.error('[post-catalog-sync-warm] failed:', error);
  process.exitCode = 1;
});
