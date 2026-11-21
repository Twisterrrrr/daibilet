/**
 * INC.504.4 / INC.504.5c: rebuild public catalog DTO cache in Catalog Worker
 * (systemd timer / flock'd cron / optional child spawn).
 * Writes var/cache/public-catalog-dto.json (+ v2 indexes) for API Soft-SWR.
 *
 * Usage:
 *   node scripts/rebuild-public-catalog-dto-cache.mjs
 *   node scripts/rebuild-public-catalog-dto-cache.mjs --reason=cron
 *
 * Env:
 *   DAIBILET_PUBLIC_CATALOG_DISK_CACHE - snapshot path
 *   DATABASE_URL / .env as usual
 *   Pair API with DAIBILET_CATALOG_REBUILD_MODE=off
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(rootDir);

// Force inline rebuild in this process (never spawn another child).
process.env.DAIBILET_CATALOG_REBUILD_MODE = 'inline';
delete process.env.DAIBILET_WEB_PORT;
delete process.env.NEXT_RUNTIME;

const reasonArg = process.argv.find((arg) => arg.startsWith('--reason='));
const reason = reasonArg ? reasonArg.slice('--reason='.length) : 'cli';

async function main() {
  const startedAt = Date.now();
  const { getPublicCatalogSessions, clearPublicCatalogDtoCache } = await import(
    '../apps/backend/src/public-catalog.dto.ts'
  );
  const { loadPublicCatalogDiskCache, resolvePublicCatalogDiskCachePath } = await import(
    '../apps/backend/src/public-catalog-disk-cache.ts'
  );

  clearPublicCatalogDtoCache();
  const sessions = await getPublicCatalogSessions(true, { hydrateSlots: false });
  const diskPath = resolvePublicCatalogDiskCachePath();
  const disk = loadPublicCatalogDiskCache();
  console.log(
    JSON.stringify({
      ok: true,
      reason,
      sessions: sessions.length,
      elapsedMs: Date.now() - startedAt,
      diskCache: diskPath,
      diskVersion: disk?.version ?? null,
      hasIndexes: Boolean(disk?.indexes),
    }),
  );
}

main().catch((error) => {
  console.error('[rebuild-public-catalog-dto-cache] failed:', error);
  process.exitCode = 1;
});
