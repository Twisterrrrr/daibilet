#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_STATS_BUDGET_MS = 500;
const DEFAULT_CATALOG_BUDGET_MS = 1_500;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  publicBaseUrl: normalizeBaseUrl(args.publicUrl || process.env.PUBLIC_BASE_URL || process.env.DAIBILET_SITE_URL || 'http://127.0.0.1:5178'),
  apiBaseUrl: normalizeBaseUrl(args.apiUrl || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  adminBaseUrl: normalizeBaseUrl(args.adminUrl || process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  timeoutMs: numberArg(args.timeoutMs || process.env.MONITOR_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  statsBudgetMs: numberArg(args.statsBudgetMs || process.env.MONITOR_STATS_BUDGET_MS, DEFAULT_STATS_BUDGET_MS),
  catalogBudgetMs: numberArg(args.catalogBudgetMs || process.env.MONITOR_CATALOG_BUDGET_MS, DEFAULT_CATALOG_BUDGET_MS),
  skipAdmin: Boolean(args.skipAdmin),
  allowStaleSources: Boolean(args.allowStaleSources),
  json: Boolean(args.json),
};

const auth = {
  email: args.adminEmail || process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '',
  password: args.adminPassword || process.env.ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || '',
};

const checks = [];

await check('backend health', async () => {
  const result = await requestJson(`${config.apiBaseUrl}/api/health`);
  if (result.payload?.ok === false) throw new Error('backend health returned ok=false');
  return { elapsed: result.elapsed };
});

await check('public stats', async () => {
  const result = await requestJson(`${config.publicBaseUrl}/api/public/stats`);
  const stats = result.payload?.stats || {};
  if (Number(stats.events || 0) <= 0) throw new Error('stats.events is zero');
  if (Number(stats.venues || 0) <= 0) throw new Error('stats.venues is zero');
  if (Number(stats.destinations ?? stats.cities ?? 0) <= 0) throw new Error('stats.destinations/cities is zero');
  const detail = `${stats.events} events, ${stats.venues} venues, ${stats.destinations ?? stats.cities} destinations`;
  if (result.elapsed > config.statsBudgetMs) return warning(`slow stats ${result.elapsed}ms > ${config.statsBudgetMs}ms; ${detail}`, result.elapsed);
  return { elapsed: result.elapsed, detail };
});

await check('public catalog warm sample', async () => {
  const result = await requestJson(`${config.publicBaseUrl}/api/public/events?limit=1&sort=time`);
  const items = Array.isArray(result.payload?.items) ? result.payload.items : [];
  if (Number(result.payload?.total || 0) <= 0) throw new Error('catalog.total is zero');
  if (!items.length) throw new Error('catalog sample is empty');
  const first = items[0];
  if (!first?.title || !first?.slug) throw new Error('catalog sample has no title/slug');
  if (first.purchaseReady !== true) throw new Error('catalog sample is not purchase ready');
  const detail = `${result.payload.total} events; first=${first.title}`;
  if (result.elapsed > config.catalogBudgetMs) return warning(`slow catalog ${result.elapsed}ms > ${config.catalogBudgetMs}ms; ${detail}`, result.elapsed);
  return { elapsed: result.elapsed, detail };
});

await check('api public alias', async () => {
  const result = await requestJson(`${config.apiBaseUrl}/api/public/stats`);
  if (Number(result.payload?.stats?.events || 0) <= 0) throw new Error('api public alias stats.events is zero');
  return { elapsed: result.elapsed };
});

await check('source health', async () => {
  if (config.skipAdmin) return skipped('admin source checks disabled');
  if (!auth.email || !auth.password) return warning('admin credentials are not set; source health skipped');

  const result = await requestJson(`${config.adminBaseUrl}/api/admin/sources`, { auth });
  const sources = listFromPayload(result.payload, ['sources', 'items']);
  if (!sources.length) throw new Error('sources list is empty');
  const names = sources.map((source) => String(source.sourceCode || source.code || source.label || '').toUpperCase());
  if (!names.some((name) => name.includes('TICKETSCLOUD'))) throw new Error('Ticketscloud source missing');
  if (!names.some((name) => name.includes('TEPLOHOD'))) throw new Error('Teplohod source missing');
  const stale = sources.filter((source) => source.health?.isStale || String(source.health?.status || '').toLowerCase() === 'error');
  if (stale.length) {
    const detail = stale.map((source) => source.label || source.sourceCode || source.id).join(', ');
    if (config.allowStaleSources) return warning(`stale sources: ${detail}`, result.elapsed);
    throw new Error(`stale sources: ${detail}`);
  }
  return { elapsed: result.elapsed, detail: `${sources.length} sources` };
});

printSummary();

const failed = checks.filter((item) => item.status === 'fail');
process.exit(failed.length ? 1 : 0);

async function check(name, fn) {
  const started = Date.now();
  try {
    const value = await fn();
    const elapsed = value?.elapsed ?? Date.now() - started;
    if (value?.skipped) {
      checks.push({ name, status: 'skip', elapsed, detail: value.reason });
      if (!config.json) console.log(`- SKIP ${name}: ${value.reason}`);
      return;
    }
    if (value?.warning) {
      checks.push({ name, status: 'warn', elapsed, detail: value.reason });
      if (!config.json) console.log(`- WARN ${name}: ${value.reason}`);
      return;
    }
    checks.push({ name, status: 'pass', elapsed, detail: value?.detail || '' });
    if (!config.json) console.log(`- PASS ${name} (${elapsed} ms)${value?.detail ? `: ${value.detail}` : ''}`);
  } catch (error) {
    const elapsed = Date.now() - started;
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, status: 'fail', elapsed, detail });
    if (!config.json) console.error(`- FAIL ${name} (${elapsed} ms): ${detail}`);
  }
}

async function requestJson(url, options = {}) {
  const result = await request(url, options);
  try {
    return { ...result, payload: JSON.parse(result.body) };
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${result.body.slice(0, 180)}`);
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const headers = new Headers(options.headers || {});
  if (options.auth) headers.set('Authorization', `Basic ${Buffer.from(`${options.auth.email}:${options.auth.password}`).toString('base64')}`);
  const started = Date.now();
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const body = await response.text();
    const elapsed = Date.now() - started;
    const expectedStatuses = options.expectedStatuses || [200];
    if (!expectedStatuses.includes(response.status)) throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 220)}`);
    return { status: response.status, body, elapsed };
  } finally {
    clearTimeout(timeout);
  }
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

function warning(reason, elapsed) {
  return { warning: true, reason, elapsed };
}

function printSummary() {
  const summary = {
    generatedAt: new Date().toISOString(),
    publicBaseUrl: config.publicBaseUrl,
    apiBaseUrl: config.apiBaseUrl,
    passed: checks.filter((item) => item.status === 'pass').length,
    warnings: checks.filter((item) => item.status === 'warn').length,
    failed: checks.filter((item) => item.status === 'fail').length,
    skipped: checks.filter((item) => item.status === 'skip').length,
    checks,
  };

  if (config.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log('');
  console.log(`Monitor summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed, ${summary.skipped} skipped`);
  for (const warningResult of checks.filter((item) => item.status === 'warn')) {
    console.log(`  WARN ${warningResult.name}: ${warningResult.detail}`);
  }
  for (const failure of checks.filter((item) => item.status === 'fail')) {
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
    else if (arg === '--json') parsed.json = true;
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
  console.log(`Daibilet monitoring lite

Usage:
  pnpm monitor:lite
  pnpm monitor:lite -- --public-url https://daibilet.ru --api-url https://api.daibilet.ru

Flags:
  --skip-admin             Do not check admin source health
  --allow-stale-sources    Warn instead of fail on stale source sync
  --json                   Print JSON summary
  --stats-budget-ms <ms>   Stats response warning budget, default 500
  --catalog-budget-ms <ms> Catalog response warning budget, default 1500
  --timeout-ms <ms>        Per-request timeout
`);
}
