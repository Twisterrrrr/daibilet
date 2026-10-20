import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { hashPassword } from './user-auth.js';

const TTL_SECONDS = 60 * 60;

function secret() {
  const value = process.env.USER_JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-user-jwt-secret-change-me');
  if (!value) throw Object.assign(new Error('Восстановление пароля временно недоступно.'), { statusCode: 503 });
  return value;
}

function invalid() {
  return Object.assign(new Error('Ссылка для восстановления недействительна или уже использована.'), { statusCode: 400 });
}

function digest(passwordHash) {
  return createHash('sha256').update(passwordHash).digest('base64url');
}

export function createSiteUserPasswordResetToken(user) {
  const body = Buffer.from(JSON.stringify({ id: user.id, proof: digest(user.passwordHash), exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(`password-reset:${body}`).digest('base64url');
  return `${body}.${signature}`;
}

export async function requestSiteUserPasswordReset(db, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || normalized.length > 254) return null;
  const result = await db.query('select id, email, "passwordHash" from "SiteUser" where email = $1 and "isActive" = true limit 1', [normalized]);
  const user = result.rows[0] || null;
  // An invited supplier must accept the invitation before setting a password.
  return user?.passwordHash === 'invite:pending' ? null : user;
}

export async function resetSiteUserPassword(db, token, password) {
  if (typeof token !== 'string' || token.length > 4096) throw invalid();
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
    throw Object.assign(new Error('Пароль должен содержать от 10 до 200 символов.'), { statusCode: 422 });
  }
  const parts = token.split('.');
  if (parts.length !== 2) throw invalid();
  const [body, signature] = parts;
  const expected = createHmac('sha256', secret()).update(`password-reset:${body}`).digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw invalid();
  let claims;
  try { claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { throw invalid(); }
  if (typeof claims?.id !== 'string' || typeof claims?.proof !== 'string' || !Number.isSafeInteger(claims?.exp) || claims.exp < Math.floor(Date.now() / 1000)) throw invalid();

  const current = await db.query('select "passwordHash" from "SiteUser" where id = $1 and "isActive" = true limit 1', [claims.id]);
  const oldHash = current.rows[0]?.passwordHash;
  if (!oldHash || digest(oldHash) !== claims.proof) throw invalid();
  const newHash = await hashPassword(password);
  const updated = await db.query(
    'update "SiteUser" set "passwordHash" = $2, "refreshTokenHash" = null, "emailVerifiedAt" = coalesce("emailVerifiedAt", now()), "updatedAt" = now() where id = $1 and "passwordHash" = $3 and "isActive" = true returning id',
    [claims.id, newHash, oldHash],
  );
  if (!updated.rows[0]) throw invalid();
  return { reset: true };
}
