import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const result = JSON.parse(fs.readFileSync(path.join(editorial, 'new-year-batches-production-result-2026-11-16.json'), 'utf8'));
const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET;
if (!result.complete || result.pages.length !== 90 || result.counts.indexable !== 90) throw new Error('Production result is not a complete 90-page indexable apply');
if (!secret) throw new Error('Set DAIBILET_NEXT_REVALIDATE_SECRET in the process environment');
const base = process.env.DAIBILET_WEB_REVALIDATE_URL || 'https://daibilet.ru';
const pagePaths = result.pages.map((page) => `/events/${encodeURIComponent(page.slug)}`);
const cachePaths = [...pagePaths, '/sitemap.xml', '/sitemaps/events.xml'];
async function request(paths, skipIndexNow) {
  const response = await fetch(`${base}/api/internal/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify({ paths, skipIndexNow }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw new Error(`Revalidation failed with HTTP ${response.status}`);
  return { status: response.status, revalidatedPaths: body.revalidatedPaths?.length ?? 0, indexNowQueued: body.indexNowQueued === true };
}
const cache = await request(cachePaths, true);
const indexNow = await request(pagePaths, false);
if (cache.revalidatedPaths !== cachePaths.length || !indexNow.indexNowQueued) throw new Error('The revalidation endpoint did not accept all expected paths');
process.stdout.write(JSON.stringify({ pages: 90, cachePaths: cache.revalidatedPaths, cache, indexNow }));
