#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TIMEOUT_MS = 10_000;
const args = parseArgs(process.argv.slice(2));
const rootDir = process.cwd();

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  publicBaseUrl: normalizeBaseUrl(args.publicUrl || process.env.PUBLIC_BASE_URL || process.env.DAIBILET_SITE_URL || 'http://127.0.0.1:5178'),
  adminBaseUrl: normalizeBaseUrl(args.adminUrl || process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000'),
  lookup: args.lookup || process.env.SMOKE_ORDER_LOOKUP || '',
  timeoutMs: numberArg(args.timeoutMs || process.env.ORDERS_ACCEPTANCE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  liveApi: Boolean(args.liveApi),
  requireOrders: Boolean(args.requireOrders),
  strict: Boolean(args.strict || process.env.ORDERS_ACCEPTANCE_STRICT === '1'),
};

const auth = {
  email: args.adminEmail || process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '',
  password: args.adminPassword || process.env.ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || '',
};

const results = [];

checkStaticBuyerAccount();
await runLiveChecks();

printSummary();

const failed = results.filter((result) => result.status === 'fail');
const warned = results.filter((result) => result.status === 'warn');
process.exit(failed.length || (config.strict && warned.length) ? 1 : 0);

function checkStaticBuyerAccount() {
  const files = [
    'apps/public/src/components/BuyerOrdersPage.tsx',
    'apps/public/src/components/AccountPurchasesPage.tsx',
    'apps/public/app/api/public/orders/route.ts',
    'apps/public/app/api/account/purchases/route.ts',
    'apps/public/src/server/public-buyer-orders.ts',
    'apps/admin/src/pages/ExternalOrdersPage.tsx',
  ];

  for (const file of files) record(fs.existsSync(path.join(rootDir, file)), `file exists: ${file}`);

  const publicServer = readRoot('apps/public/src/server/public-buyer-orders.ts');
  record(publicServer.includes('sourceOrderId: null'), 'public buyer DTO hides sourceOrderId');
  record(publicServer.includes('publicOrderCode'), 'public buyer DTO has fallback order number');
  record(/% 9000000\)\s*\+\s*1000000/.test(publicServer), 'fallback order number is 7-digit numeric');

  const buyerPage = readRoot('apps/public/src/components/BuyerOrdersPage.tsx');
  record(!buyerPage.includes('External') && !buyerPage.includes('sourceOrderId'), 'buyer page does not render external/source order wording');

  const adminOrders = readRoot('apps/admin/src/pages/ExternalOrdersPage.tsx');
  record(adminOrders.includes('displayStatus'), 'admin orders use displayStatus');
  record(adminOrders.includes('publicCode'), 'admin orders prefer publicCode');
}

async function runLiveChecks() {
  if (!config.liveApi) return;

  if (!auth.email || !auth.password) {
    results.push({
      name: 'live admin credentials',
      status: 'warn',
      elapsed: 0,
      detail: 'ADMIN_EMAIL and ADMIN_PASSWORD/SMOKE_ADMIN_PASSWORD are not set; admin order checks skipped',
    });
  } else {
    await run('admin orders payload is operator-friendly', async () => {
      const payload = await requestJson(`${config.adminBaseUrl}/api/admin/orders?limit=10`, { auth });
      const rows = listFromPayload(payload, ['rows', 'items', 'orders']);
      if (!rows.length) {
        if (config.requireOrders) throw new Error('admin orders list is empty');
        return warning('admin orders list is empty before first sales');
      }

      const failures = [];
      for (const order of rows) {
        const number = order.publicCode || order.number || '';
        if (!number) failures.push(`${order.id || 'order'}: no public order number`);
        if (number && !isHumanOrderNumber(number)) failures.push(`${number}: order number is too long or not human-friendly`);
        if (!order.displayStatus && !order.status) failures.push(`${number || order.id}: no status/displayStatus`);
        for (const ticket of order.tickets || []) {
          if (!ticket.displayStatus && !ticket.status) failures.push(`${number || order.id}: ticket without status`);
        }
      }

      if (failures.length) throw new Error(failures.slice(0, 10).join('; '));
    });
  }

  await run('public order lookup contract', async () => {
    if (!config.lookup) return warning('SMOKE_ORDER_LOOKUP is not set; exact buyer lookup skipped');
    const payload = await requestJson(`${config.publicBaseUrl}/api/public/orders?lookup=${encodeURIComponent(config.lookup)}`);
    const rows = listFromPayload(payload, ['rows', 'items']);
    if (!rows.length) {
      if (config.requireOrders) throw new Error(`public order lookup returned no rows for ${config.lookup}`);
      return warning(`public order lookup returned no rows for ${config.lookup}`);
    }

    const failures = [];
    for (const order of rows) {
      if (!isHumanOrderNumber(order.number)) failures.push(`${order.id || 'order'}: public number is not human-friendly`);
      if (order.sourceOrderId) failures.push(`${order.number}: sourceOrderId leaked to public payload`);
      if (!order.displayStatus) failures.push(`${order.number}: missing displayStatus`);
      if (String(order.displayStatus || '').toLowerCase() === order.status) failures.push(`${order.number}: displayStatus looks untranslated`);
      for (const ticket of order.tickets || []) {
        if (!ticket.displayStatus) failures.push(`${order.number}: ticket without displayStatus`);
      }
    }

    if (failures.length) throw new Error(failures.slice(0, 10).join('; '));
  });
}

async function run(name, fn) {
  const started = Date.now();
  try {
    const value = await fn();
    const elapsed = Date.now() - started;
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
  const result = await request(url, options);
  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${result.body.slice(0, 180)}`);
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
    const expectedStatuses = options.expectedStatuses || [200];
    if (!expectedStatuses.includes(response.status)) throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 220)}`);
    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

function isHumanOrderNumber(value) {
  const text = String(value || '').trim();
  if (/^\d{6,8}$/.test(text)) return true;
  return /^[A-Z]{1,3}-?\d{4,8}$/i.test(text);
}

function listFromPayload(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function readRoot(file) {
  const absolute = path.join(rootDir, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
}

function record(ok, name, detail = '', failDetail = detail) {
  results.push({ status: ok ? 'pass' : 'fail', name, detail: ok ? detail : failDetail });
}

function warning(reason) {
  return { warning: true, reason };
}

function printSummary() {
  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.filter((result) => result.status === 'fail');
  const warned = results.filter((result) => result.status === 'warn').length;

  console.log('');
  console.log(`Orders acceptance summary: ${passed} passed, ${warned} warnings, ${failed.length} failed`);
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
    else if (arg === '--live-api') parsed.liveApi = true;
    else if (arg === '--require-orders') parsed.requireOrders = true;
    else if (arg === '--strict') parsed.strict = true;
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
  console.log(`Daibilet orders and buyer account acceptance

Usage:
  pnpm acceptance:orders
  pnpm acceptance:orders -- --live-api --lookup 1234567

Flags:
  --live-api          Check admin/public order API
  --lookup <value>    Exact order or ticket lookup for public buyer API
  --require-orders    Fail if no orders are present
  --strict            Treat warnings as failures
  --timeout-ms <ms>   Per-request timeout
`);
}
