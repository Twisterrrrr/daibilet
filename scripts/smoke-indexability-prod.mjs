#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

/** Guard against Suspense/client tab regressions that leave HTTP 200 pages empty for crawlers. */
const base = (process.env.PUBLIC_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');
const agents = {
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  YandexBot: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
};

const checks = [
  ['/', (html) => count(html, /role="listitem"/g) >= 12, 'featured cities missing from HTML'],
  ['/events', (html) => html.includes('data-ssr-event-catalog'), 'event catalog missing from HTML'],
  ['/blog', (html) => schemaLinksVisible(html, 'Blog'), 'blog schema lists articles absent from HTML'],
  ['/podborki', (html) => schemaLinksVisible(html, 'CollectionPage'), 'collection schema lists landings absent from HTML'],
  ['/podborki/c/moskva', (html) => schemaLinksVisible(html, 'CollectionPage'), 'city collection links missing from HTML'],
  ['/cities', (html) => count(html, /href="\/cities\/[^"?#]+/g) >= 15, 'city links missing from HTML'],
  ['/cities/moskva', (html) => count(html, /href="\/events\/[^"?#]+/g) > 0, 'city events missing from HTML'],
  ['/places/c/moskva', (html) => html.includes('data-city-places-catalog') && schemaLinksVisible(html, 'ItemList'), 'city places catalog or ItemList missing from HTML'],
  ['/cities/moskovskaya-oblast', (html) => faqIsVisible(html), 'regional FAQ missing from HTML'],
  ['/vystavki-i-muzei', (html) => faqIsVisible(html), 'landing FAQ missing from HTML or JSON-LD'],
  ['/places', (html) => count(html, /href="\/(?:venues|locations)\/[^"?#]+/g) >= 12, 'places missing from HTML'],
  ['/venues', (html) => count(html, /href="\/venues\/[^"?#]+/g) >= 12, 'venues missing from HTML'],
  ['/locations', (html) => count(html, /href="\/locations\/[^"?#]+/g) >= 12, 'locations missing from HTML'],
];

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function faqIsVisible(html) {
  const scripts = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
  const faq = scripts.map((match) => {
    try { return JSON.parse(match[1]); } catch { return null; }
  }).find((item) => item?.['@type'] === 'FAQPage');
  if (!faq?.mainEntity?.length) return false;
  return count(html, /<details\b/g) >= faq.mainEntity.length;
}

function schemaLinksVisible(html, type) {
  const scripts = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
  const structured = scripts.map((match) => {
    try { return JSON.parse(match[1]); } catch { return null; }
  }).find((item) => item?.['@type'] === type);
  const entries = structured?.itemListElement || structured?.mainEntity?.itemListElement;
  if (!Array.isArray(entries) || entries.length === 0) return false;
  const hrefs = new Set([...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
    .map((match) => new URL(match[1], base).pathname));
  return entries.every((entry) => {
    const link = entry.url || entry.item?.url || entry.item;
    return typeof link === 'string' && hrefs.has(new URL(link, base).pathname);
  });
}

export async function fetchCheckedPage({
  url,
  userAgent,
  check,
  attempts = 1,
  backoffMs = 3_000,
  fetchImpl = fetch,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let status = 0;
  let error = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { 'user-agent': userAgent },
        signal: AbortSignal.timeout(30_000),
      });
      status = response.status;
      const html = await response.text();
      if (status === 200 && check(html)) return { okay: true, status, attempt };
      error = status === 200 ? 'content assertion failed' : `HTTP ${status}`;
    } catch (cause) {
      status = 0;
      error = cause instanceof Error ? cause.message : String(cause);
    }
    if (attempt < attempts) await wait(backoffMs * attempt);
  }
  return { okay: false, status, attempt: attempts, error };
}

export async function main() {
  let failed = false;
  for (const [agent, userAgent] of Object.entries(agents)) {
    for (const [path, check, reason] of checks) {
      // Dynamic catalogs can time out briefly while the backend is restarting.
      // Retry these routes only; persistent 5xx or empty HTML still fails the gate.
      const dynamicCatalog = /^\/(?:cities\/[^/]+|places(?:\/c\/[^/]+)?|venues|locations)$/.test(path);
      const attempts = dynamicCatalog ? 4 : 1;
      const result = await fetchCheckedPage({
        url: `${base}${path}`,
        userAgent,
        check,
        attempts,
      });
      if (result.attempt > 1 && result.okay) {
        console.log(`RECOVERED: ${agent} ${path} after ${result.attempt} attempts`);
      }
      console.log(`${result.okay ? 'OK' : 'ERROR'}: ${agent} ${path} HTTP ${result.status}${result.okay ? '' : `: ${reason}${result.error ? ` (${result.error})` : ''}`}`);
      failed ||= !result.okay;
    }
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
