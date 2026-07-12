#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const rootDir = process.cwd();

if (args.help) {
  printHelp();
  process.exit(0);
}

const requestedEnvFile = args.envFile || process.env.DAIBILET_ENV_FILE || '.env';
const envFile = resolveEnvFile(requestedEnvFile);
const env = envFile ? parseEnvFile(envFile) : {};
const strict = Boolean(args.strict || process.env.PREFLIGHT_STRICT === '1');

const checks = [];

checkRuntime();
checkRequiredFiles();
checkEnv();
checkPublicTarget();
checkDeployScripts();
checkGitState();

printSummary();

const errors = checks.filter((check) => check.status === 'fail');
const warnings = checks.filter((check) => check.status === 'warn');
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);

function checkRuntime() {
  const major = Number(process.versions.node.split('.')[0]);
  record(major >= 22, 'Node.js runtime is 22+', `current ${process.versions.node}`, 'Node.js 22+ is required by pnpm workspace');
  try {
    const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const version = execFileSync(pnpmCommand, ['--version'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    }).trim();
    record(true, 'pnpm is available', version);
  } catch {
    record(false, 'pnpm is available', '', 'pnpm is required for deploy build scripts');
  }
}

function checkRequiredFiles() {
  const files = [
    'package.json',
    'pnpm-workspace.yaml',
    'packages/db/prisma/schema.prisma',
    'deploy/scripts/deploy-from-git.sh',
    'deploy/systemd/daibilet-api.service',
    'deploy/systemd/daibilet-public.service',
    'deploy/nginx/daibilet.conf.example',
    'scripts/launch-smoke.mjs',
  ];
  for (const file of files) {
    record(fs.existsSync(path.join(rootDir, file)), `required file exists: ${file}`);
  }

  if (!envFile) {
    record(false, `env file exists: ${requestedEnvFile}`, '', 'create /opt/daibilet/.env on the server or pass --env-file');
  } else {
    record(true, `env file loaded: ${path.relative(rootDir, envFile) || envFile}`);
  }
}

function checkEnv() {
  const nodeEnv = value('NODE_ENV');
  record(!nodeEnv || nodeEnv === 'production', 'NODE_ENV is production or unset', nodeEnv || 'unset', 'production deploy should use NODE_ENV=production');

  requireEnv('DATABASE_URL');
  requireEnv('PORT');
  requireEnv('PUBLIC_PORT');
  requireEnv('PUBLIC_APP_FILTER');
  requireEnv('DAIBILET_BACKEND_API_URL');
  requireEnv('DAIBILET_SITE_URL');
  requireEnv('ADMIN_EMAIL', { fallback: 'ADMIN_USER' });
  requireAnyEnv(['ADMIN_PASSWORD', 'ADMIN_PASSWORD_HASH', 'ADMIN_PASSWORD_SHA256'], 'admin password/hash');
  requireAnyEnv(['TICKETSCLOUD_API_TOKEN', 'TC_API_TOKEN'], 'Ticketscloud API token');
  requireAnyEnv(['TICKETSCLOUD_WIDGET_TOKEN', 'TC_WIDGET_TOKEN', 'NEXT_PUBLIC_TC_WIDGET_TOKEN'], 'Ticketscloud widget token');
  requireEnv('TEP_API_URL');
  requireEnv('TEP_WIDGET_ID');

  const databaseUrl = value('DATABASE_URL');
  warnIf(databaseUrl.includes('change-me'), 'DATABASE_URL does not use placeholder password', 'replace change-me before deploy');
  warnIf(databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1'), 'DATABASE_URL points to localhost', 'ok only if Postgres runs on the same server');

  const port = Number(value('PORT'));
  const publicPort = Number(value('PUBLIC_PORT'));
  record(Number.isInteger(port) && port > 0, 'PORT is a positive integer', value('PORT'));
  record(Number.isInteger(publicPort) && publicPort > 0, 'PUBLIC_PORT is a positive integer', value('PUBLIC_PORT'));
  record(port !== publicPort, 'PORT and PUBLIC_PORT are different', `${port}/${publicPort}`, 'backend and Next public cannot bind the same port');

  const publicApiUrl = value('NEXT_PUBLIC_DAIBILET_API_URL');
  warnIf(Boolean(publicApiUrl), 'NEXT_PUBLIC_DAIBILET_API_URL is empty for production', 'public should use same-origin /api unless intentionally overridden');

  if (value('RUN_LAUNCH_SMOKE') === '1') {
    warnIf(!value('ADMIN_PASSWORD') && !process.env.SMOKE_ADMIN_PASSWORD, 'RUN_LAUNCH_SMOKE has clear admin password for admin checks', 'set SMOKE_ADMIN_PASSWORD or ADMIN_PASSWORD, otherwise deploy smoke skips admin');
  }
}

function checkPublicTarget() {
  const filter = value('PUBLIC_APP_FILTER') || '@daibilet/public';
  const packages = findWorkspacePackages();
  const target = packages.find((pkg) => pkg.name === filter);
  record(Boolean(target), `PUBLIC_APP_FILTER package exists: ${filter}`, target?.dir || '', 'Cursor apps/web must declare package name @daibilet/web before switching');
  if (!target) return;
  record(Boolean(target.scripts?.build), `${filter} has build script`);
  record(Boolean(target.scripts?.preview), `${filter} has preview script`);
}

function checkDeployScripts() {
  const deployScript = readText('deploy/scripts/deploy-from-git.sh');
  const publicService = readText('deploy/systemd/daibilet-public.service');
  const nginx = readText('deploy/nginx/daibilet.conf.example');

  record(deployScript.includes('PUBLIC_APP_FILTER'), 'deploy script uses PUBLIC_APP_FILTER');
  record(deployScript.includes('RUN_LAUNCH_SMOKE'), 'deploy script supports optional launch smoke');
  record(publicService.includes('PUBLIC_APP_FILTER'), 'public systemd service uses PUBLIC_APP_FILTER');
  record(nginx.includes('upstream daibilet_public'), 'nginx template has daibilet_public upstream');
  record(nginx.includes('server_name api.daibilet.ru'), 'nginx template has api.daibilet.ru server');
  record(nginx.includes('location ^~ /api/public/'), 'nginx routes /api/public/* separately');
}

function checkGitState() {
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: rootDir, encoding: 'utf8' }).trim();
    record(Boolean(branch), 'git branch is available', branch);
    const status = execFileSync('git', ['status', '--short'], { cwd: rootDir, encoding: 'utf8' }).trim();
    warnIf(Boolean(status), 'git working tree is clean', status || 'clean');
  } catch {
    record(false, 'git repository is available');
  }
}

function requireEnv(name, options = {}) {
  const actual = value(name) || (options.fallback ? value(options.fallback) : '');
  record(Boolean(actual), `env ${name}${options.fallback ? `/${options.fallback}` : ''} is set`);
}

function requireAnyEnv(names, label) {
  record(names.some((name) => Boolean(value(name))), `env ${label} is set`, names.join(' | '));
}

function warnIf(condition, name, detail) {
  if (condition) checks.push({ status: 'warn', name, detail });
  else checks.push({ status: 'pass', name, detail });
}

function record(ok, name, detail = '', failDetail = detail) {
  checks.push({ status: ok ? 'pass' : 'fail', name, detail: ok ? detail : failDetail });
}

function value(name) {
  if (process.env[name] !== undefined) return process.env[name] || '';
  return env[name] || '';
}

function resolveEnvFile(file) {
  const absolute = path.resolve(rootDir, file);
  if (fs.existsSync(absolute)) return absolute;
  const example = path.resolve(rootDir, '.env.example');
  if (file === '.env' && fs.existsSync(example)) return example;
  return null;
}

function parseEnvFile(file) {
  const parsed = {};
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    parsed[match[1]] = unquote(match[2].trim());
  }
  return parsed;
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function findWorkspacePackages() {
  const roots = ['apps', 'packages'];
  const packages = [];
  for (const root of roots) {
    const dir = path.join(rootDir, root);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const pkgPath = path.join(dir, name, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      packages.push({ name: pkg.name, scripts: pkg.scripts || {}, dir: path.join(root, name) });
    }
  }
  return packages;
}

function readText(file) {
  return fs.readFileSync(path.join(rootDir, file), 'utf8');
}

function printSummary() {
  for (const check of checks) {
    const label = check.status.toUpperCase().padEnd(4);
    const suffix = check.detail ? ` - ${redact(check.detail)}` : '';
    console.log(`${label} ${check.name}${suffix}`);
  }
  const failed = checks.filter((check) => check.status === 'fail').length;
  const warned = checks.filter((check) => check.status === 'warn').length;
  const passed = checks.filter((check) => check.status === 'pass').length;
  console.log('');
  console.log(`Preflight summary: ${passed} passed, ${warned} warnings, ${failed} failed`);
}

function redact(text) {
  return String(text)
    .replace(/(password|token|secret|key)=([^,\s]+)/gi, '$1=<redacted>')
    .replace(/postgresql:\/\/([^:]+):([^@]+)@/gi, 'postgresql://$1:<redacted>@');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') parsed.help = true;
    if (arg === '--strict') parsed.strict = true;
    else if (arg === '--env-file') {
      parsed.envFile = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Daibilet deploy preflight

Usage:
  pnpm preflight:deploy -- --env-file /opt/daibilet/.env

Environment:
  DAIBILET_ENV_FILE        Env file path, default .env
  PREFLIGHT_STRICT=1      Treat warnings as failures

Flags:
  --env-file <path>       Env file to inspect
  --strict                Treat warnings as failures
`);
}
