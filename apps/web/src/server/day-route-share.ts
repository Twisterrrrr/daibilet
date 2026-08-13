import { randomBytes } from 'node:crypto';

import { prisma } from '@/lib/db';

/** URL-safe alphabet without ambiguous 0/O/1/l. */
const CODE_ALPHABET = '23456789abcdefghijkmnopqrstuvwxyz';
const CODE_LENGTH = 7;
const MAX_ITEMS_LEN = 1200;
const MAX_CITY_LEN = 64;
const MAX_FROM_LEN = 40;
const MAX_CREATE_ATTEMPTS = 6;

export type DayRouteSharePayload = {
  citySlug: string | null;
  items: string;
  fromName: string | null;
};

export function normalizeDayRouteSharePayload(input: {
  city?: string | null;
  citySlug?: string | null;
  items?: string | null;
  from?: string | null;
  fromName?: string | null;
}): DayRouteSharePayload | null {
  const items = String(input.items || '')
    .trim()
    .slice(0, MAX_ITEMS_LEN);
  if (!items) return null;

  const cityRaw = String(input.citySlug || input.city || '')
    .trim()
    .toLowerCase()
    .slice(0, MAX_CITY_LEN);
  const citySlug = cityRaw.replace(/[^a-z0-9а-яё_-]/gi, '') || null;

  const fromRaw = String(input.fromName || input.from || '')
    .trim()
    .slice(0, MAX_FROM_LEN);
  const fromName = fromRaw || null;

  return { citySlug, items, fromName };
}

export function buildDayRouteLongPath(payload: DayRouteSharePayload): string {
  const params = new URLSearchParams();
  if (payload.citySlug) params.set('city', payload.citySlug);
  params.set('items', payload.items);
  if (payload.fromName) params.set('from', payload.fromName);
  return `/my-day?${params.toString()}`;
}

export function buildDayRouteShortPath(code: string, citySlug?: string | null): string {
  const normalizedCode = String(code || '')
    .trim()
    .toLowerCase();
  if (!normalizedCode) return '/my-day';
  const city = String(citySlug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (city) return `/m/${encodeURIComponent(`${city}-${normalizedCode}`)}`;
  return `/d/${encodeURIComponent(normalizedCode)}`;
}

export function isValidDayRouteShareCode(code: string): boolean {
  return /^[23456789abcdefghijkmnopqrstuvwxyz]{6,12}$/.test(code);
}

/** Parse `/m/{city}-{code}` or bare code from human-readable short share. */
export function parseDayRouteReadableSlug(raw: string): { code: string; citySlug: string | null } | null {
  const slug = String(raw || '')
    .trim()
    .toLowerCase();
  if (!slug) return null;
  if (isValidDayRouteShareCode(slug)) {
    return { code: slug, citySlug: null };
  }
  const match = slug.match(/^([a-z0-9-]+)-([23456789abcdefghijkmnopqrstuvwxyz]{6,12})$/);
  if (!match) return null;
  return { citySlug: match[1] || null, code: match[2]! };
}

function generateShareCode(length = CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/** Create or reuse a short code for the same city+items(+from) payload. */
export async function createDayRouteShare(
  input: DayRouteSharePayload,
): Promise<{ code: string; path: string; longPath: string; reused: boolean }> {
  const payload = normalizeDayRouteSharePayload(input);
  if (!payload) {
    throw new Error('invalid_payload');
  }

  const existing = await prisma.dayRouteShare.findFirst({
    where: {
      citySlug: payload.citySlug,
      items: payload.items,
      fromName: payload.fromName,
    },
    orderBy: { createdAt: 'asc' },
    select: { code: true },
  });
  if (existing?.code) {
    return {
      code: existing.code,
      path: buildDayRouteShortPath(existing.code, payload.citySlug),
      longPath: buildDayRouteLongPath(payload),
      reused: true,
    };
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const code = generateShareCode();
    try {
      await prisma.dayRouteShare.create({
        data: {
          code,
          citySlug: payload.citySlug,
          items: payload.items,
          fromName: payload.fromName,
        },
      });
      return {
        code,
        path: buildDayRouteShortPath(code, payload.citySlug),
        longPath: buildDayRouteLongPath(payload),
        reused: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/unique|UniqueConstraint|P2002/i.test(message)) throw error;
    }
  }

  throw new Error('code_collision');
}

/** Resolve short code → long /my-day path; bumps hitCount best-effort. */
export async function resolveDayRouteShare(code: string): Promise<string | null> {
  const normalized = String(code || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(normalized)) return null;

  const row = await prisma.dayRouteShare.findUnique({
    where: { code: normalized },
    select: { citySlug: true, items: true, fromName: true },
  });
  if (!row?.items) return null;

  void prisma.dayRouteShare
    .update({
      where: { code: normalized },
      data: { hitCount: { increment: 1 } },
    })
    .catch(() => undefined);

  return buildDayRouteLongPath({
    citySlug: row.citySlug,
    items: row.items,
    fromName: row.fromName,
  });
}
