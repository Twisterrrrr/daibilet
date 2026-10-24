import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  renderSitemapIndexXml,
  renderUrlsetXml,
  resolveSitemapLastModified,
  sitemapResponseHeaders,
} from '@/lib/sitemap-data';

// The pure helpers are tested through their own module: public-read only
// re-exports buildPublicEventFreshnessMap, not the row mapper.
import { freshnessMapFromRows, publicFreshnessSlug } from '@daibilet/backend/event-freshness';


/**
 * Every sitemap builder used to stamp `lastmod` with the build-time `new Date()`,
 * so all ~4k URLs claimed to change on every rebuild. A lastmod that always moves
 * is worse than an absent one: crawlers stop trusting the field, so real updates
 * stop earning the re-crawl.
 *
 * Unknown timestamps are omitted instead of being replaced by a build-time
 * value. Articles and events carry real timestamps; other DTOs do not yet.
 */
const WEB_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');

test('time-sensitive sitemaps cannot outlive an event or retain stale venue eligibility', () => {
  // Bounded ISR cache (1h) - shorter than any event lifetime; freshness comes
  // from hourly revalidation + IndexNow. no-store was removed on purpose: it
  // disabled route-handler caching and rebuilt events.xml in 5-11s per hit,
  // blowing the Googlebot ~30s fetch budget (crawler speed gate catches this).
  assert.equal(sitemapResponseHeaders('events')['Cache-Control'], 'public, s-maxage=3600, stale-while-revalidate=86400');
  assert.equal(sitemapResponseHeaders('venues')['Cache-Control'], 'public, s-maxage=3600, stale-while-revalidate=86400');
  assert.equal(sitemapResponseHeaders('blog')['Cache-Control'], 'public, s-maxage=3600, stale-while-revalidate=86400');
});

test('sitemap lastmod: uses a real updatedAt when present', () => {
  const real = '2026-03-14T08:30:00.000Z';
  assert.equal(resolveSitemapLastModified(real)?.toISOString(), real);
  assert.equal(resolveSitemapLastModified(new Date(real))?.toISOString(), real);
});

test('sitemap lastmod: missing or invalid freshness omits the tag', () => {
  assert.equal(resolveSitemapLastModified(null), undefined);
  assert.equal(resolveSitemapLastModified(undefined), undefined);
  assert.equal(resolveSitemapLastModified(''), undefined);
  assert.equal(resolveSitemapLastModified('not-a-date'), undefined);
  // A Date instance that is Invalid Date must not leak into the XML.
  assert.equal(resolveSitemapLastModified(new Date('nope')), undefined);
  const xml = renderUrlsetXml([{ url: 'https://daibilet.ru/venues/example', changeFrequency: 'weekly' }]);
  assert.doesNotMatch(xml, /<lastmod>/);
  assert.doesNotMatch(renderSitemapIndexXml(), /<lastmod>/);
});

test('sitemap lastmod: blog builder threads the real article updatedAt', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/lib/sitemap-data.ts'), 'utf8');
  assert.match(source, /entry\(\s*`\/blog\/\$\{[^}]+\}`,\s*'weekly',\s*0\.6,\s*article\.updatedAt,?\s*\)/);
});

test('sitemap lastmod: backend selects and maps article updatedAt', () => {
  const dto = fs.readFileSync(path.join(REPO_ROOT, 'apps/backend/src/dto.js'), 'utf8');
  // The list query must select the column, not only order by it.
  const listQuery = dto.slice(dto.indexOf('export async function buildPublicArticlesList'));
  const selectEnd = listQuery.indexOf('from "Article"');
  assert.match(listQuery.slice(0, selectEnd), /a\."updatedAt",/);
  // ...and the row mapper must surface it as an ISO string.
  assert.match(dto, /updatedAt: row\.updatedAt \? new Date\(row\.updatedAt\)\.toISOString\(\) : null/);
});

/**
 * Events carry no `updatedAt` in their public DTO, so the map in
 * public-event-freshness.ts is a separate, deliberately trivial query. The trap is
 * the key: the database stores Cyrillic slugs while the catalog DTO and the
 * sitemap publish the transliterated form. Patch fc8a20407 was rejected for
 * keying on the raw Cyrillic slug - every lookup missed and lastmod silently
 * fell back to the build timestamp. The rows below are the real shapes from prod.
 */
test('sitemap lastmod: Cyrillic database slug resolves to the Latin sitemap key', () => {
  const map = freshnessMapFromRows([
    { slug: 'живопись-гуашь-6a9d47f6e00716a8519dceba', updatedAt: '2026-03-14T08:30:00.000Z' },
  ]);
  assert.equal(
    map.get('zhivopis-guash-6a9d47f6e00716a8519dceba')?.toISOString(),
    '2026-03-14T08:30:00.000Z',
  );
});

test('sitemap lastmod: a Latin slug keys onto itself untouched', () => {
  // Shape taken from /api/public/events on 30.09.
  assert.equal(
    publicFreshnessSlug('razvodnye-mosty-peterburga-s-borta-teplohoda-6a78a2b3e0f6a901eee53523'),
    'razvodnye-mosty-peterburga-s-borta-teplohoda-6a78a2b3e0f6a901eee53523',
  );
});

test('sitemap lastmod: the newest duplicate row wins', () => {
  const map = freshnessMapFromRows([
    { slug: 'tc-123-planetarii-1', updatedAt: '2026-09-20T00:00:00.000Z' },
    { slug: 'tc-123-planetarii-1', updatedAt: '2026-09-25T00:00:00.000Z' },
  ]);
  assert.equal(map.get('tc-123-planetarii-1')?.toISOString(), '2026-09-25T00:00:00.000Z');
});

test('sitemap lastmod: a slug missing from the freshness map has no timestamp', () => {
  assert.equal(resolveSitemapLastModified(null), undefined);
});

test('sitemap lastmod: the events builder reads freshness over HTTP', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/lib/sitemap-data.ts'), 'utf8');
  assert.match(source, /fetchPublicApiJson<\{ freshness: Record<string, string> \}>/);
  assert.match(source, /freshness\[slug\]/);
  assert.doesNotMatch(source, /@daibilet\/backend\/public-read/);
});

