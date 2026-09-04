import { randomBytes } from 'node:crypto';

import { prisma } from '@/lib/db';
import {
  buildDayRouteShortPath,
  isValidDayRouteShareCode,
  normalizeDayRouteShareTitle,
  parseDayRouteReadableSlug,
  slugifyDayRouteShareTitle,
  DAY_ROUTE_SHARE_CODE_ALPHABET,
} from '@/lib/day-route-share-url';
import {
  catalogLocatorsFromItemTokens,
  dayRouteShareNoteBody,
  dayRouteShareTextTitle,
  parseDayRouteItemsParam,
} from '@/lib/day-route';

export {
  buildDayRouteShortPath,
  isValidDayRouteShareCode,
  parseDayRouteReadableSlug,
  slugifyDayRouteShareTitle,
  normalizeDayRouteShareTitle,
} from '@/lib/day-route-share-url';

const CODE_LENGTH = 7;
const MAX_ITEMS_LEN = 2800;
const MAX_CITY_LEN = 64;
const MAX_FROM_LEN = 40;
const MAX_AUTHOR_LEN = 60;
const MAX_CREATE_ATTEMPTS = 6;

export const DAY_ROUTE_SHARE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type DayRouteShareStatus =
  (typeof DAY_ROUTE_SHARE_STATUS)[keyof typeof DAY_ROUTE_SHARE_STATUS];

export type DayRouteSharePayload = {
  citySlug: string | null;
  items: string;
  fromName: string | null;
  title: string | null;
  titleSlug: string | null;
  authorName: string | null;
  status: DayRouteShareStatus;
};

export function normalizeDayRouteSharePayload(input: {
  city?: string | null;
  citySlug?: string | null;
  items?: string | null;
  from?: string | null;
  fromName?: string | null;
  title?: string | null;
  authorName?: string | null;
  author?: string | null;
  status?: string | null;
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

  const title = normalizeDayRouteShareTitle(input.title);
  const titleSlug = slugifyDayRouteShareTitle(title);

  const authorRaw = String(input.authorName || input.author || '')
    .trim()
    .slice(0, MAX_AUTHOR_LEN);
  const authorName = authorRaw || null;

  const statusRaw = String(input.status || DAY_ROUTE_SHARE_STATUS.PUBLISHED)
    .trim()
    .toUpperCase();
  const status: DayRouteShareStatus =
    statusRaw === DAY_ROUTE_SHARE_STATUS.DRAFT
      ? DAY_ROUTE_SHARE_STATUS.DRAFT
      : DAY_ROUTE_SHARE_STATUS.PUBLISHED;

  return { citySlug, items, fromName, title, titleSlug, authorName, status };
}

export function buildDayRouteLongPath(payload: Pick<DayRouteSharePayload, 'citySlug' | 'items' | 'fromName'>): string {
  const params = new URLSearchParams();
  if (payload.citySlug) params.set('city', payload.citySlug);
  params.set('items', payload.items);
  if (payload.fromName) params.set('from', payload.fromName);
  return `/my-day?${params.toString()}`;
}

function generateShareCode(length = CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += DAY_ROUTE_SHARE_CODE_ALPHABET[bytes[i]! % DAY_ROUTE_SHARE_CODE_ALPHABET.length];
  }
  return out;
}

function shortPathForRow(row: {
  code: string;
  citySlug?: string | null;
  titleSlug?: string | null;
}): string {
  return buildDayRouteShortPath(row.code, {
    citySlug: row.citySlug,
    titleSlug: row.titleSlug,
  });
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
    select: { code: true, citySlug: true, titleSlug: true },
  });
  if (existing?.code) {
    return {
      code: existing.code,
      path: shortPathForRow({
        code: existing.code,
        citySlug: existing.citySlug ?? payload.citySlug,
        titleSlug: existing.titleSlug || payload.titleSlug,
      }),
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
          title: payload.title,
          titleSlug: payload.titleSlug,
          authorName: payload.authorName,
          status: payload.status,
        },
      });
      return {
        code,
        path: shortPathForRow({
          code,
          citySlug: payload.citySlug,
          titleSlug: payload.titleSlug,
        }),
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

export type DayRouteSharePublicStop = {
  index: number;
  title: string;
  isText: boolean;
  isNote: boolean;
  timeLabel: string | null;
};

export type DayRouteSharePublicView = {
  code: string;
  citySlug: string | null;
  items: string;
  fromName: string | null;
  title: string | null;
  titleSlug: string | null;
  authorName: string | null;
  status: string;
  hitCount: number;
  saveCount: number;
  ratingSum: number;
  ratingCount: number;
  averageRating: number | null;
  longPath: string;
  shortPath: string;
  stops: DayRouteSharePublicStop[];
};

function formatShareTimeLabel(time: string): string | null {
  if (!time || time === 'free') return null;
  if (/^\d{4}$/.test(time)) return `${time.slice(0, 2)}:${time.slice(2)}`;
  return null;
}

/** Cheap title resolve for catalog locators (id or slug). */
async function resolveCatalogTitles(locators: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const keys = [...new Set(locators.map((k) => String(k || '').trim()).filter(Boolean))].slice(0, 12);
  if (!keys.length) return map;

  try {
    const [venues, events] = await Promise.all([
      prisma.venue.findMany({
        where: { OR: [{ id: { in: keys } }, { slug: { in: keys } }] },
        select: { id: true, slug: true, title: true },
        take: 24,
      }),
      prisma.event.findMany({
        where: { OR: [{ id: { in: keys } }, { slug: { in: keys } }] },
        select: { id: true, slug: true, title: true },
        take: 24,
      }),
    ]);
    for (const row of venues) {
      if (row.title) {
        map.set(row.id, row.title);
        if (row.slug) map.set(row.slug, row.title);
      }
    }
    for (const row of events) {
      if (row.title) {
        map.set(row.id, row.title);
        if (row.slug) map.set(row.slug, row.title);
      }
    }
  } catch {
    // Best-effort; fall back to «Точка N».
  }
  return map;
}

export async function buildShareStopSummaries(items: string): Promise<DayRouteSharePublicStop[]> {
  const tokens = parseDayRouteItemsParam(items);
  const catalogKeys = catalogLocatorsFromItemTokens(tokens);
  const titles = await resolveCatalogTitles(catalogKeys);

  return tokens.map((token, index) => {
    let title = '';
    if (token.isNote) {
      title = dayRouteShareNoteBody(token.id) || 'Заметка';
    } else if (token.isText) {
      title = dayRouteShareTextTitle(token.id) || 'Своя точка';
    } else {
      title = titles.get(token.id) || `Точка ${index + 1}`;
    }
    return {
      index: index + 1,
      title,
      isText: token.isText,
      isNote: token.isNote,
      timeLabel: formatShareTimeLabel(token.time),
    };
  });
}

function mapShareRow(row: {
  code: string;
  citySlug: string | null;
  items: string;
  fromName: string | null;
  title?: string | null;
  titleSlug?: string | null;
  authorName?: string | null;
  status?: string | null;
  hitCount: number;
  saveCount?: number | null;
  ratingSum?: number | null;
  ratingCount?: number | null;
}, stops: DayRouteSharePublicStop[]): DayRouteSharePublicView {
  const ratingCount = row.ratingCount ?? 0;
  const ratingSum = row.ratingSum ?? 0;
  const averageRating =
    ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;
  const titleSlug = row.titleSlug ?? null;
  return {
    code: row.code,
    citySlug: row.citySlug,
    items: row.items,
    fromName: row.fromName,
    title: row.title ?? null,
    titleSlug,
    authorName: row.authorName ?? null,
    status: row.status || DAY_ROUTE_SHARE_STATUS.PUBLISHED,
    hitCount: row.hitCount,
    saveCount: row.saveCount ?? 0,
    ratingSum,
    ratingCount,
    averageRating,
    longPath: buildDayRouteLongPath({
      citySlug: row.citySlug,
      items: row.items,
      fromName: row.fromName,
    }),
    shortPath: shortPathForRow({
      code: row.code,
      citySlug: row.citySlug,
      titleSlug,
    }),
    stops,
  };
}

const SHARE_PUBLIC_SELECT = {
  code: true,
  citySlug: true,
  items: true,
  fromName: true,
  title: true,
  titleSlug: true,
  authorName: true,
  status: true,
  hitCount: true,
  saveCount: true,
  ratingSum: true,
  ratingCount: true,
} as const;

/** Load share for public `/m` page; bumps hitCount best-effort. */
export async function getDayRouteSharePublic(
  code: string,
  options?: { bumpHit?: boolean },
): Promise<DayRouteSharePublicView | null> {
  const normalized = String(code || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(normalized)) return null;

  const row = await prisma.dayRouteShare.findUnique({
    where: { code: normalized },
    select: SHARE_PUBLIC_SELECT,
  });
  if (!row?.items) return null;

  if (options?.bumpHit !== false) {
    void prisma.dayRouteShare
      .update({
        where: { code: normalized },
        data: { hitCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  const stops = await buildShareStopSummaries(row.items);
  return mapShareRow(row, stops);
}

/** Resolve short code → long /my-day path; bumps hitCount best-effort. */
export async function resolveDayRouteShare(code: string): Promise<string | null> {
  const view = await getDayRouteSharePublic(code, { bumpHit: true });
  return view?.longPath ?? null;
}

export async function incrementDayRouteShareSave(code: string): Promise<number | null> {
  const normalized = String(code || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(normalized)) return null;
  try {
    const row = await prisma.dayRouteShare.update({
      where: { code: normalized },
      data: { saveCount: { increment: 1 } },
      select: { saveCount: true },
    });
    return row.saveCount;
  } catch {
    return null;
  }
}

/** Clamp 1-5 and bump ratingSum/ratingCount (no auth MVP). */
export async function rateDayRouteShare(
  code: string,
  rating: number,
): Promise<{ ratingSum: number; ratingCount: number; averageRating: number } | null> {
  const normalized = String(code || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(normalized)) return null;
  const value = Math.round(Number(rating));
  if (!Number.isFinite(value) || value < 1 || value > 5) return null;

  try {
    const row = await prisma.dayRouteShare.update({
      where: { code: normalized },
      data: {
        ratingSum: { increment: value },
        ratingCount: { increment: 1 },
      },
      select: { ratingSum: true, ratingCount: true },
    });
    const averageRating =
      row.ratingCount > 0
        ? Math.round((row.ratingSum / row.ratingCount) * 10) / 10
        : value;
    return {
      ratingSum: row.ratingSum,
      ratingCount: row.ratingCount,
      averageRating,
    };
  } catch {
    return null;
  }
}
