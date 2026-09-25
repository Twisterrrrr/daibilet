#!/usr/bin/env node

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

let failed = false;
for (const [agent, userAgent] of Object.entries(agents)) {
  for (const [path, check, reason] of checks) {
    const response = await fetch(`${base}${path}`, {
      headers: { 'user-agent': userAgent },
      signal: AbortSignal.timeout(30_000),
    });
    const html = await response.text();
    const okay = response.status === 200 && check(html);
    console.log(`${okay ? 'OK' : 'ERROR'}: ${agent} ${path} HTTP ${response.status}${okay ? '' : `: ${reason}`}`);
    failed ||= !okay;
  }
}
if (failed) process.exitCode = 1;
