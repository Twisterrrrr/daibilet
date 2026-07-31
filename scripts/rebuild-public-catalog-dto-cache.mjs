/**
 * INC.504.4: rebuild public catalog DTO cache in a dedicated process (flock'd cron / child spawn).
 * Writes var/cache/public-catalog-dto.json for Next to serve without in-process rebuild.
 *
 * Usage:
 *   node scripts/rebuild-public-catalog-dto-cache.mjs
 *   node scripts/rebuild-public-catalog-dto-cache.mjs --reason=cron
 *
 * Env:
 *   DAIBILET_PUBLIC_CATALOG_DISK_CACHE - snapshot path
 *   DATABASE_URL / .env as usual
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
  const { resolvePublicCatalogDiskCachePath } = await import(
    '../apps/backend/src/public-catalog-disk-cache.ts'
  );

  clearPublicCatalogDtoCache();
  const sessions = await getPublicCatalogSessions(true, { hydrateSlots: false });
  const diskPath = resolvePublicCatalogDiskCachePath();
  console.log(
    JSON.stringify({
      ok: true,
      reason,
      sessions: sessions.length,
      elapsedMs: Date.now() - startedAt,
      diskCache: diskPath,
    }),
  );
}

main().catch((error) => {
  console.error('[rebuild-public-catalog-dto-cache] failed:', error);
  process.exitCode = 1;
});
