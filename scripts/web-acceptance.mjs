#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const rootDir = process.cwd();

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  appDir: path.resolve(rootDir, args.appDir || process.env.WEB_APP_DIR || 'apps/web'),
  packageName: args.packageName || process.env.WEB_APP_PACKAGE || '@daibilet/web',
  runBuild: Boolean(args.runBuild),
  runTypecheck: Boolean(args.runTypecheck),
  strict: Boolean(args.strict || process.env.WEB_ACCEPTANCE_STRICT === '1'),
  allowLegacyFallback: Boolean(args.allowLegacyFallback),
  pnpmCommand: process.env.PNPM_COMMAND || (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'),
};

const checks = [];
let pkg = null;

checkPackage();
checkNextStructure();
checkRoutes();
checkApiContract();
checkSeoContract();
checkNoLegacyFallback();
runOptionalCommands();

printSummary();

const failed = checks.filter((check) => check.status === 'fail');
const warned = checks.filter((check) => check.status === 'warn');
process.exit(failed.length || (config.strict && warned.length) ? 1 : 0);

function checkPackage() {
  record(fs.existsSync(config.appDir), `app directory exists: ${relative(config.appDir)}`);
  const packagePath = path.join(config.appDir, 'package.json');
  record(fs.existsSync(packagePath), 'package.json exists');
  if (!fs.existsSync(packagePath)) return;

  pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  record(pkg.name === config.packageName, `package name is ${config.packageName}`, pkg.name || 'missing');
  record(Boolean(pkg.scripts?.typecheck), 'typecheck script exists');
  record(Boolean(pkg.scripts?.build), 'build script exists');
  record(Boolean(pkg.scripts?.start || pkg.scripts?.preview), 'start or preview script exists');

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  record(Boolean(deps.next), 'Next.js dependency exists');
  record(Boolean(deps.react), 'React dependency exists');
  record(Boolean(deps['react-dom']), 'React DOM dependency exists');
  warnIf(!deps['@daibilet/db'], '@daibilet/db dependency exists for Prisma-backed public reads');
  warnIf(!deps['@daibilet/contracts'], '@daibilet/contracts dependency exists for stable DTO contracts');
}

function checkNextStructure() {
  record(exists('tsconfig.json'), 'tsconfig.json exists');
  record(exists('next.config.ts') || exists('next.config.mjs') || exists('next.config.js'), 'Next config exists');
  record(exists('app'), 'Next app directory exists');
  record(exists('app/layout.tsx') || exists('app/layout.ts'), 'root layout exists');
  record(exists('src'), 'src directory exists');
}

function checkRoutes() {
  const hasCatchAll = exists('app/[[...path]]/page.tsx') || exists('app/[[...path]]/page.ts');

  record(hasCatchAll || anyPage(['app/page']), 'home page route exists');
  record(hasCatchAll || anyPage(['app/events/page']), 'events catalog page route exists');
  record(hasCatchAll || anyPage(['app/events/[slug]/page']), 'event detail page route exists');
  record(hasCatchAll || anyPage(['app/cities/page']), 'cities catalog page route exists');
  record(hasCatchAll || anyPage(['app/cities/[slug]/page']), 'city hub page route exists');
  record(hasCatchAll || anyPage(['app/venues/page', 'app/locations/page']), 'venues catalog page route exists');
  record(hasCatchAll || anyPage(['app/venues/[slug]/page', 'app/locations/[slug]/page']), 'venue hub page route exists');
  record(hasCatchAll || anyPage(['app/podborki/page', 'app/landings/page']), 'collections/landings catalog page route exists');
  record(hasCatchAll || anyPage(['app/account/purchases/page', 'app/my-orders/page']), 'buyer purchases page route exists');

  warnIf(!(hasCatchAll || anyPage(['app/help/page'])), 'help page route exists');
  warnIf(!(hasCatchAll || anyPage(['app/legal/page', 'app/offer/page'])), 'legal/offer page route exists');
}

function checkApiContract() {
  const requiredRoutes = [
    ['public stats API', 'app/api/public/stats/route'],
    ['public events API', 'app/api/public/events/route'],
    ['public event detail API', 'app/api/public/events/[slug]/route'],
    ['public home preview API', 'app/api/public/home/preview/route'],
    ['public destinations API', 'app/api/public/destinations/route'],
    ['public cities API', 'app/api/public/cities/route'],
    ['public city detail API', 'app/api/public/cities/[slug]/route'],
    ['public venues API', 'app/api/public/venues/route'],
    ['public venue detail API', 'app/api/public/venues/[slug]/route'],
    ['public landing detail API', 'app/api/public/landings/[slug]/route'],
    ['public buyer order lookup API', 'app/api/public/orders/route'],
    ['buyer account purchases API', 'app/api/account/purchases/route'],
  ];

  for (const [label, routeBase] of requiredRoutes) {
    record(anyRoute([routeBase]), `${label} exists`);
  }

  warnIf(!anyRoute(['app/api/health/route']), 'web health API exists');
  warnIf(!anyRoute(['app/api/[[...path]]/route']), 'backend API bridge catch-all exists for non-public routes');
}

function checkSeoContract() {
  record(exists('app/robots.ts') || anyRoute(['app/robots.txt/route']), 'robots route exists');
  record(exists('app/sitemap.ts') || anyRoute(['app/sitemap.xml/route']), 'sitemap route exists');
  record(anyRoute(['app/sitemaps/[kind]/route']), 'split sitemap route exists');

  const layout = readOptional('app/layout.tsx') || readOptional('app/layout.ts');
  warnIf(!layout.includes('metadata') && !layout.includes('generateMetadata'), 'root metadata is declared');

  const seoSources = allFiles(['app', 'src']).filter((file) => /\.(ts|tsx)$/.test(file));
  const seoText = seoSources.map((file) => readOptional(file)).join('\n');
  warnIf(!seoText.includes('canonical'), 'canonical handling exists');
  warnIf(!seoText.includes('application/ld+json') && !seoText.includes('JsonLd'), 'JSON-LD rendering exists');
}

function checkNoLegacyFallback() {
  const legacyFiles = [
    'data.js',
    'app.js',
    'public/data.js',
    'public/app.js',
  ].filter((file) => exists(file));

  if (config.allowLegacyFallback) {
    warnIf(legacyFiles.length > 0, `legacy prototype files are absent (${legacyFiles.join(', ') || 'none'})`);
    return;
  }

  record(legacyFiles.length === 0, 'legacy prototype files are absent', legacyFiles.join(', '), 'remove data.js/app.js fallback files from apps/web');
}

function runOptionalCommands() {
  if (config.runTypecheck) runPnpmScript('typecheck');
  if (config.runBuild) runPnpmScript('build');
}

function runPnpmScript(script) {
  if (!pkg?.scripts?.[script]) {
    record(false, `${script} script can run`, '', `${config.packageName} has no ${script} script`);
    return;
  }

  const result = spawnSync(config.pnpmCommand, ['--filter', config.packageName, script], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  record(result.status === 0, `${script} script passes`, '', `${script} exited with ${result.status ?? 'unknown status'}`);
}

function anyPage(bases) {
  return bases.some((base) => exists(`${base}.tsx`) || exists(`${base}.ts`));
}

function anyRoute(bases) {
  return bases.some((base) => exists(`${base}.ts`) || exists(`${base}.tsx`));
}

function exists(file) {
  return fs.existsSync(path.join(config.appDir, file));
}

function readOptional(file) {
  const absolute = path.join(config.appDir, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
}

function allFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    const absolute = path.join(config.appDir, dir);
    if (!fs.existsSync(absolute)) continue;
    walk(absolute, files);
  }
  return files.map((file) => path.relative(config.appDir, file).replace(/\\/g, '/'));
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
}

function record(ok, name, detail = '', failDetail = detail) {
  checks.push({ status: ok ? 'pass' : 'fail', name, detail: ok ? detail : failDetail });
}

function warnIf(condition, name, detail = '') {
  checks.push({ status: condition ? 'warn' : 'pass', name, detail });
}

function relative(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/') || '.';
}

function printSummary() {
  for (const check of checks) {
    const label = check.status.toUpperCase().padEnd(4);
    const suffix = check.detail ? ` - ${check.detail}` : '';
    console.log(`${label} ${check.name}${suffix}`);
  }

  const passed = checks.filter((check) => check.status === 'pass').length;
  const warned = checks.filter((check) => check.status === 'warn').length;
  const failed = checks.filter((check) => check.status === 'fail').length;
  console.log('');
  console.log(`Web acceptance summary: ${passed} passed, ${warned} warnings, ${failed} failed`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--run-build') parsed.runBuild = true;
    else if (arg === '--run-typecheck') parsed.runTypecheck = true;
    else if (arg === '--strict') parsed.strict = true;
    else if (arg === '--allow-legacy-fallback') parsed.allowLegacyFallback = true;
    else if (arg === '--app-dir') {
      parsed.appDir = argv[index + 1];
      index += 1;
    } else if (arg === '--package-name') {
      parsed.packageName = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Daibilet apps/web acceptance contract

Usage:
  pnpm acceptance:web -- --app-dir apps/web --package-name @daibilet/web
  pnpm acceptance:web -- --run-typecheck --run-build

Flags:
  --app-dir <path>             Target app directory, default apps/web
  --package-name <name>        Target package name, default @daibilet/web
  --run-typecheck              Execute package typecheck script
  --run-build                  Execute package build script
  --allow-legacy-fallback      Downgrade data.js/app.js fallback files to warnings
  --strict                     Treat warnings as failures
`);
}
