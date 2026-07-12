#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 10_000;
const args = parseArgs(process.argv.slice(2));
const rootDir = process.cwd();

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  appDir: path.resolve(rootDir, args.appDir || process.env.ADMIN_APP_DIR || 'apps/admin'),
  packageName: args.packageName || process.env.ADMIN_APP_PACKAGE || '@daibilet/admin',
  apiBaseUrl: normalizeBaseUrl(args.apiUrl || process.env.API_BASE_URL || process.env.ADMIN_BASE_URL || 'http://127.0.0.1:4000'),
  adminPageUrl: normalizeBaseUrl(args.adminPageUrl || process.env.ADMIN_PAGE_URL || ''),
  timeoutMs: numberArg(args.timeoutMs || process.env.ADMIN_QA_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  runBuild: Boolean(args.runBuild),
  runTypecheck: Boolean(args.runTypecheck),
  liveApi: Boolean(args.liveApi),
  livePage: Boolean(args.livePage),
  strict: Boolean(args.strict || process.env.ADMIN_QA_STRICT === '1'),
  pnpmCommand: process.env.PNPM_COMMAND || (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'),
};

const auth = {
  email: args.adminEmail || process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '',
  password: args.adminPassword || process.env.ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || '',
};

const results = [];
let pkg = null;

checkPackage();
checkRoutesAndPages();
checkLegacyFallback();
runOptionalCommands();
await runOptionalLiveChecks();

printSummary();

const failed = results.filter((result) => result.status === 'fail');
const warned = results.filter((result) => result.status === 'warn');
process.exit(failed.length || (config.strict && warned.length) ? 1 : 0);

function checkPackage() {
  record(fs.existsSync(config.appDir), `admin app directory exists: ${relative(config.appDir)}`);
  const packagePath = path.join(config.appDir, 'package.json');
  record(fs.existsSync(packagePath), 'admin package.json exists');
  if (!fs.existsSync(packagePath)) return;

  pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  record(pkg.name === config.packageName, `admin package name is ${config.packageName}`, pkg.name || 'missing');
  record(Boolean(pkg.scripts?.typecheck), 'admin typecheck script exists');
  record(Boolean(pkg.scripts?.build), 'admin build script exists');
  record(Boolean(pkg.dependencies?.['@daibilet/contracts']), 'admin uses @daibilet/contracts');
}

function checkRoutesAndPages() {
  const appSource = readOptional('src/App.tsx');
  const navSource = readOptional('src/config/navigation.ts');
  record(Boolean(appSource), 'admin App.tsx exists');
  record(Boolean(navSource), 'admin navigation config exists');

  const requiredRoutes = [
    ['dashboard route', 'Route index'],
    ['events route', 'path="events"'],
    ['orders route', 'path="orders"'],
    ['buyers route', 'path="buyers"'],
    ['venues route', 'path="venues"'],
    ['cities route', 'path="cities"'],
    ['landings route', 'path="landings"'],
    ['sources route', 'path="sources"'],
    ['change requests route', 'path="change-requests"'],
  ];

  for (const [label, needle] of requiredRoutes) {
    record(appSource.includes(needle), label);
  }

  const requiredPages = [
    'src/pages/DashboardPage.tsx',
    'src/pages/EventsPage.tsx',
    'src/pages/ExternalOrdersPage.tsx',
    'src/pages/BuyersPage.tsx',
    'src/pages/VenuesPage.tsx',
    'src/pages/LandingsPage.tsx',
    'src/pages/SourcesPage.tsx',
    'src/pages/EventChangeRequestsPage.tsx',
  ];
  for (const page of requiredPages) record(exists(page), `page exists: ${page}`);

  warnIf(navSource.includes('Sync health'), 'navigation still has English label "Sync health"');
}

function checkLegacyFallback() {
  const indexHtml = readOptional('index.html');
  record(indexHtml.includes('type="module"') && indexHtml.includes('/src/main.tsx'), 'admin index uses Vite module entry');
  record(!indexHtml.includes('/data.js') && !indexHtml.includes('/app.js'), 'admin index does not load legacy data.js/app.js');

  const legacyFiles = ['data.js', 'app.js'].filter((file) => exists(file));
  if (legacyFiles.length) {
    results.push({
      name: 'legacy prototype files note',
      status: 'warn',
      elapsed: 0,
      detail: `${legacyFiles.join(', ')} still exist; they must not be treated as backend data`,
    });
  }
}

function runOptionalCommands() {
  if (config.runTypecheck) runPnpmScript('typecheck');
  if (config.runBuild) runPnpmScript('build');
}

async function runOptionalLiveChecks() {
  if (config.livePage) {
    await run('admin page responds', async () => {
      if (!config.adminPageUrl) return warning('ADMIN_PAGE_URL or --admin-page-url is not set');
      const response = await request(config.adminPageUrl, { expectedStatuses: [200, 401] });
      if (response.status === 401) return;
      if (!response.body.includes('<div id="root"')) throw new Error('admin HTML does not contain React root');
    });
  }

  if (!config.liveApi) return;
  if (!auth.email || !auth.password) {
    results.push({
      name: 'live API credentials',
      status: 'warn',
      elapsed: 0,
      detail: 'ADMIN_EMAIL and ADMIN_PASSWORD/SMOKE_ADMIN_PASSWORD are not set; live API checks skipped',
    });
    return;
  }

  await run('admin API requires auth', async () => {
    const result = await request(`${config.apiBaseUrl}/api/admin/sources`, { expectedStatuses: [200, 401], noAuth: true });
    if (result.status !== 401) throw new Error('admin sources is reachable without auth');
  });

  const endpoints = [
    ['dashboard', '/api/admin/dashboard'],
    ['sources', '/api/admin/sources'],
    ['events', '/api/admin/events?limit=10'],
    ['orders', '/api/admin/orders?limit=10'],
    ['buyers', '/api/admin/buyers?limit=10'],
    ['venues', '/api/admin/venues?limit=10'],
    ['cities', '/api/admin/cities?limit=10'],
    ['landings', '/api/admin/landings?limit=10'],
    ['change requests', '/api/admin/event-change-requests?limit=10'],
  ];

  for (const [label, endpoint] of endpoints) {
    await run(`admin ${label} endpoint`, async () => {
      const payload = await requestJson(`${config.apiBaseUrl}${endpoint}`, { auth });
      if (!payload || typeof payload !== 'object') throw new Error(`${label} payload is empty`);
    });
  }
}

function runPnpmScript(script) {
  if (!pkg?.scripts?.[script]) {
    record(false, `admin ${script} script can run`, '', `${config.packageName} has no ${script} script`);
    return;
  }

  const result = spawnSync(config.pnpmCommand, ['--filter', config.packageName, script], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  record(result.status === 0, `admin ${script} script passes`, '', `${script} exited with ${result.status ?? 'unknown status'}`);
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
  if (!options.noAuth && options.auth) {
    headers.set('Authorization', `Basic ${Buffer.from(`${options.auth.email}:${options.auth.password}`).toString('base64')}`);
  }

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

function exists(file) {
  return fs.existsSync(path.join(config.appDir, file));
}

function readOptional(file) {
  const absolute = path.join(config.appDir, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
}

function record(ok, name, detail = '', failDetail = detail) {
  results.push({ status: ok ? 'pass' : 'fail', name, detail: ok ? detail : failDetail });
}

function warnIf(condition, name, detail = '') {
  results.push({ status: condition ? 'warn' : 'pass', name, detail });
}

function warning(reason) {
  return { warning: true, reason };
}

function relative(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/') || '.';
}

function printSummary() {
  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.filter((result) => result.status === 'fail');
  const warned = results.filter((result) => result.status === 'warn').length;

  console.log('');
  console.log(`Admin launch QA summary: ${passed} passed, ${warned} warnings, ${failed.length} failed`);
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
    else if (arg === '--run-build') parsed.runBuild = true;
    else if (arg === '--run-typecheck') parsed.runTypecheck = true;
    else if (arg === '--live-api') parsed.liveApi = true;
    else if (arg === '--live-page') parsed.livePage = true;
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
  console.log(`Daibilet admin launch QA

Usage:
  pnpm qa:admin
  pnpm qa:admin -- --run-typecheck --run-build
  pnpm qa:admin -- --live-api --api-url https://api.daibilet.ru

Flags:
  --run-typecheck          Execute admin typecheck
  --run-build              Execute admin build
  --live-api               Check protected admin API endpoints
  --live-page              Check admin HTML page
  --api-url <url>          Admin/API origin
  --admin-page-url <url>   Admin page origin
  --strict                 Treat warnings as failures
  --timeout-ms <ms>        Per-request timeout
`);
}
