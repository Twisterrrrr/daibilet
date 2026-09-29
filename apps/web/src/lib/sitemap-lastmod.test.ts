import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { resolveSitemapLastModified } from '@/lib/sitemap-data';

/**
 * Every sitemap builder used to stamp `lastmod` with the build-time `new Date()`,
 * so all ~4k URLs claimed to change on every rebuild. A lastmod that always moves
 * is worse than an absent one: crawlers stop trusting the field, so real updates
 * stop earning the re-crawl.
 *
 * Cities and venues deliberately still fall back - their public DTO has no
 * `updatedAt` and their backend queries would need new aggregates. Articles are
 * the first entity carried end to end.
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
  // A Date instance that is Invalid Date must not leak into the XML.
  assert.equal(resolveSitemapLastModified(new Date('nope'), fallback).toISOString(), iso);
});

test('sitemap lastmod: blog builder threads the real article updatedAt', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/lib/sitemap-data.ts'), 'utf8');
  assert.match(source, /entry\(\s*`\/blog\/\$\{[^}]+\}`,\s*now,\s*'weekly',\s*0\.6,\s*article\.updatedAt,?\s*\)/);
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
