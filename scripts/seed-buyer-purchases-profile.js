#!/usr/bin/env node
/**
 * Ensure SiteUser for buyer purchases seed email (catalog MSK PG).
 * Catalog internal ticket rows live in apps/web buyer-purchases-seed.ts (deploy web).
 * This script only ensures login account exists / optionally resets password.
 *
 * Usage:
 *   node scripts/seed-buyer-purchases-profile.js --dry-run
 *   node scripts/seed-buyer-purchases-profile.js --apply
 *   node scripts/seed-buyer-purchases-profile.js --apply --reset-password
 *
 * With --reset-password: writes temp credentials to SECRETS_PATH (default
 * /opt/daibilet/secrets/buyer-seed-v-butin.txt) - never prints password to stdout.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const { createRequire } = require('module');

const scryptAsync = promisify(crypto.scrypt);

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

function loadPg() {
  const candidates = [
    path.join(rootDir, 'packages', 'db', 'package.json'),
    path.join(rootDir, 'apps', 'backend', 'package.json'),
    path.join(rootDir, 'package.json'),
  ];
  for (const pkgJson of candidates) {
    if (!fs.existsSync(pkgJson)) continue;
    try {
      const req = createRequire(pkgJson);
      return req('pg');
    } catch {
      // try next
    }
  }
  // Last resort: local node_modules next to cwd
  // eslint-disable-next-line import/no-extraneous-dependencies
  return require('pg');
}

const { Pool } = loadPg();

const EMAIL = 'v.butin@yandex.ru';
const DISPLAY_NAME = 'Василий Бутин';
const USER_ID_PREFIX = 'usr_buyer_seed_butin';
const dryRun = process.argv.includes('--dry-run');
const doApply = process.argv.includes('--apply');
const resetPassword = process.argv.includes('--reset-password');
const secretsPath =
  process.env.BUYER_SEED_SECRETS_PATH ||
  (fs.existsSync('/opt/daibilet')
    ? '/opt/daibilet/secrets/buyer-seed-v-butin.txt'
    : path.join(rootDir, '.deploy-tmp', 'buyer-seed-v-butin.txt'));

const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';
const pool = new Pool({ connectionString, max: 2 });

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

async function main() {
  if (!doApply && !dryRun) {
    console.log('Pass --dry-run or --apply');
    process.exitCode = 2;
    return;
  }

  const existing = await pool.query(
    `select id, email, name, "isActive", "createdAt" from "SiteUser" where lower(email) = $1 limit 1`,
    [EMAIL],
  );
  const row = existing.rows[0] || null;

  const report = {
    dryRun: !doApply,
    email: EMAIL,
    before: row
      ? { id: row.id, email: row.email, name: row.name, isActive: row.isActive }
      : null,
    action: row ? (resetPassword ? 'reset-password' : 'noop-exists') : 'create',
    secretsPath: resetPassword || !row ? secretsPath : null,
    seedTicketCodes: ['DB26-BUTIN01', 'DB26-BUTIN02', 'DB26-BUTIN03'],
    note:
      'Internal museum tickets are served from apps/web buyer-purchases-seed.ts after web deploy. This script only manages SiteUser login.',
  };

  if (!doApply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  let userId = row?.id || null;
  let passwordWritten = false;

  if (!row) {
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    userId = `${USER_ID_PREFIX}_${crypto.randomBytes(4).toString('hex')}`;
    await pool.query(
      `
        insert into "SiteUser" (
          id, email, "passwordHash", name, "isActive", "createdAt", "updatedAt"
        ) values ($1, $2, $3, $4, true, now(), now())
        on conflict (email) do nothing
      `,
      [userId, EMAIL, passwordHash, DISPLAY_NAME],
    );
    writeSecretsFile(secretsPath, { email: EMAIL, password, userId, created: true });
    passwordWritten = true;
    report.action = 'created';
  } else if (resetPassword) {
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    await pool.query(
      `update "SiteUser" set "passwordHash" = $2, "isActive" = true, "updatedAt" = now() where id = $1`,
      [row.id, passwordHash],
    );
    writeSecretsFile(secretsPath, { email: EMAIL, password, userId: row.id, created: false });
    passwordWritten = true;
    report.action = 'password-reset';
  } else {
    report.action = 'noop-exists';
  }

  const after = await pool.query(
    `select id, email, name, "isActive" from "SiteUser" where lower(email) = $1 limit 1`,
    [EMAIL],
  );
  report.after = after.rows[0] || null;
  report.passwordWritten = passwordWritten;
  report.secretsPath = passwordWritten ? secretsPath : null;
  console.log(JSON.stringify(report, null, 2));
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

function generateTempPassword() {
  // Avoid ambiguous chars; length >= 6 for registerSiteUser rules.
  return `Db${crypto.randomBytes(9).toString('base64url')}!`;
}

function writeSecretsFile(filePath, payload) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const body = [
    `# Buyer purchases seed credentials - DO NOT COMMIT`,
    `# generatedAt=${new Date().toISOString()}`,
    `email=${payload.email}`,
    `password=${payload.password}`,
    `userId=${payload.userId}`,
    `loginUrl=https://daibilet.ru/login?returnUrl=/account/purchases`,
    `purchasesUrl=https://daibilet.ru/account/purchases`,
    `ticketCodes=DB26-BUTIN01,DB26-BUTIN02,DB26-BUTIN03`,
    '',
  ].join('\n');
  fs.writeFileSync(filePath, body, { mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Windows may ignore chmod
  }
}

function loadRootEnv(dir) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
