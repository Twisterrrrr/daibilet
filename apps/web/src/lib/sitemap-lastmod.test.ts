import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { resolveSitemapLastModified } from '@/lib/sitemap-data';

/**
 * Every sitemap builder stamped `lastmod` with the build-time `new Date()`, so all
 * URLs claimed to change on each rebuild. Articles were the first entity carried
 * end to end; events were the second.
 *
 * Events use a separate trivial query rather than threading `updatedAt` through
 * the catalog pipeline. The catalog SQL is the most traffic-critical query in the
 * project, and this value only feeds a sitemap date. The trade-off is that
 * `EventSession` has no `updatedAt`, so price and availability changes do not move
 * the date - it reflects the last write to the event record.
 */
const WEB_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');

test('sitemap lastmod: uses a real updatedAt when present', () => {
  const fallback = new Date('2026-09-29T12:00:00.000Z');
  const real = '2026-03-14T08:30:00.000Z';
  assert.equal(resolveSitemapLastModified(real, fallback).toISOString(), real);
  assert.equal(resolveSitemapLastModified(new Date(real), fallback).toISOString(), real);
});

test('sitemap lastmod: falls back to now when absent or unparseable', () => {
  const fallback = new Date('2026-09-29T12:00:00.000Z');
  const iso = fallback.toISOString();
  assert.equal(resolveSitemapLastModified(null, fallback).toISOString(), iso);
  assert.equal(resolveSitemapLastModified(undefined, fallback).toISOString(), iso);
  assert.equal(resolveSitemapLastModified('', fallback).toISOString(), iso);
  assert.equal(resolveSitemapLastModified('not-a-date', fallback).toISOString(), iso);
  assert.equal(resolveSitemapLastModified(new Date('nope'), fallback).toISOString(), iso);
});

test('sitemap lastmod: blog builder threads the real article updatedAt', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/lib/sitemap-data.ts'), 'utf8');
  assert.match(source, /entry\(\s*`\/blog\/\$\{[^}]+\}`,\s*now,\s*'weekly',\s*0\.6,\s*article\.updatedAt,?\s*\)/);
});

test('sitemap lastmod: backend selects and maps article updatedAt', () => {
  const dto = fs.readFileSync(path.join(REPO_ROOT, 'apps/backend/src/dto.js'), 'utf8');
  const listQuery = dto.slice(dto.indexOf('export async function buildPublicArticlesList'));
  const selectEnd = listQuery.indexOf('from "Article"');
  assert.match(listQuery.slice(0, selectEnd), /a\."updatedAt",/);
  assert.match(dto, /updatedAt: row\.updatedAt \? new Date\(row\.updatedAt\)\.toISOString\(\) : null/);
});

test('event freshness: the query stays trivial and cannot decide indexability', () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, 'apps/backend/src/public-event-freshness.ts'),
    'utf8',
  );
  // No joins, no filters beyond "has a slug": if this ever grew into deciding
  // which events are listed, a stale row could silently drop a URL.
  assert.match(source, /from "Event" e/);
  assert.doesNotMatch(source, /join /i);
  assert.doesNotMatch(source, /where[^;]*"status"/i);
  assert.match(source, /e\.slug is not null/);
});

test('event freshness: never throws, so a sitemap build cannot fail on it', () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, 'apps/backend/src/public-event-freshness.ts'),
    'utf8',
  );
  assert.match(source, /catch \{[\s\S]*?Empty map/);
  // A missing row must fall back to build time, never produce an invalid date.
  assert.match(source, /Number\.isNaN\(date\.getTime\(\)\)/);
});

test('event freshness: the events builder only adds a lookup, not a filter', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/lib/sitemap-data.ts'), 'utf8');
  const body = source.slice(
    source.indexOf('export async function buildEventsSitemapEntries'),
  );
  const loop = body.slice(0, body.indexOf('return entries'));
  // Enumeration conditions must be unchanged: the slug filter, the MAX_EVENTS
  // guard, the dedupe set and the hasMore break.
  assert.match(loop, /if \(!slug \|\| seen\.has\(slug\)\) continue;/);
  assert.match(loop, /if \(entries\.length >= MAX_EVENTS\) break;/);
  assert.match(loop, /if \(!page\.hasMore \|\| !page\.items\?\.length \|\| entries\.length >= MAX_EVENTS\) break;/);
  assert.match(loop, /freshness\.get\(slug\)/);
});

test('event freshness: exposed through the backend public-read surface', () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'apps/backend/src/public-read.ts'), 'utf8');
  assert.match(source, /buildPublicEventFreshnessMap/);
  assert.match(source, /public-event-freshness\.js/);
});
