import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * SiteLayout is inlined into ISR hubs/PDPs (`revalidate` + notFound).
 * cookies()/headers()/connection()/noStore() during static generation throw
 * digest DYNAMIC_SERVER_USAGE, which Next surfaces as HTTP 500
 * (live 2026-09-03: /events/[slug], /cities/*, /venues/*, /locations/*).
 *
 * Home may read cookies in `app/page.tsx` and pass `initialCity`.
 */
const WEB_ROOT = path.resolve(__dirname, '../..');

test('ISR chrome: SiteLayout must not call cookies/headers/connection/noStore', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/components/SiteLayout.tsx'), 'utf8');
  assert.equal(source.includes("from 'next/headers'"), false, 'SiteLayout imports next/headers');
  assert.equal(source.includes('await cookies('), false, 'SiteLayout calls cookies()');
  assert.equal(source.includes('await headers('), false, 'SiteLayout calls headers()');
  assert.equal(source.includes('await connection('), false, 'SiteLayout calls connection()');
  assert.equal(source.includes('noStore('), false, 'SiteLayout calls noStore()');
  assert.match(source, /initialCity/);
});

test('event PDP cache: ISR fetch + miss-throw, not bare no-store', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/server/cached-event-data.ts'), 'utf8');
  assert.match(source, /revalidateSeconds:\s*EVENT_PAGE_REVALIDATE/);
  assert.match(source, /EventDtoMissError/);
  assert.match(source, /export async function loadEventDto/);
  assert.match(source, /kind: 'unavailable'/);
});

test('event PDP page uses loadEventDto + safeNotFound, not getCached + notFound after miss', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'app/events/[slug]/page.tsx'), 'utf8');
  assert.match(source, /loadEventDto/);
  assert.match(source, /safeNotFound/);
  assert.equal(source.includes('getCachedPublicEventDto'), false);
  assert.equal(/\bnotFound\s*\(/.test(source), false);
});
