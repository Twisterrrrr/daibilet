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
 * Home uses one shared ISR response; selected city is applied client-side.
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

test('home page remains shared ISR and does not vary server output by request cookies', () => {
  const page = fs.readFileSync(path.join(WEB_ROOT, 'app/page.tsx'), 'utf8');
  const content = fs.readFileSync(path.join(WEB_ROOT, 'src/components/HomePageContent.tsx'), 'utf8');
  assert.match(page, /export const revalidate\s*=\s*300/);
  assert.equal(page.includes("from 'next/headers'"), false, 'home page imports request-bound headers/cookies');
  assert.equal(/\b(?:cookies|headers|connection)\s*\(/.test(page), false, 'home page reads request-bound state');
  assert.equal(/\b(?:cookies|headers|connection)\s*\(/.test(content), false, 'home content reads request-bound state');
  assert.match(content, /const ssrCityName = null/);
  assert.match(content, /const ssrCitySlug = null/);
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
  assert.equal(
    /from ['"]next\/navigation['"]/.test(source) && source.includes('permanentRedirect'),
    false,
    'ISR event PDP must not import permanentRedirect',
  );
});

test('event not-found suggestions use ISR-safe cached fetches', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'app/events/[slug]/not-found.tsx'), 'utf8');
  assert.match(source, /revalidateSeconds:\s*EVENT_PAGE_REVALIDATE/);
  assert.equal(source.includes("export const dynamic = 'force-dynamic'"), false);
});

test('thin landing related-session fallback uses an ISR-safe API fetch', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src/server/landing-thin-related.ts'), 'utf8');
  assert.match(source, /fetchPublicApiJson<PublicCatalogDto>[\s\S]*?revalidateSeconds:\s*3600/);
});

/**
 * New ISR pages must not call redirect()/permanentRedirect().
 * NEXT_REDIRECT during static gen becomes HTTP 500 (Pianissimo 2026-09-03).
 * Known hubs that still redirect are allowlisted until moved to middleware.
 */
const ISR_NAV_REDIRECT_ALLOWLIST = new Set([
  'app/blog/[slug]/page.tsx',
  'app/podborki/(catalog)/page.tsx',
  'app/podborki/c/[city]/page.tsx',
  'app/podborki/[intent]/page.tsx',
  'app/podborki/[intent]/[city]/page.tsx',
]);

function listPageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listPageFiles(full, acc);
    else if (entry.name === 'page.tsx') acc.push(full);
  }
  return acc;
}

test('ISR pages do not gain new next/navigation redirects', () => {
  const appRoot = path.join(WEB_ROOT, 'app');
  const offenders: string[] = [];
  for (const file of listPageFiles(appRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    if (!/export const revalidate\s*=/.test(source)) continue;
    const usesRedirect =
      /\bpermanentRedirect\s*\(/.test(source) ||
      (/\bredirect\s*\(/.test(source) && /from ['"]next\/navigation['"]/.test(source));
    if (!usesRedirect) continue;
    const rel = path.relative(WEB_ROOT, file).replace(/\\/g, '/');
    if (ISR_NAV_REDIRECT_ALLOWLIST.has(rel)) continue;
    offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `ISR navigation redirect not allowlisted: ${offenders.join(', ')}`);
});

test('middleware owns Cyrillic event slug 308', () => {
  const middleware = fs.readFileSync(path.join(WEB_ROOT, 'middleware.ts'), 'utf8');
  assert.match(middleware, /cyrillicEventRedirectPath/);
  assert.match(middleware, /redirectCyrillicEventSlug/);
});
