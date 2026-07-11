#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 12_000;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  publicBaseUrl: normalizeBaseUrl(args.publicUrl || process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.DAIBILET_SITE_URL || 'http://127.0.0.1:5178'),
  apiBaseUrl: normalizeBaseUrl(args.apiUrl || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  adminBaseUrl: normalizeBaseUrl(args.adminUrl || process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  timeoutMs: numberArg(args.timeoutMs || process.env.SMOKE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  skipAdmin: Boolean(args.skipAdmin),
  skipPages: Boolean(args.skipPages),
  allowEmpty: Boolean(args.allowEmpty),
  includeSync: Boolean(args.includeSync),
  orderLookup: args.orderLookup || process.env.SMOKE_ORDER_LOOKUP || '',
  verbose: Boolean(args.verbose),
};

const adminCredentials = resolveAdminCredentials();
const results = [];
let context = {};

await run('public home page', async () => {
  if (config.skipPages) return skipped('page checks disabled');
  const response = await request(`${config.publicBaseUrl}/`, { expectedContentType: 'text/html' });
  requireText(response.body, ['Дайбилет', 'Daibilet'], 'home page should mention Daibilet');
});

await run('robots.txt', async () => {
  if (config.skipPages) return skipped('page checks disabled');
  const response = await request(`${config.publicBaseUrl}/robots.txt`, { expectedContentType: 'text/plain' });
  requireText(response.body, ['Sitemap', 'User-agent'], 'robots.txt should contain crawl directives');
});

await run('sitemap.xml', async () => {
  if (config.skipPages) return skipped('page checks disabled');
  const response = await request(`${config.publicBaseUrl}/sitemap.xml`, { expectedContentType: 'xml' });
  requireText(response.body, ['<urlset', '<sitemapindex'], 'sitemap.xml should be sitemap XML');
});

await run('public stats', async () => {
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/stats?refresh=1`);
  const stats = payload?.stats || {};
  requirePositive(stats.events, 'stats.events');
  requirePositive(stats.venues, 'stats.venues');
  requirePositive(stats.destinations ?? stats.cities, 'stats.destinations/cities');
  context.stats = stats;
});

await run('public catalog', async () => {
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/events?limit=12&sort=time&refresh=1`);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  requirePositive(payload?.total, 'catalog.total');
  requirePositive(items.length, 'catalog.items.length');
  const first = items.find((item) => item?.slug || item?.id);
  if (!first) throw new Error('catalog returned items without slug/id');
  context.catalog = payload;
  context.firstEvent = first;
  context.eventSlug = first.slug || first.id;
  context.citySlug = first.citySlug || first.destinationSlug || first.city?.slug || '';
  context.venueSlug = first.venueSlug || first.venue?.slug || '';
});

await run('public event detail', async () => {
  const slug = context.eventSlug;
  if (!slug) throw new Error('catalog did not provide an event slug');
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/events/${encodeURIComponent(slug)}`);
  const event = payload?.event || payload;
  const title = event?.title || payload?.title;
  if (!title) throw new Error('event detail does not contain title');
  const city = event?.city || event?.primaryCity || payload?.city;
  const venue = event?.venue || payload?.venue;
  if (!city && !config.allowEmpty) throw new Error('event detail does not contain city');
  if (!venue && !config.allowEmpty) throw new Error('event detail does not contain venue');
  context.eventDetail = payload;
});

await run('public destinations', async () => {
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/destinations`);
  const items = listFromPayload(payload, ['items', 'destinations']);
  requirePositive(items.length, 'destinations.items.length');
  const city = items.find((item) => item?.slug && (item.type === 'city' || item.kind === 'city')) || items.find((item) => item?.slug);
  context.citySlug ||= city?.slug || '';
});

await run('public venues', async () => {
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/venues?limit=12`);
  const items = listFromPayload(payload, ['items', 'venues']);
  requirePositive(items.length, 'venues.items.length');
  const venue = items.find((item) => item?.slug);
  context.venueSlug ||= venue?.slug || '';
});

await run('city hub', async () => {
  if (!context.citySlug) return skipped('no city slug found in catalog/destinations');
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/cities/${encodeURIComponent(context.citySlug)}`);
  const city = payload?.city || payload;
  if (!city?.title && !city?.name) throw new Error('city hub does not contain title/name');
});

await run('venue hub', async () => {
  if (!context.venueSlug) return skipped('no venue slug found in catalog/venues');
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/venues/${encodeURIComponent(context.venueSlug)}`);
  const venue = payload?.venue || payload;
  if (!venue?.title && !venue?.name) throw new Error('venue hub does not contain title/name');
});

await run('api public alias', async () => {
  const payload = await requestJson(`${config.apiBaseUrl}/api/public/stats?refresh=1`);
  requirePositive(payload?.stats?.events, 'api alias stats.events');
});

await run('backend health', async () => {
  const payload = await requestJson(`${config.apiBaseUrl}/api/health`);
  if (payload?.ok === false) throw new Error('backend health returned ok=false');
});

await run('admin sources', async () => {
  if (config.skipAdmin) return skipped('admin checks disabled');
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/sources`, { auth: adminCredentials, requireAuth: true });
  const items = listFromPayload(payload, ['sources', 'items']);
  requirePositive(items.length, 'admin sources length');
  const names = items.map((item) => `${item.code || item.sourceCode || item.name || ''}`.toUpperCase());
  if (!names.some((name) => name.includes('TICKETSCLOUD'))) throw new Error('admin sources does not include Ticketscloud');
  if (!names.some((name) => name.includes('TEPLOHOD'))) throw new Error('admin sources does not include Teplohod');
});

await run('admin orders', async () => {
  if (config.skipAdmin) return skipped('admin checks disabled');
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/orders?limit=10`, { auth: adminCredentials, requireAuth: true, allowStatuses: [200, 404] });
  if (payload?.error && !config.allowEmpty) throw new Error(`admin orders returned ${payload.error}`);
});

await run('buyer order lookup', async () => {
  if (!config.orderLookup) return skipped('SMOKE_ORDER_LOOKUP not set');
  const url = `${config.publicBaseUrl}/api/public/orders?lookup=${encodeURIComponent(config.orderLookup)}`;
  const payload = await requestJson(url);
  const total = Number(payload?.total || 0);
  requirePositive(total, 'buyer order lookup total');
});

await run('optional source sync endpoints', async () => {
  if (!config.includeSync) return skipped('sync checks disabled');
  await requestJson(`${config.adminBaseUrl}/api/admin/sources/ticketscloud/sync`, { method: 'POST', auth: adminCredentials, requireAuth: true });
  await requestJson(`${config.adminBaseUrl}/api/admin/orders/sync`, { method: 'POST', auth: adminCredentials, requireAuth: true });
});

printSummary();

const failed = results.filter((result) => result.status === 'fail');
process.exit(failed.length ? 1 : 0);

async function run(name, fn) {
  const started = Date.now();
  try {
    const value = await fn();
    const elapsed = Date.now() - started;
    if (value?.skipped) {
      results.push({ name, status: 'skip', elapsed, detail: value.reason });
      console.log(`- SKIP ${name}: ${value.reason}`);
      return;
    }
    results.push({ name, status: 'pass', elapsed });
    console.log(`- PASS ${name} (${elapsed} ms)`);
  } catch (error) {
    const elapsed = Date.now() - started;
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'fail', elapsed, detail });
    console.error(`- FAIL ${name} (${elapsed} ms): ${detail}`);
  }
}

async function requestJson(url, options = {}) {
  const response = await request(url, { ...options, expectedContentType: 'json' });
  try {
    return JSON.parse(response.body);
  } catch (error) {
    throw new Error(`Expected JSON from ${url}, got: ${response.body.slice(0, 160)}`);
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const headers = new Headers(options.headers || {});
  if (options.auth) headers.set('Authorization', `Basic ${Buffer.from(`${options.auth.email}:${options.auth.password}`).toString('base64')}`);
  if (options.method === 'POST' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      signal: controller.signal,
    });
    const body = await response.text();
    const allowStatuses = options.allowStatuses || [200];
    if (!allowStatuses.includes(response.status)) {
      if (response.status === 401 && options.requireAuth) {
        throw new Error(`401 unauthorized for ${url}; check ADMIN_EMAIL/ADMIN_PASSWORD or ADMIN_PASSWORD_HASH basic auth`);
      }
      throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 240)}`);
    }
    if (config.verbose) console.log(`  ${response.status} ${url}`);
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function requirePositive(value, label) {
  const number = Number(value || 0);
  if (number > 0) return;
  if (config.allowEmpty) return;
  throw new Error(`${label} must be greater than 0`);
}

function requireText(body, candidates, message) {
  if (candidates.some((candidate) => body.includes(candidate))) return;
  throw new Error(message);
}

function listFromPayload(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function skipped(reason) {
  return { skipped: true, reason };
}

function resolveAdminCredentials() {
  const email = args.adminEmail || process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '';
  const password = args.adminPassword || process.env.ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || '';
  if (!config.skipAdmin && (!email || !password)) {
    console.warn('- WARN admin checks will likely fail: set ADMIN_EMAIL and ADMIN_PASSWORD, or pass --skip-admin');
  }
  return { email, password };
}

function printSummary() {
  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.filter((result) => result.status === 'fail');
  const skipped = results.filter((result) => result.status === 'skip').length;
  console.log('');
  console.log(`Smoke summary: ${passed} passed, ${failed.length} failed, ${skipped} skipped`);
  if (failed.length) {
    for (const failure of failed) {
      console.log(`  FAIL ${failure.name}: ${failure.detail}`);
    }
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--skip-admin') parsed.skipAdmin = true;
    else if (arg === '--skip-pages') parsed.skipPages = true;
    else if (arg === '--allow-empty') parsed.allowEmpty = true;
    else if (arg === '--include-sync') parsed.includeSync = true;
    else if (arg === '--verbose') parsed.verbose = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function numberArg(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function printHelp() {
  console.log(`Daibilet launch smoke

Usage:
  pnpm smoke:launch -- --public-url https://daibilet.ru --api-url https://api.daibilet.ru --admin-url https://admin.daibilet.ru

Environment:
  PUBLIC_BASE_URL       Public origin, default http://127.0.0.1:5178
  API_BASE_URL          API origin, default http://127.0.0.1:4000
  ADMIN_BASE_URL        Admin/API origin, default API_BASE_URL
  ADMIN_EMAIL           Basic auth user for admin checks
  ADMIN_PASSWORD        Basic auth password for admin checks
  SMOKE_ORDER_LOOKUP    Optional exact order/ticket number for buyer lookup

Flags:
  --skip-admin          Skip admin protected checks
  --skip-pages          Skip HTML/robots/sitemap checks
  --allow-empty         Do not fail on zero catalog counters
  --include-sync        Also POST sync endpoints; use only intentionally
  --timeout-ms <ms>     Per-request timeout
  --verbose             Print every requested URL
`);
}
