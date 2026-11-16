import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const result = JSON.parse(fs.readFileSync(path.join(scriptDir, 'eventpage-city-h1-apply-result-2026-11-16.json'), 'utf8'));
if (result.changedPages !== 20 || result.pages.length !== 20) throw new Error('Expected 20 corrected published pages');
const paths = [...new Set([
  ...result.pages.map((page) => `/events/${encodeURIComponent(page.slug)}`),
  '/events/cirk-bruno-v-g-ishim', '/events/cirk-bruno-v-g-tobolsk',
])];
const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET;
if (!secret) throw new Error('Revalidation secret is not set in the production environment');
const base = 'http://127.0.0.1:3001';
async function revalidate(payload) {
  const response = await fetch(`${base}/api/internal/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw new Error(`Revalidation failed with HTTP ${response.status}`);
  return { status: response.status, revalidatedPaths: body.revalidatedPaths?.length ?? 0, indexNowQueued: body.indexNowQueued === true };
}
const cachePaths = [...paths, '/sitemap.xml', '/sitemaps/events.xml'];
const cache = await revalidate({ paths: cachePaths, skipIndexNow: true });
const tagInvalidations = [];
for (const page of [...result.pages.map((item) => item.slug), 'cirk-bruno-v-g-ishim', 'cirk-bruno-v-g-tobolsk']) {
  tagInvalidations.push(await revalidate({ slug: page, skipIndexNow: true }));
}
const indexNow = await revalidate({ paths, skipIndexNow: false });
if (cache.revalidatedPaths !== cachePaths.length || tagInvalidations.length !== paths.length || tagInvalidations.some((item) => item.revalidatedPaths !== 1) || !indexNow.indexNowQueued) throw new Error('Revalidation endpoint did not accept all expected paths and tags');
process.stdout.write(JSON.stringify({ pages: paths.length, cachePaths: cache.revalidatedPaths, cache, slugTagInvalidations: tagInvalidations.length, indexNow }));
