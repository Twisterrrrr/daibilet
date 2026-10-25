import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TOTP_STEP_SECONDS = 30;
const ENROLLMENT_TTL_MS = 10 * 60 * 1000;

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let buffer = 0;
  const output = [];
  for (const char of String(value).toUpperCase().replace(/=+$/g, '')) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid TOTP secret');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function encryptionKey(env = process.env) {
  const raw = String(env.DAIBILET_ADMIN_MFA_ENCRYPTION_KEY || '');
  let key;
  if (/^[a-f0-9]{64}$/i.test(raw)) key = Buffer.from(raw, 'hex');
  else if (/^[A-Za-z0-9_-]{43,44}$/.test(raw)) key = Buffer.from(raw, 'base64url');
  if (!key || key.length !== 32) {
    const error = new Error('MFA encryption key is not configured');
    error.statusCode = 503;
    throw error;
  }
  return key;
}

export function encryptTotpSecret(secret, env = process.env) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptTotpSecret(value, env = process.env) {
  const [version, iv, tag, ciphertext] = String(value || '').split(':');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted MFA secret');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(env), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

export function totpAtStep(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret, code, now = Date.now(), lastUsedStep = -1n) {
  const normalized = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const current = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (const step of [current, current - 1, current + 1]) {
    if (BigInt(step) <= BigInt(lastUsedStep ?? -1)) continue;
    const expected = totpAtStep(secret, step);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) return BigInt(step);
  }
  return null;
}

export function hashRecoveryCode(code) {
  return createHash('sha256').update(String(code).replace(/[^a-z0-9]/gi, '').toUpperCase()).digest('hex');
}

function makeRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
  });
}

function authError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function beginAdminMfaEnrollment(db, actor, { now = new Date(), env = process.env } = {}) {
  if (!actor?.id || !actor?.sessionId) throw authError('Требуется персональная сессия.', 401);
  const existing = await db.query('select "mfaEnabledAt" from "AdminUser" where id = $1 and state = \'ACTIVE\'', [actor.id]);
  if (!existing.rows[0]) throw authError('Учётная запись недоступна.', 401);
  if (existing.rows[0].mfaEnabledAt) throw authError('Двухфакторная защита уже включена. Для смены устройства используйте восстановление доступа.', 409);
  const secret = base32Encode(randomBytes(20));
  const expiresAt = new Date(now.getTime() + ENROLLMENT_TTL_MS);
  await db.query(
    `update "AdminUser" set "mfaPendingSecretCiphertext" = $2, "mfaPendingExpiresAt" = $3, "updatedAt" = $4 where id = $1 and state = 'ACTIVE'`,
    [actor.id, encryptTotpSecret(secret, env), expiresAt, now],
  );
  await appendMfaAudit(db, actor.id, 'admin.mfa.enrollment.begin', now);
  const label = encodeURIComponent(`${actor.email} (Daibilet)`);
  return { secret, expiresAt, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=Daibilet&algorithm=SHA1&digits=6&period=30` };
}

export async function confirmAdminMfaEnrollment(db, actor, code, { now = new Date(), env = process.env } = {}) {
  if (!actor?.id || !actor?.sessionId) throw authError('Требуется персональная сессия.', 401);
  const pending = await db.query(
    `select "mfaPendingSecretCiphertext", "mfaPendingExpiresAt" from "AdminUser" where id = $1 and state = 'ACTIVE'`, [actor.id],
  );
  const row = pending.rows[0];
  if (!row?.mfaPendingSecretCiphertext || !row.mfaPendingExpiresAt || new Date(row.mfaPendingExpiresAt) <= now) throw authError('Начните настройку двухфакторной защиты заново.', 409);
  const secret = decryptTotpSecret(row.mfaPendingSecretCiphertext, env);
  const step = verifyTotp(secret, code, now.getTime());
  if (step === null) throw authError('Код неверен или уже использован.', 401);
  const recoveryCodes = makeRecoveryCodes();
  await db.transaction(async (tx) => {
    const updated = await tx.query(
      `update "AdminUser" set "mfaSecretCiphertext" = "mfaPendingSecretCiphertext", "mfaEnabledAt" = $2,
        "mfaLastTotpStep" = $3, "mfaPendingSecretCiphertext" = null, "mfaPendingExpiresAt" = null, "updatedAt" = $2
       where id = $1 and "mfaEnabledAt" is null and "mfaPendingExpiresAt" > $2 returning id`, [actor.id, now, step.toString()],
    );
    if (!updated.rows[0]) throw authError('Настройка истекла. Начните заново.', 409);
    await tx.query('delete from "AdminMfaRecoveryCode" where "userId" = $1', [actor.id]);
    for (const recoveryCode of recoveryCodes) {
      await tx.query(
        `insert into "AdminMfaRecoveryCode" (id, "userId", "codeHash", "createdAt") values ($1, $2, $3, $4)`,
        [`adm_rc_${randomBytes(16).toString('hex')}`, actor.id, hashRecoveryCode(recoveryCode), now],
      );
    }
    const session = await tx.query(
      'update "AdminSession" set "mfaVerifiedAt" = $3 where id = $1 and "userId" = $2 and "revokedAt" is null and "expiresAt" > $3 returning id',
      [actor.sessionId, actor.id, now],
    );
    if (!session.rows[0]) throw authError('Сессия завершена. Войдите снова.', 401);
    await appendMfaAudit(tx, actor.id, 'admin.mfa.enrollment.confirm', now);
  });
  return { enabled: true, recoveryCodes };
}

export async function verifyAdminMfaForSession(db, actor, code, { now = new Date(), env = process.env } = {}) {
  if (!actor?.id || !actor?.sessionId) throw authError('Требуется персональная сессия.', 401);
  try {
    return await db.transaction(async (tx) => {
      const result = await tx.query(
        `select "mfaSecretCiphertext", "mfaLastTotpStep" from "AdminUser" where id = $1 and state = 'ACTIVE' and "mfaEnabledAt" is not null for update`, [actor.id],
      );
      const row = result.rows[0];
      if (!row?.mfaSecretCiphertext) throw authError('Двухфакторная защита ещё не настроена.', 409);
      const step = verifyTotp(decryptTotpSecret(row.mfaSecretCiphertext, env), code, now.getTime(), row.mfaLastTotpStep ?? -1n);
      let method;
      if (step !== null) {
        const updated = await tx.query(
          `update "AdminUser" set "mfaLastTotpStep" = $2 where id = $1 and ("mfaLastTotpStep" is null or "mfaLastTotpStep" < $2) returning id`,
          [actor.id, step.toString()],
        );
        if (!updated.rows[0]) throw authError('Код уже использован. Дождитесь нового кода.', 409);
        method = 'totp';
      } else {
        const used = await tx.query(
          `update "AdminMfaRecoveryCode" set "usedAt" = $3 where "userId" = $1 and "codeHash" = $2 and "usedAt" is null returning id`,
          [actor.id, hashRecoveryCode(code), now],
        );
        if (!used.rows[0]) throw authError('Код неверен или уже использован.', 401);
        method = 'recovery';
      }
      const session = await tx.query(
        `update "AdminSession" set "mfaVerifiedAt" = $3 where id = $1 and "userId" = $2 and "revokedAt" is null and "expiresAt" > $3 returning id`,
        [actor.sessionId, actor.id, now],
      );
      if (!session.rows[0]) throw authError('Сессия завершена. Войдите снова.', 401);
      await appendMfaAudit(tx, actor.id, `admin.mfa.session.verify_${method}`, now);
      return { verified: true };
    });
  } catch (error) {
    if (error?.statusCode === 401 || error?.statusCode === 409) {
      await appendMfaAudit(db, actor.id, 'admin.mfa.session.verify', now, 'denied').catch(() => {});
    }
    throw error;
  }
}

async function appendMfaAudit(db, actorId, action, now, outcome = 'success') {
  await db.query(
    `insert into "AdminAuditLog" (id, "actorId", action, outcome, "targetType", "targetId", "createdAt")
     values ($1, $2, $3, $4, 'AdminUser', $2, $5)`,
    [`audit_${randomBytes(16).toString('hex')}`, actorId, action, outcome, now],
  );
}

export async function clearAdminMfaForSession(db, actor, { now = new Date() } = {}) {
  if (!actor?.sessionId) throw authError('Требуется персональная сессия.', 401);
  await db.query('update "AdminSession" set "mfaVerifiedAt" = null where id = $1 and "userId" = $2 and "revokedAt" is null', [actor.sessionId, actor.id]);
  await appendMfaAudit(db, actor.id, 'admin.mfa.session.lock', now);
  return { verified: false };
}
