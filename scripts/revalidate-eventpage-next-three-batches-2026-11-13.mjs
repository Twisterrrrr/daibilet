import fs from 'node:fs';
import path from 'node:path';

const resultPath = path.join(process.cwd(), 'data/ticketscloud/editorial/eventpage-next-three-batches-production-result-2026-11-13.json');
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const secret = String(process.env.DAIBILET_NEXT_REVALIDATE_SECRET || '').trim();
const base = String(process.env.DAIBILET_WEB_REVALIDATE_URL || 'http://127.0.0.1:3001').replace(/\/$/u, '');
if (!secret) throw new Error('DAIBILET_NEXT_REVALIDATE_SECRET is required');
if (result.pages.length !== 296) throw new Error(`Expected 296 pages, got ${result.pages.length}`);

const allPaths = [...result.pages.map((page) => `/events/${encodeURIComponent(page.slug)}`), '/sitemap.xml', '/sitemaps/events.xml'];
const indexablePaths = result.pages.filter((page) => page.isIndexable).map((page) => `/events/${encodeURIComponent(page.slug)}`);

async function revalidate(paths, skipIndexNow) {
  const response = await fetch(`${base}/api/internal/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify({ paths, skipIndexNow }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw new Error(`Revalidation failed (${response.status}): ${JSON.stringify(body)}`);
  return { status: response.status, paths: body.revalidatedPaths?.length ?? 0, indexNowQueued: body.indexNowQueued === true };
}

const cache = await revalidate(allPaths, true);
const indexNow = await revalidate(indexablePaths, false);
process.stdout.write(JSON.stringify({ allPaths: cache, indexablePaths: indexNow }));
