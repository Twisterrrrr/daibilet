import { transliterateSlug } from './routes';

/** URL-safe alphabet without ambiguous 0/O/1/l (must match server generate). */
export const DAY_ROUTE_SHARE_CODE_ALPHABET = '23456789abcdefghijkmnopqrstuvwxyz';
export const DAY_ROUTE_SHARE_CODE_RE = /^[23456789abcdefghijkmnopqrstuvwxyz]{6,12}$/;

const MAX_TITLE_LEN = 80;
const MAX_TITLE_SLUG_LEN = 48;

export function isValidDayRouteShareCode(code: string): boolean {
  return DAY_ROUTE_SHARE_CODE_RE.test(String(code || '').trim().toLowerCase());
}

/** Cyrillic/latin title → kebab slug for `/m/{city}-{titleSlug}-{code}`. */
export function slugifyDayRouteShareTitle(title: string | null | undefined): string | null {
  const slug = transliterateSlug(String(title || '').trim().slice(0, MAX_TITLE_LEN)).slice(
    0,
    MAX_TITLE_SLUG_LEN,
  );
  return slug || null;
}

export function normalizeDayRouteShareTitle(title: string | null | undefined): string | null {
  const raw = String(title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_TITLE_LEN);
  return raw || null;
}

export type DayRouteShortPathOptions = {
  citySlug?: string | null;
  titleSlug?: string | null;
};

/**
 * Prefer readable `/m/{city}-{titleSlug}-{code}`; fall back to `/m/{city}-{code}` or `/d/{code}`.
 * Opaque code always trails the slug so parsers can take it from the end.
 */
export function buildDayRouteShortPath(
  code: string,
  citySlugOrOptions?: string | null | DayRouteShortPathOptions,
  titleSlugArg?: string | null,
): string {
  const normalizedCode = String(code || '')
    .trim()
    .toLowerCase();
  if (!normalizedCode) return '/my-day';

  let citySlug: string | null = null;
  let titleSlug: string | null = null;
  if (citySlugOrOptions && typeof citySlugOrOptions === 'object') {
    citySlug = citySlugOrOptions.citySlug ?? null;
    titleSlug = citySlugOrOptions.titleSlug ?? null;
  } else {
    citySlug = citySlugOrOptions ?? null;
    titleSlug = titleSlugArg ?? null;
  }

  const city = String(citySlug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const title = String(titleSlug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (city && title) {
    return `/m/${encodeURIComponent(`${city}-${title}-${normalizedCode}`)}`;
  }
  if (city) {
    return `/m/${encodeURIComponent(`${city}-${normalizedCode}`)}`;
  }
  return `/d/${encodeURIComponent(normalizedCode)}`;
}

export type ParsedDayRouteReadableSlug = {
  code: string;
  /** Full prefix before trailing code (city and optional titleSlug). */
  prefix: string | null;
  citySlug: string | null;
  titleSlug: string | null;
};

/**
 * Parse `/m/{…}-{code}` / bare code. Code is always taken from the END of the slug
 * so title segments in the middle stay cosmetic.
 */
export function parseDayRouteReadableSlug(raw: string): ParsedDayRouteReadableSlug | null {
  const slug = String(raw || '')
    .trim()
    .toLowerCase();
  if (!slug) return null;

  if (isValidDayRouteShareCode(slug)) {
    return { code: slug, prefix: null, citySlug: null, titleSlug: null };
  }

  const match = slug.match(
    /^(.+)-([23456789abcdefghijkmnopqrstuvwxyz]{6,12})$/,
  );
  if (!match?.[1] || !match[2]) return null;

  const prefix = match[1].replace(/^-+|-+$/g, '') || null;
  const code = match[2];
  if (!prefix) {
    return { code, prefix: null, citySlug: null, titleSlug: null };
  }

  // Best-effort split: first segment = city (works for spb/moscow/kazan);
  // multi-hyphen cities keep full prefix as citySlug when no further segments.
  const parts = prefix.split('-').filter(Boolean);
  if (parts.length <= 1) {
    return { code, prefix, citySlug: prefix, titleSlug: null };
  }
  const citySlug = parts[0] || null;
  const titleSlug = parts.slice(1).join('-') || null;
  return { code, prefix, citySlug, titleSlug };
}

/** Sensible share title: city + first stop, or fallback. */
export function suggestDayRouteShareTitle(input: {
  cityTitle?: string | null;
  firstStopTitle?: string | null;
}): string {
  const city = String(input.cityTitle || '').trim();
  const first = String(input.firstStopTitle || '').trim();
  if (city && first) return `${city}: ${first}`.slice(0, MAX_TITLE_LEN);
  if (first) return first.slice(0, MAX_TITLE_LEN);
  if (city) return `Маршрут на день - ${city}`.slice(0, MAX_TITLE_LEN);
  return 'Маршрут на день';
}
