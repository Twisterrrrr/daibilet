import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const ACCESS_TTL_SEC = Number(process.env.USER_JWT_ACCESS_TTL_SEC || 15 * 60);
const REFRESH_TTL_SEC = Number(process.env.USER_JWT_REFRESH_TTL_SEC || 30 * 24 * 60 * 60);
const JWT_SECRET = process.env.USER_JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-user-jwt-secret-change-me');

const authRateLimits = new Map();

function authError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashToken(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(String(value), 'base64url');
}

function signJwt(payload, expiresInSec) {
  const secret = requireJwtSecret();
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token) {
  const secret = requireJwtSecret();
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body).toString('utf8'));
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.type !== 'user') return null;
    return payload;
  } catch {
    return null;
  }
}

function requireJwtSecret() {
  if (!JWT_SECRET) throw authError('USER_JWT_SECRET is not configured.', 503);
  return JWT_SECRET;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [algo, salt, hash] = String(storedHash || '').split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const derived = await scryptAsync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

function issueTokens(user) {
  const base = { sub: user.id, email: user.email, type: 'user' };
  const accessToken = signJwt({ ...base, tokenType: 'access' }, ACCESS_TTL_SEC);
  const refreshToken = signJwt({ ...base, tokenType: 'refresh' }, REFRESH_TTL_SEC);
  return { accessToken, refreshToken };
}

async function persistRefreshToken(db, userId, refreshToken) {
  await db.query('update "SiteUser" set "refreshTokenHash" = $2, "updatedAt" = now() where id = $1', [
    userId,
    hashToken(refreshToken),
  ]);
}

export function parseBearerToken(request) {
  const header = String(request.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export function parseCookies(request) {
  const cookies = {};
  for (const part of String(request.headers.cookie || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function buildRefreshCookie(refreshToken) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `user_refresh_token=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/; Max-Age=${REFRESH_TTL_SEC}; SameSite=Lax${secure}`;
}

export function buildClearRefreshCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `user_refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function authenticateAccessToken(token) {
  const payload = verifyJwt(token);
  if (!payload || payload.tokenType !== 'access') return null;
  return payload;
}

export function assertAuthRateLimit(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = authRateLimits.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  authRateLimits.set(key, bucket);
  if (bucket.count > limit) throw authError('Слишком много попыток. Попробуйте позже.', 429);
}

export async function registerSiteUser(db, body) {
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');
  const name = String(body?.name || '').trim() || null;

  if (!email.includes('@')) throw authError('Укажите корректный email.');
  if (password.length < 6) throw authError('Пароль должен быть не короче 6 символов.');

  const existing = await db.query('select id from "SiteUser" where email = $1 limit 1', [email]);
  if (existing.rows[0]) throw authError('Email уже зарегистрирован.', 409);

  const passwordHash = await hashPassword(password);
  const id = `usr_${randomBytes(12).toString('hex')}`;
  const created = await db.query(
    `
      insert into "SiteUser" (id, email, "passwordHash", name, "isActive", "createdAt", "updatedAt")
      values ($1, $2, $3, $4, true, now(), now())
      returning id, email, name
    `,
    [id, email, passwordHash, name],
  );

  const user = created.rows[0];
  const tokens = issueTokens(user);
  await persistRefreshToken(db, user.id, tokens.refreshToken);
  return tokens;
}

export async function loginSiteUser(db, emailInput, password) {
  const email = normalizeEmail(emailInput);
  const result = await db.query(
    'select id, email, name, "passwordHash", "isActive" from "SiteUser" where email = $1 limit 1',
    [email],
  );
  const user = result.rows[0];
  if (!user || !user.isActive) throw authError('Неверный email или пароль.', 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw authError('Неверный email или пароль.', 401);

  const tokens = issueTokens(user);
  await persistRefreshToken(db, user.id, tokens.refreshToken);
  return tokens;
}

export async function changeSiteUserPassword(db, userIdInput, currentPassword, newPassword) {
  const userId = String(userIdInput || '').trim();
  if (!userId) throw authError('Требуется авторизация.', 401);
  if (typeof newPassword !== 'string' || newPassword.length < 10 || newPassword.length > 200) {
    throw authError('Новый пароль должен содержать от 10 до 200 символов.', 422);
  }
  if (newPassword === currentPassword) throw authError('Новый пароль должен отличаться от текущего.', 422);

  const result = await db.query(
    'select id, "passwordHash", "isActive" from "SiteUser" where id = $1 limit 1',
    [userId],
  );
  const user = result.rows[0];
  if (!user || !user.isActive || !await verifyPassword(currentPassword, user.passwordHash)) {
    throw authError('Текущий пароль указан неверно.', 401);
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await db.query(
    'update "SiteUser" set "passwordHash" = $2, "refreshTokenHash" = null, "updatedAt" = now() where id = $1 and "passwordHash" = $3 and "isActive" = true returning id',
    [userId, passwordHash, user.passwordHash],
  );
  if (!updated.rows[0]) throw authError('Пароль изменился параллельно. Войдите снова и повторите попытку.', 409);
  return { changed: true };
}

export async function refreshSiteUserSession(db, refreshToken) {
  const payload = verifyJwt(refreshToken);
  if (!payload || payload.tokenType !== 'refresh') throw authError('Невалидный refresh token.', 401);

  const result = await db.query(
    'select id, email, name, "refreshTokenHash", "isActive" from "SiteUser" where id = $1 limit 1',
    [payload.sub],
  );
  const user = result.rows[0];
  if (!user || !user.isActive) throw authError('Аккаунт недоступен.', 401);

  const tokenHash = hashToken(refreshToken);
  if (!user.refreshTokenHash || user.refreshTokenHash !== tokenHash) {
    throw authError('Refresh token инвалидирован.', 401);
  }

  const tokens = issueTokens(user);
  await persistRefreshToken(db, user.id, tokens.refreshToken);
  return tokens;
}

export async function logoutSiteUser(db, userId) {
  await db.query('update "SiteUser" set "refreshTokenHash" = null, "updatedAt" = now() where id = $1', [userId]);
  return { ok: true };
}

export async function getSiteUserProfile(db, userId) {
  const result = await db.query(
    'select id, email, name, "emailVerifiedAt", "createdAt" from "SiteUser" where id = $1 and "isActive" = true limit 1',
    [userId],
  );
  const user = result.rows[0];
  if (!user) throw authError('Пользователь не найден.', 404);
  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt || null,
    name: user.name || '',
    createdAt: user.createdAt,
  };
}

export async function requireSiteUserFromRequest(db, request) {
  const token = parseBearerToken(request);
  if (!token) throw authError('Требуется авторизация.', 401);

  const payload = authenticateAccessToken(token);
  if (!payload?.sub) throw authError('Невалидный access token.', 401);

  const profile = await getSiteUserProfile(db, payload.sub);
  return profile;
}

const EMAIL_VERIFY_TTL_SEC = 24 * 60 * 60;

export function createSiteUserEmailVerificationToken(userId) {
  const id = String(userId || '').trim();
  if (!id) throw authError('Пользователь не найден.', 404);
  const payload = base64UrlEncode(JSON.stringify({ id, exp: Math.floor(Date.now() / 1000) + EMAIL_VERIFY_TTL_SEC }));
  const signature = createHmac('sha256', requireJwtSecret()).update(`email-verify:${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

export async function verifySiteUserEmail(db, token) {
  if (typeof token !== 'string' || token.length > 4096) throw authError('Ссылка подтверждения недействительна.', 400);
  const parts = String(token || '').split('.');
  if (parts.length !== 2) throw authError('Ссылка подтверждения недействительна.', 400);
  const [payload, signature] = parts;
  const expected = createHmac('sha256', requireJwtSecret()).update(`email-verify:${payload}`).digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw authError('Ссылка подтверждения недействительна.', 400);
  }
  let claims;
  try {
    claims = JSON.parse(base64UrlDecode(payload).toString('utf8'));
  } catch {
    throw authError('Ссылка подтверждения недействительна.', 400);
  }
  if (typeof claims.id !== 'string' || !claims.id || !Number.isSafeInteger(claims.exp) || claims.exp < Math.floor(Date.now() / 1000)) {
    throw authError('Срок действия ссылки истёк.', 400);
  }
  const result = await db.query(
    'update "SiteUser" set "emailVerifiedAt" = now(), "updatedAt" = now() where id = $1 and "isActive" = true and "emailVerifiedAt" is null returning id',
    [claims.id],
  );
  if (!result.rows[0]) throw authError('Ссылка уже использована или аккаунт недоступен.', 400);
  return { verified: true };
}
