/**
 * Audit /places catalog hrefs + hub location/venue slugs against live (or AUDIT_BASE_URL).
 *
 *   node scripts/audit-places-href-validity.mjs
 *   node scripts/audit-places-href-validity.mjs --skip-http
 *   node scripts/audit-places-href-validity.mjs --limit=80
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const BASE = process.env.AUDIT_BASE_URL || 'https://daibilet.ru';
const skipHttp = process.argv.includes('--skip-http');
const httpHubsOnly = process.argv.includes('--http=hubs');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const httpLimit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity;

const INSTITUTION_KINDS = new Set([
  'museum',
  'art_space',
  'museum_art_space',
  'theater',
  'concert_hall',
  'bar',
  'club_bar_restaurant',
]);

const MAP_PIN_RE =
  /на карте города|точка на (карте|маршруте)|ориентир в городе|жанровая точка|парковая точка|литературная точка|открытое пространство для прогулок|открытая локация для прогулок и событий/i;

function venueFamily(type) {
  const value = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (value === 'institution') return 'institution';
  if (value === 'location' || value.includes('причал') || value.includes('теплоход')) return 'location';
  return INSTITUTION_KINDS.has(value) ? 'institution' : 'location';
}

function venueHref(venue) {
  const family = venueFamily(venue.type);
  const slug = String(venue.slug || '').trim();
  return family === 'location' ? `/locations/${slug}` : `/venues/${slug}`;
}

function collectHubLinks() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  walk(path.join(rootDir, 'apps/web/src/lib'));
  walk(path.join(rootDir, 'apps/public/src/lib'));

  const links = [];
  const seen = new Set();
  for (const file of files) {
    if (!/(cityInfo|hub|line-presets|lifehacks|local-flavor)/i.test(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    for (const m of src.matchAll(/locationSlug:\s*'([^']+)'/g)) {
      const href = `/locations/${m[1]}`;
      const key = `${rel}:${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ href, slug: m[1], family: 'location', file: rel });
    }
    for (const m of src.matchAll(/venueSlug:\s*'([^']+)'/g)) {
      const href = `/venues/${m[1]}`;
      const key = `${rel}:${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ href, slug: m[1], family: 'institution', file: rel });
    }
    for (const m of src.matchAll(/href:\s*'(\/(?:locations|venues)\/[^']+)'/g)) {
      const href = m[1];
      const key = `${rel}:${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const family = href.startsWith('/locations/') ? 'location' : 'institution';
      links.push({ href, slug: href.split('/').pop(), family, file: rel });
    }
  }
  return links;
}

function collectHubDescs() {
  const files = [
    path.join(rootDir, 'apps/web/src/lib/cityInfo.ts'),
    ...fs
      .readdirSync(path.join(rootDir, 'apps/web/src/lib'))
      .filter((name) => /-hub\.ts$/.test(name))
      .map((name) => path.join(rootDir, 'apps/web/src/lib', name)),
  ];
  const hits = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    for (const m of src.matchAll(/\bdesc:\s*'((?:\\'|[^'])*)'/g)) {
      const text = m[1].replace(/\\'/g, "'");
      if (MAP_PIN_RE.test(text) || text.length < 24) {
        hits.push({ file: rel, text: text.slice(0, 180), reason: MAP_PIN_RE.test(text) ? 'map-pin' : 'short' });
      }
    }
  }
  return hits;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 0) {
  const res = await fetch(url, { headers: { 'user-agent': 'daibilet-places-audit' } });
  if (res.status === 429 && attempt < 6) {
    const wait = 1500 * 2 ** attempt;
    console.warn(`429 ${url} retry in ${wait}ms`);
    await sleep(wait);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function fetchFamily(family) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 80; i++) {
    const qs = new URLSearchParams({ family, limit: '100', counts: '0' });
    if (cursor) qs.set('cursor', cursor);
    const url = `${BASE}/api/public/venues?${qs}`;
    const json = await fetchJson(url);
    const items = Array.isArray(json.venues) ? json.venues : [];
    out.push(...items);
    if (!json.hasMore || !json.nextCursor) break;
    cursor = json.nextCursor;
    await sleep(250);
  }
  return out;
}

function copyIssues(venue) {
  const blobs = [venue.shortDescription, venue.hookFact, venue.description]
    .map((v) => String(v || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const issues = [];
  if (!blobs.length) issues.push('empty');
  for (const text of blobs) {
    if (MAP_PIN_RE.test(text)) issues.push(`map-pin: ${text.slice(0, 160)}`);
  }
  return issues;
}

async function probe(href) {
  const url = `${BASE}${href}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: ac.signal,
      headers: { 'user-agent': 'daibilet-places-audit' },
    });
    const loc = res.headers.get('location') || '';
    let status = res.status;
    let finalHref = href;
    let body = '';
    if ([301, 302, 307, 308].includes(status) && loc) {
      finalHref = loc.startsWith('http') ? new URL(loc).pathname : loc;
      const followed = await fetch(loc.startsWith('http') ? loc : `${BASE}${loc}`, {
        method: 'GET',
        redirect: 'follow',
        signal: ac.signal,
        headers: { 'user-agent': 'daibilet-places-audit' },
      });
      status = followed.status;
      body = await followed.text();
    } else {
      body = await res.text();
    }
    const unavailable = /временно недоступна/i.test(body);
    const notFound = status === 404 || /This page could not be found|Страница не найдена/i.test(body);
    return { href, status, finalHref, unavailable, notFound, redirect: loc || null };
  } catch (err) {
    return { href, status: 0, error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

function uniqueByHref(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row.href)) continue;
    seen.add(row.href);
    out.push(row);
  }
  return out;
}

async function main() {
  console.log(`base=${BASE}`);
  const locations = await fetchFamily('location');
  await sleep(400);
  const institutions = await fetchFamily('institution');
  const catalog = [...locations, ...institutions];
  console.log(`catalog location=${locations.length} institution=${institutions.length} total=${catalog.length}`);

  const catalogBySlug = new Map();
  for (const v of catalog) catalogBySlug.set(String(v.slug || '').trim(), v);

  const hubLinks = collectHubLinks();
  const hubUnique = uniqueByHref(hubLinks);
  const hubMissing = hubUnique.filter((row) => !catalogBySlug.has(row.slug));
  const hubWrongFamily = hubUnique.filter((row) => {
    const v = catalogBySlug.get(row.slug);
    if (!v) return false;
    return venueFamily(v.type) !== row.family;
  });

  const emptyCopy = [];
  const mapPinCopy = [];
  for (const v of catalog) {
    const issues = copyIssues(v);
    if (issues.includes('empty')) emptyCopy.push({ slug: v.slug, name: v.name, city: v.city, type: v.type, href: venueHref(v) });
    const pin = issues.find((x) => x.startsWith('map-pin:'));
    if (pin) mapPinCopy.push({ slug: v.slug, name: v.name, href: venueHref(v), text: pin.slice(9) });
  }

  const hubDescHits = collectHubDescs().filter((h) => h.reason === 'map-pin');

  console.log(`hub explicit links: ${hubUnique.length} (occurrences ${hubLinks.length})`);
  console.log(`hub slug missing from live catalog: ${hubMissing.length}`);
  const missingByFile = {};
  for (const row of hubMissing) {
    missingByFile[row.file] = (missingByFile[row.file] || 0) + 1;
  }
  console.log('hub missing by file:', JSON.stringify(missingByFile, null, 2));
  console.log(`hub family mismatch vs live type: ${hubWrongFamily.length}`);
  console.log(`catalog empty shortDescription+hookFact+description: ${emptyCopy.length}`);
  console.log(`catalog map-pin copy: ${mapPinCopy.length}`);
  console.log(`hub desc map-pin phrases: ${hubDescHits.length}`);

  const catalogTargets = catalog.map((v) => ({ href: venueHref(v), source: 'catalog', slug: v.slug, name: v.name }));
  const hubTargets = hubUnique.map((row) => ({ ...row, source: 'hub' }));
  const probeTargets = uniqueByHref(httpHubsOnly ? hubTargets : [...catalogTargets, ...hubTargets]).slice(
    0,
    Number.isFinite(httpLimit) ? httpLimit : undefined,
  );

  let httpFails = [];
  if (!skipHttp) {
    console.log(`http probe ${probeTargets.length} hrefs…`);
    const results = await mapPool(probeTargets, 3, async (row) => {
      const result = await probe(row.href);
      await sleep(120);
      return result;
    });
    httpFails = results.filter((r, i) => {
      const row = probeTargets[i];
      r.source = row.source;
      r.name = row.name || row.slug;
      return r.notFound || r.unavailable || r.status === 0 || (r.status && r.status >= 400);
    });
    console.log(`http bad: ${httpFails.length}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    catalog: { location: locations.length, institution: institutions.length, total: catalog.length },
    hub: {
      unique: hubUnique.length,
      missingFromCatalog: hubMissing.slice(0, 80),
      missingCount: hubMissing.length,
      wrongFamily: hubWrongFamily.slice(0, 40),
      wrongFamilyCount: hubWrongFamily.length,
    },
    copy: {
      emptyCount: emptyCopy.length,
      emptySample: emptyCopy.slice(0, 40),
      mapPin: mapPinCopy,
      hubMapPinDescs: hubDescHits,
    },
    http: {
      probed: skipHttp ? 0 : probeTargets.length,
      badCount: httpFails.length,
      bad: httpFails.slice(0, 80),
    },
  };
  const outPath = path.join(rootDir, 'tmp-places-href-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`wrote ${outPath}`);

  if (hubMissing.length) {
    console.log('\n--- hub missing (first 30) ---');
    for (const row of hubMissing.slice(0, 30)) {
      console.log(`${row.href}  (${row.file})`);
    }
  }
  if (httpFails.length) {
    console.log('\n--- http bad (first 30) ---');
    for (const row of httpFails.slice(0, 30)) {
      console.log(`${row.status || row.error} ${row.href} -> ${row.finalHref || ''} ${row.source}`);
    }
  }
  if (mapPinCopy.length) {
    console.log('\n--- catalog map-pin copy ---');
    for (const row of mapPinCopy) console.log(`${row.href}  ${row.text}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
