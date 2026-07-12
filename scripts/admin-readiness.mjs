#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 10_000;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  apiBaseUrl: normalizeBaseUrl(args.apiUrl || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  adminBaseUrl: normalizeBaseUrl(args.adminUrl || process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  timeoutMs: numberArg(args.timeoutMs || process.env.ADMIN_READINESS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  allowEmpty: Boolean(args.allowEmpty),
  skipAuthProbe: Boolean(args.skipAuthProbe),
  verbose: Boolean(args.verbose),
};

const auth = {
  email: args.adminEmail || process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '',
  password: args.adminPassword || process.env.ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || '',
};

const results = [];
const context = {};

if (!auth.email || !auth.password) {
  console.warn('- WARN set ADMIN_EMAIL and ADMIN_PASSWORD/SMOKE_ADMIN_PASSWORD for protected admin readiness checks');
}

await run('backend health', async () => {
  const payload = await requestJson(`${config.apiBaseUrl}/api/health`);
  if (payload?.ok === false) throw new Error('backend health returned ok=false');
});

await run('admin auth probe', async () => {
  if (config.skipAuthProbe) return skipped('auth probe disabled');
  const result = await request(`${config.adminBaseUrl}/api/admin/sources`, {
    allowStatuses: [200, 401],
    noAuth: true,
  });
  if (result.status === 401) return;
  throw new Error('admin sources is reachable without basic auth; production admin must be protected');
});

await run('admin dashboard', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/dashboard`, { auth });
  if (!payload || typeof payload !== 'object') throw new Error('dashboard payload is empty');
});

await run('admin sources health', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/sources`, { auth });
  const sources = listFromPayload(payload, ['sources', 'items']);
  requirePositive(sources.length, 'sources length');
  const sourceNames = sources.map((source) => `${source.code || source.sourceCode || source.name || ''}`.toUpperCase());
  if (!sourceNames.some((name) => name.includes('TICKETSCLOUD'))) throw new Error('Ticketscloud source is missing');
  if (!sourceNames.some((name) => name.includes('TEPLOHOD'))) throw new Error('Teplohod source is missing');
  const problematic = sources.filter((source) => {
    const status = source.health?.status || source.healthStatus || source.status;
    const issues = source.health?.openIssues || source.openIssues || [];
    return ['error', 'blocked'].includes(String(status).toLowerCase()) || issues.length > 0;
  });
  if (problematic.length) {
    context.sourceIssues = problematic.map(sourceLabel).join(', ');
  }
});

await run('admin events list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/events?limit=10`, { auth });
  const events = listFromPayload(payload, ['events', 'items', 'rows']);
  requirePositive(totalFromPayload(payload, events), 'events total');
  const first = events[0];
  if (first && !(first.title || first.name)) throw new Error('first event has no title/name');
});

await run('admin orders list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/orders?limit=10`, { auth });
  const orders = listFromPayload(payload, ['orders', 'items', 'rows']);
  if (!orders.length) return skipped('orders list is empty');
  const first = orders[0];
  if (!(first.publicCode || first.number || first.id)) throw new Error('first order has no visible identifier');
});

await run('admin buyers list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/buyers?limit=10`, { auth });
  const buyers = listFromPayload(payload, ['buyers', 'items', 'rows']);
  if (!buyers.length) return skipped('buyers list is empty');
});

await run('admin change requests list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/event-change-requests?limit=10`, { auth });
  const requests = listFromPayload(payload, ['requests', 'items', 'rows']);
  if (!requests.length) return skipped('change requests list is empty');
});

await run('admin venues list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/venues?limit=10`, { auth });
  const venues = listFromPayload(payload, ['venues', 'items', 'rows']);
  requirePositive(totalFromPayload(payload, venues), 'venues total');
});

await run('admin cities list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/cities?limit=10`, { auth });
  const cities = listFromPayload(payload, ['cities', 'items', 'rows']);
  requirePositive(totalFromPayload(payload, cities), 'cities total');
});

await run('admin landings list', async () => {
  const payload = await requestJson(`${config.adminBaseUrl}/api/admin/landings?limit=10`, { auth });
  const landings = listFromPayload(payload, ['landings', 'items', 'rows']);
  if (!landings.length) return skipped('landings list is empty');
});

if (context.sourceIssues) {
  results.push({
    name: 'source health note',
    status: 'warn',
    elapsed: 0,
    detail: `sources with issues: ${context.sourceIssues}`,
  });
}

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
  const result = await request(url, options);
  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${result.body.slice(0, 160)}`);
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const headers = new Headers(options.headers || {});
  if (!options.noAuth && options.auth) {
    headers.set('Authorization', `Basic ${Buffer.from(`${options.auth.email}:${options.auth.password}`).toString('base64')}`);
  }

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const body = await response.text();
    const allowStatuses = options.allowStatuses || [200];
    if (!allowStatuses.includes(response.status)) {
      throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 220)}`);
    }
    if (config.verbose) console.log(`  ${response.status} ${url}`);
    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

function requirePositive(value, label) {
  const number = Number(value || 0);
  if (number > 0 || config.allowEmpty) return;
  throw new Error(`${label} must be greater than 0`);
}

function listFromPayload(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function sourceLabel(source) {
  return source.label || source.name || source.sourceCode || source.code || source.id || 'unknown source';
}

function totalFromPayload(payload, list) {
  return payload?.total ?? payload?.count ?? payload?.metrics?.total ?? list.length;
}

function skipped(reason) {
  return { skipped: true, reason };
}

function printSummary() {
  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.filter((result) => result.status === 'fail');
  const skipped = results.filter((result) => result.status === 'skip').length;
  const warned = results.filter((result) => result.status === 'warn').length;
  if (warned) {
    for (const warning of results.filter((result) => result.status === 'warn')) {
      console.log(`- WARN ${warning.name}: ${warning.detail}`);
    }
  }
  console.log('');
  console.log(`Admin readiness summary: ${passed} passed, ${warned} warnings, ${failed.length} failed, ${skipped} skipped`);
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
    else if (arg === '--allow-empty') parsed.allowEmpty = true;
    else if (arg === '--skip-auth-probe') parsed.skipAuthProbe = true;
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
  console.log(`Daibilet admin/backend readiness

Usage:
  pnpm readiness:admin -- --api-url https://api.daibilet.ru --admin-url https://admin.daibilet.ru

Environment:
  API_BASE_URL                    Backend API origin, default http://127.0.0.1:4000
  ADMIN_BASE_URL                  Admin/API origin, default API_BASE_URL
  ADMIN_EMAIL                     Basic auth user
  ADMIN_PASSWORD                  Basic auth password
  SMOKE_ADMIN_PASSWORD            Alternative password for smoke/readiness

Flags:
  --allow-empty                   Do not fail on empty events/cities/venues
  --skip-auth-probe               Do not verify that admin is protected without auth
  --timeout-ms <ms>               Per-request timeout
  --verbose                       Print requested URLs
`);
}
