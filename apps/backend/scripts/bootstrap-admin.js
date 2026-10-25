import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db.js';
import { hashAdminPassword } from '../src/admin-session-auth.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..', '..');

function loadRootEnv() {
  try {
    for (const line of readFileSync(path.join(rootDir, '.env'), 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const name = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[name] == null) process.env[name] = value;
    }
  } catch {
    // The caller may provide all bootstrap values and DATABASE_URL directly.
  }
}

loadRootEnv();

const email = String(process.env.DAIBILET_ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
const displayName = String(process.env.DAIBILET_ADMIN_BOOTSTRAP_NAME || '').trim();
const password = String(process.env.DAIBILET_ADMIN_BOOTSTRAP_PASSWORD || '');

if (!email.includes('@') || !displayName || password.length < 12) {
  throw new Error('Set DAIBILET_ADMIN_BOOTSTRAP_EMAIL, DAIBILET_ADMIN_BOOTSTRAP_NAME, and a password of at least 12 characters.');
}

const db = createDb(rootDir);
try {
  const passwordHash = await hashAdminPassword(password);
  await db.transaction(async (tx) => {
    await tx.query('select pg_advisory_xact_lock(hashtext($1))', ['daibilet:first-admin-bootstrap']);
    const existing = await tx.query('select count(*)::int as count from "AdminUser"');
    if (existing.rows[0]?.count > 0) {
      throw new Error('Admin bootstrap is allowed only when the AdminUser table is empty.');
    }
    await tx.query(
      `insert into "AdminUser" (id, email, "displayName", "passwordHash", state, roles, "emailVerifiedAt", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, 'ACTIVE', ARRAY['SUPERADMIN']::"AdminRole"[], now(), now(), now())`,
      [`adm_usr_${randomUUID().replaceAll('-', '')}`, email, displayName, passwordHash],
    );
    await tx.query(
      `insert into "AdminAuditLog" (id, action, outcome, "targetType", "targetId", "createdAt")
       select $1, 'admin.staff.bootstrap', 'success', 'AdminUser', id, now() from "AdminUser" where lower(email) = $2`,
      [`audit_${randomUUID().replaceAll('-', '')}`, email],
    );
  });
  console.log(`Created the first SUPERADMIN account for ${email}.`);
} finally {
  await db.close();
}
