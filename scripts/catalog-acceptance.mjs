#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_CATALOG_LIMIT = 120;
const DEFAULT_SAMPLE_SIZE = 8;
const DEFAULT_MIN_PRICE_RUB = 100;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  publicBaseUrl: normalizeBaseUrl(args.publicUrl || process.env.PUBLIC_BASE_URL || process.env.DAIBILET_SITE_URL || 'http://127.0.0.1:5178'),
  adminBaseUrl: normalizeBaseUrl(args.adminUrl || process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  timeoutMs: numberArg(args.timeoutMs || process.env.CATALOG_ACCEPTANCE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  catalogLimit: numberArg(args.catalogLimit || process.env.CATALOG_ACCEPTANCE_LIMIT, DEFAULT_CATALOG_LIMIT),
  sampleSize: numberArg(args.sampleSize || process.env.CATALOG_ACCEPTANCE_SAMPLE_SIZE, DEFAULT_SAMPLE_SIZE),
  minPriceRub: numberArg(args.minPriceRub || process.env.CATALOG_MIN_PRICE_RUB, DEFAULT_MIN_PRICE_RUB),
  skipAdmin: Boolean(args.skipAdmin),
  allowStaleSources: Boolean(args.allowStaleSources),
  strict: Boolean(args.strict || process.env.CATALOG_ACCEPTANCE_STRICT === '1'),
  verbose: Boolean(args.verbose),
};

const auth = {
  email: args.adminEmail || process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '',
  password: args.adminPassword || process.env.ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || '',
};

const results = [];
const context = {
  stats: null,
  catalog: null,
  sampleItems: [],
  landingSlugs: [],
};

await run('public stats are non-zero', async () => {
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/stats?refresh=1`);
  const stats = payload?.stats || {};
  requirePositive(stats.events, 'stats.events');
  requirePositive(stats.venues, 'stats.venues');
  requirePositive(stats.destinations ?? stats.cities, 'stats.destinations/cities');
  context.stats = stats;
});

await run('public catalog is saleable', async () => {
  const payload = await requestJson(`${config.publicBaseUrl}/api/public/events?limit=${config.catalogLimit}&sort=time&refresh=1`);
  const items = listFromPayload(payload, ['items', 'sessions']);
  requirePositive(payload?.total, 'catalog.total');
  requirePositive(items.length, 'catalog.items.length');

  if (context.stats?.events != null && Number(context.stats.events) !== Number(payload.total)) {
    throw new Error(`stats.events (${context.stats.events}) differs from catalog.total (${payload.total})`);
  }

  const validItems = items.filter((item) => missingCatalogFields(item).length === 0);
  context.catalog = payload;
  context.sampleItems = validItems.slice(0, config.sampleSize);
  context.landingSlugs = (payload?.facets?.landings || [])
    .filter((landing) => landing?.slug && Number(landing.events || 0) > 0)
    .map((landing) => landing.slug)
    .slice(0, 5);

  const missing = items.filter((item) => missingCatalogFields(item).length > 0);
  if (missing.length) {
    throw new Error(`catalog has ${missing.length} items with missing fields: ${describeMissingItems(missing.slice(0, 5))}`);
  }

  const lowPrices = items.filter((item) => typeof item.priceFrom === 'number' && item.priceFrom < config.minPriceRub);
  if (lowPrices.length) {
    throw new Error(`catalog has ${lowPrices.length} items below ${config.minPriceRub} RUB: ${describeItems(lowPrices.slice(0, 5))}`);
  }

  const missingPrices = items.filter((item) => typeof item.priceFrom !== 'number');
  if (missingPrices.length) {
    throw new Error(`catalog has ${missingPrices.length} items without priceFrom: ${describeItems(missingPrices.slice(0, 5))}`);
  }

  const notReady = items.filter((item) => item.purchaseReady !== true || !purchaseUrl(item));
  if (notReady.length) {
    throw new Error(`catalog has ${notReady.length} items without purchase entry: ${describeItems(notReady.slice(0, 5))}`);
  }

  const htmlDescriptions = items.filter((item) => containsHtml(item.description));
  if (htmlDescriptions.length) {
    throw new Error(`catalog has HTML in descriptions: ${describeItems(htmlDescriptions.slice(0, 5))}`);
  }

  assertNoRawSlotDuplicates(items);
});

await run('event detail pages are saleable', async () => {
  if (!context.sampleItems.length) throw new Error('catalog sample is empty');

  const failures = [];
  for (const item of context.sampleItems) {
    const slug = item.slug || item.id;
    if (!slug) {
      failures.push(`${item.title || item.id}: no slug`);
      continue;
    }

    const payload = await requestJson(`${config.publicBaseUrl}/api/public/events/${encodeURIComponent(slug)}`);
    const event = payload?.event || payload;
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
    const ticketPrices = Array.isArray(payload?.ticketPrices) ? payload.ticketPrices : [];
    const offers = Array.isArray(payload?.offers) ? payload.offers : [];

    if (!event?.title) failures.push(`${slug}: missing title`);
    if (isUnknown(event?.city) || !event?.citySlug) failures.push(`${slug}: missing city/citySlug`);
    if (isUnknown(event?.venue) || !event?.venueSlug) failures.push(`${slug}: missing venue/venueSlug`);
    if (event?.purchaseReady !== true && !purchaseUrl(event) && !sessions.some((session) => session.purchaseReady || session.purchaseUrl)) {
      failures.push(`${slug}: missing purchase entry`);
    }
    if (typeof event?.priceFrom === 'number' && event.priceFrom < config.minPriceRub) {
      failures.push(`${slug}: priceFrom below ${config.minPriceRub}`);
    }
    if (sessions.length > 5) failures.push(`${slug}: event detail exposes ${sessions.length} sessions, expected <= 5`);
    if (!ticketPrices.length && !offers.some((offer) => typeof offer.priceRub === 'number')) {
      failures.push(`${slug}: no ticket price categories`);
    }
    for (const price of ticketPrices) {
      if (typeof price.priceRub === 'number' && price.priceRub < config.minPriceRub) {
        failures.push(`${slug}: ticket price ${price.title || price.key} below ${config.minPriceRub}`);
      }
    }
    if (containsHtml(event?.description)) failures.push(`${slug}: HTML in description`);
    if (hasDuplicateKeys(ticketPrices.map((price) => normalizeText(`${price.title}:${price.priceRub}:${price.sourceCode || price.source || ''}`)))) {
      failures.push(`${slug}: duplicate ticket price rows`);
    }
  }

  if (failures.length) throw new Error(failures.slice(0, 12).join('; '));
});

await run('destinations and venues are populated', async () => {
  const destinationsPayload = await requestJson(`${config.publicBaseUrl}/api/public/destinations`);
  const destinations = listFromPayload(destinationsPayload, ['items', 'destinations']);
  requirePositive(destinations.length, 'destinations length');
  const visibleDestinations = destinations.filter((item) => Number(item.events || 0) >= 2);
  requirePositive(visibleDestinations.length, 'visible destinations length');

  const venuesPayload = await requestJson(`${config.publicBaseUrl}/api/public/venues?limit=24`);
  const venues = listFromPayload(venuesPayload, ['items', 'venues']);
  requirePositive(venues.length, 'venues length');
  const brokenVenues = venues.filter((venue) => !venue.slug || isUnknown(venue.name || venue.title) || Number(venue.events || 0) <= 0);
  if (brokenVenues.length) throw new Error(`venues have broken rows: ${describeItems(brokenVenues.slice(0, 5))}`);
});

await run('landing selections are deduplicated', async () => {
  if (!context.landingSlugs.length) return warning('catalog has no landing facets with events');

  const failures = [];
  for (const slug of context.landingSlugs) {
    const payload = await requestJson(`${config.publicBaseUrl}/api/public/landings/${encodeURIComponent(slug)}`);
    const sessions = listFromPayload(payload, ['sessions', 'items']);
    if (!sessions.length) {
      failures.push(`${slug}: no sessions`);
      continue;
    }
    const duplicates = duplicateKeys(sessions.map((item) => duplicateKey(item, { includeProvider: true })));
    if (duplicates.length) failures.push(`${slug}: duplicate sessions ${duplicates.slice(0, 3).join(', ')}`);
    const lowPrices = sessions.filter((item) => typeof item.priceFrom === 'number' && item.priceFrom < config.minPriceRub);
    if (lowPrices.length) failures.push(`${slug}: low prices ${describeItems(lowPrices.slice(0, 3))}`);
  }

  if (failures.length) throw new Error(failures.slice(0, 10).join('; '));
});

await run('admin source health supports catalog sales', async () => {
  if (config.skipAdmin) return skipped('admin source checks disabled');
  if (!auth.email || !auth.password) return warning('admin credentials are not set; source freshness was not checked');

  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/sources`, { auth });
  const sources = listFromPayload(payload, ['sources', 'items']);
  requirePositive(sources.length, 'sources length');

  const names = sources.map((source) => String(source.sourceCode || source.code || source.name || source.label || '').toUpperCase());
  if (!names.some((name) => name.includes('TICKETSCLOUD'))) throw new Error('Ticketscloud source is missing');
  if (!names.some((name) => name.includes('TEPLOHOD'))) throw new Error('Teplohod source is missing');

  const notSaleable = sources.filter((source) => source.purchase?.ready === false || Number(source.counts?.groupedEvents || 0) <= 0);
  if (notSaleable.length) throw new Error(`sources are not saleable: ${notSaleable.map(sourceLabel).join(', ')}`);

  const stale = sources.filter((source) => source.health?.isStale || String(source.health?.status || '').toLowerCase() === 'error');
  if (stale.length) {
    const detail = stale.map((source) => {
      const hours = source.health?.staleHours != null ? ` (${Math.round(Number(source.health.staleHours))}h stale)` : '';
      return `${sourceLabel(source)}${hours}`;
    }).join(', ');
    if (config.allowStaleSources) return warning(`stale source catalog sync: ${detail}`);
    throw new Error(`stale source catalog sync: ${detail}`);
  }
});

printSummary();

const failed = results.filter((result) => result.status === 'fail');
const warned = results.filter((result) => result.status === 'warn');
process.exit(failed.length || (config.strict && warned.length) ? 1 : 0);

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
    if (value?.warning) {
      results.push({ name, status: 'warn', elapsed, detail: value.reason });
      console.log(`- WARN ${name}: ${value.reason}`);
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
  const response = await request(url, options);
  try {
    return JSON.parse(response.body);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${response.body.slice(0, 180)}`);
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const headers = new Headers(options.headers || {});
  if (options.auth) headers.set('Authorization', `Basic ${Buffer.from(`${options.auth.email}:${options.auth.password}`).toString('base64')}`);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const body = await response.text();
    const allowStatuses = options.allowStatuses || [200];
    if (!allowStatuses.includes(response.status)) throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 240)}`);
    if (config.verbose) console.log(`  ${response.status} ${url}`);
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function assertNoRawSlotDuplicates(items) {
  const sameProviderDuplicates = duplicateKeys(items.map((item) => duplicateKey(item, { includeProvider: true })));
  if (sameProviderDuplicates.length) {
    throw new Error(`same-provider duplicate event cards detected: ${sameProviderDuplicates.slice(0, 8).join(', ')}`);
  }

  const crossProviderDuplicates = duplicateKeys(items.map((item) => duplicateKey(item, { includeProvider: false })));
  if (crossProviderDuplicates.length) {
    results.push({
      name: 'cross-provider duplicate note',
      status: 'warn',
      elapsed: 0,
      detail: `possible duplicate cards across providers: ${crossProviderDuplicates.slice(0, 8).join(', ')}`,
    });
  }
}

function missingCatalogFields(item) {
  const missing = [];
  if (!item?.slug && !item?.id) missing.push('slug');
  if (!item?.title) missing.push('title');
  if (isUnknown(item?.city) && isUnknown(item?.destination)) missing.push('city/destination');
  if (!item?.citySlug && !item?.sourceCitySlug) missing.push('citySlug');
  if (isUnknown(item?.venue)) missing.push('venue');
  if (!item?.venueSlug) missing.push('venueSlug');
  if (!item?.category) missing.push('category');
  return missing;
}

function duplicateKey(item, options) {
  const provider = options.includeProvider ? normalizeText(item.purchaseProvider || item.offerSourceCode || item.sourceCode || '') : '';
  return [
    provider,
    normalizeText(item.title),
    normalizeText(item.destination || item.city),
    normalizeText(item.venue),
  ].filter(Boolean).join('|');
}

function duplicateKeys(keys) {
  const counts = new Map();
  for (const key of keys.filter(Boolean)) counts.set(key, (counts.get(key) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => `${key} x${count}`);
}

function hasDuplicateKeys(keys) {
  return duplicateKeys(keys).length > 0;
}

function listFromPayload(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function requirePositive(value, label) {
  const number = Number(value || 0);
  if (number > 0) return;
  throw new Error(`${label} must be greater than 0`);
}

function purchaseUrl(item) {
  return item?.purchaseUrl || item?.widgetUrl || item?.deeplinkUrl || null;
}

function containsHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

function isUnknown(value) {
  const text = normalizeText(value);
  return !text || text === 'unknown' || text.includes('ne ukazan') || text.includes('не указан') || text.includes('не указано');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

function describeItems(items) {
  return items.map((item) => item.title || item.name || item.slug || item.id || 'untitled').join('; ');
}

function describeMissingItems(items) {
  return items
    .map((item) => `${item.title || item.name || item.slug || item.id || 'untitled'} [${missingCatalogFields(item).join(', ')}]`)
    .join('; ');
}

function sourceLabel(source) {
  return source.label || source.name || source.sourceCode || source.code || source.id || 'unknown source';
}

function skipped(reason) {
  return { skipped: true, reason };
}

function warning(reason) {
  return { warning: true, reason };
}

function printSummary() {
  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.filter((result) => result.status === 'fail');
  const warned = results.filter((result) => result.status === 'warn').length;
  const skipped = results.filter((result) => result.status === 'skip').length;

  console.log('');
  console.log(`Catalog acceptance summary: ${passed} passed, ${warned} warnings, ${failed.length} failed, ${skipped} skipped`);
  for (const warningResult of results.filter((result) => result.status === 'warn')) {
    console.log(`  WARN ${warningResult.name}: ${warningResult.detail}`);
  }
  for (const failure of failed) {
    console.log(`  FAIL ${failure.name}: ${failure.detail}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--skip-admin') parsed.skipAdmin = true;
    else if (arg === '--allow-stale-sources') parsed.allowStaleSources = true;
    else if (arg === '--strict') parsed.strict = true;
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
  console.log(`Daibilet catalog acceptance

Usage:
  pnpm acceptance:catalog -- --public-url https://daibilet.ru --admin-url https://api.daibilet.ru

Environment:
  PUBLIC_BASE_URL                 Public origin, default http://127.0.0.1:5178
  ADMIN_BASE_URL / API_BASE_URL   Admin/API origin, default http://127.0.0.1:4000
  ADMIN_EMAIL                     Basic auth user for source checks
  ADMIN_PASSWORD                  Basic auth password
  SMOKE_ADMIN_PASSWORD            Alternative admin password

Flags:
  --skip-admin                    Do not check admin source health
  --allow-stale-sources           Warn instead of fail on stale source sync
  --catalog-limit <n>             Catalog sample size, default 120
  --sample-size <n>               Event detail sample size, default 8
  --min-price-rub <n>             Minimum public display price, default 100
  --strict                        Treat warnings as failures
  --timeout-ms <ms>               Per-request timeout
  --verbose                       Print requested URLs
`);
}
