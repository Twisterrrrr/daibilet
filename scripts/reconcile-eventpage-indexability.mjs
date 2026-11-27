#!/usr/bin/env node
import { config } from 'dotenv';
import { createDb } from '../apps/backend/src/db.js';
import { reconcileActiveRewriteIndexability } from '../apps/backend/src/event-pages.js';
import { revalidateEventPageIndexabilityChanges } from '../apps/backend/src/revalidate-next-blog.js';

config();

const dryRun = process.argv.includes('--dry-run');
if (process.argv.includes('--production-tunnel')) {
  const databaseUrl = new URL(process.env.DATABASE_URL || '');
  databaseUrl.hostname = '127.0.0.1';
  databaseUrl.port = '5433';
  databaseUrl.pathname = '/daibilet';
  process.env.DATABASE_URL = databaseUrl.toString();
}
const db = createDb(process.cwd());

async function main() {
  const summary = await reconcileActiveRewriteIndexability(db, { dryRun });
  const cache = { skipped: true, reason: dryRun ? 'dry_run' : 'no_changes' };
  const revalidation = [];

  if (!dryRun && summary.changed.length) {
    const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET?.trim();
    const apiBase = (process.env.DAIBILET_API_INTERNAL_URL || process.env.PUBLIC_API_URL || 'http://127.0.0.1:4000').replace(/\/$/u, '');
    if (secret) {
      const response = await fetch(`${apiBase}/api/internal/public-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ warm: 'none', reason: 'eventpage indexability reconciliation' }),
      });
      cache.status = response.status;
      cache.ok = response.ok;
      cache.payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Public cache invalidation failed (${response.status})`);
    } else {
      cache.ok = false;
      cache.reason = 'missing_DAIBILET_NEXT_REVALIDATE_SECRET';
      throw new Error('DAIBILET_NEXT_REVALIDATE_SECRET is required to clear the public cache after changes');
    }

    const result = await revalidateEventPageIndexabilityChanges(summary.changed, 'eventpage-indexability');
    revalidation.push(result);
    if (!result.ok) throw new Error('One or more Next revalidation batches failed');
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    checked: summary.checked,
    currentlyIndexed: summary.currentlyIndexed,
    currentlyNoindex: summary.currentlyNoindex,
    indexed: summary.indexed,
    noindex: summary.noindex,
    changedToIndex: summary.changedToIndex,
    changedToNoindex: summary.changedToNoindex,
    flagChangedToIndex: summary.flagChangedToIndex,
    flagChangedToNoindex: summary.flagChangedToNoindex,
    canonicalOnlyChanges: summary.canonicalOnlyChanges,
    changedSlugs: summary.changed.slice(0, 40).map((page) => page.slug),
    changedSlugsTruncated: Math.max(0, summary.changed.length - 40),
    reviewRequired: summary.reviewRequired,
    cache,
    revalidationBatches: revalidation.map(({ batches, ok, results }) => ({ batches, ok, results: results?.map((result) => ({ ok: result.ok, skipped: result.skipped, reason: result.reason })) })),
  }, null, 2));
  if (summary.reviewRequired.length) console.warn(`Manual review required for ${summary.reviewRequired.length} pages`);
}

main().catch((error) => {
  console.error('[eventpage-indexability] failed:', error);
  process.exitCode = 1;
}).finally(async () => {
  await db.close();
});
