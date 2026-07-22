/**
 * Post catalog-sync cache step:
 * 1) Next ISR revalidate (home/catalog tags)
 * 2) API in-process invalidate + light|full warm via /api/internal/public-cache
 *
 * Env:
 *   TC_CATALOG_SYNC_FULL_WARM=1  → warm=full (nightly opt-in)
 *   otherwise warm=light
 */
import { revalidateNextHome } from '../apps/backend/src/revalidate-next-home.js';

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
  console.log(
    JSON.stringify(
      {
        ok: Boolean(nextResult?.ok || nextResult?.skipped) && Boolean(apiResult?.ok || apiResult?.skipped),
        warm,
        next: nextResult,
        api: apiResult,
      },
      null,
      2,
    ),
  );
  if (apiResult?.ok === false && !apiResult?.skipped) {
    process.exitCode = 1;
  }
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
