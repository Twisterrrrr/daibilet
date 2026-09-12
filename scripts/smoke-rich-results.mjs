#!/usr/bin/env node
/**
 * SEO 2.2.5 — smoke: JSON-LD blocks parse and contain expected @type on key routes.
 * Walks @graph. Usage: node scripts/smoke-rich-results.mjs [baseUrl]
 */
import { setTimeout as delay } from 'node:timers/promises';

const base = String(process.argv[2] || process.env.SMOKE_BASE_URL || 'https://daibilet.ru').replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 45_000);

async function fetchText(path) {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'daibilet-rich-results-smoke/1.0', accept: 'text/html' },
      redirect: 'follow',
    });
    const text = await res.text();
    return { url, status: res.status, text, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

function collectTypes(node, out = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  const t = node['@type'];
  if (typeof t === 'string') out.add(t);
  else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') out.add(x);
  if (node['@graph']) collectTypes(node['@graph'], out);
  return out;
}

function extractLdTypes(html) {
  const types = new Set();
  let parseErrors = 0;
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      collectTypes(JSON.parse(match[1].trim()), types);
    } catch {
      parseErrors += 1;
    }
  }
  return { types: [...types], parseErrors, blockCount: (html.match(/application\/ld\+json/gi) || []).length };
}

const failures = [];

async function check(name, path, requiredTypes) {
  process.stdout.write(`· ${name} ${path} … `);
  try {
    const { status, text, finalUrl } = await fetchText(path);
    if (status !== 200) {
      failures.push(`${name}: HTTP ${status}`);
      console.log(`FAIL http=${status}`);
      return;
    }
    const { types, parseErrors } = extractLdTypes(text);
    const missing = requiredTypes.filter((t) => !types.includes(t));
    if (parseErrors || missing.length) {
      failures.push(`${name}: types=[${types.join(',')}] missing=[${missing.join(',')}] parseErr=${parseErrors}`);
      console.log(`FAIL types=${types.join('|') || 'none'} missing=${missing.join(',')}`);
      return;
    }
    console.log(`ok (${types.join(', ')}) → ${finalUrl.replace(base, '') || '/'}`);
  } catch (err) {
    failures.push(`${name}: ${err?.message || err}`);
    console.log(`FAIL ${err?.message || err}`);
  }
}

console.log(`Rich Results smoke → ${base}`);

try {
  const www = await fetchText('https://www.daibilet.ru/');
  const nonWww = !String(www.finalUrl || '').includes('://www.');
  console.log(`· www redirect … ${nonWww ? 'ok' : 'WARN'} status=${www.status} → ${www.finalUrl || ''}`);
  if (!nonWww) failures.push('www did not land on non-www');
} catch (err) {
  console.log(`· www redirect … FAIL ${err?.message || err}`);
  failures.push(`www: ${err?.message || err}`);
}

await check('home', '/', ['WebSite', 'Organization']);
await check('city', '/cities/moscow', ['FAQPage', 'BreadcrumbList']);
await check('help', '/help', ['FAQPage']);

const cityHtml = await fetchText('/cities/moscow').catch(() => null);
let eventSlug = null;
let venueSlug = null;
if (cityHtml?.status === 200) {
  eventSlug = cityHtml.text.match(/\/events\/([a-z0-9-]+)/i)?.[1] || null;
  venueSlug = cityHtml.text.match(/\/venues\/([a-z0-9-]+)/i)?.[1] || null;
}

if (eventSlug) {
  await delay(150);
  await check('event', `/events/${eventSlug}`, ['Event', 'BreadcrumbList']);
} else {
  failures.push('event: no slug from city hub');
  console.log('· event … FAIL no slug');
}

if (venueSlug) {
  await delay(150);
  await check('venue', `/venues/${venueSlug}`, ['Place', 'BreadcrumbList']);
} else {
  console.log('· venue … skip (no slug)');
}

if (failures.length) {
  console.error('\nFAILED:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log('\nAll rich-results checks passed.');
