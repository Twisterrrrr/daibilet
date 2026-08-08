/**
 * Editorial opening-hours overlay for open-date (museum/gallery) tickets.
 *
 * Catalog Venue has no openingHours column yet (wayToFind / parkingInfo / hookFact only).
 * Until finance/CMS ships a real field, keep a small slug→hours map for major venues
 * we deliberately seed / link. Do not invent hours for unknown live venues.
 */

export type VenueOpeningHoursSource = 'editorial' | 'order';

export type VenueOpeningHoursInfo = {
  /** One or more readable Russian lines, hyphen only. */
  lines: string[];
  source: VenueOpeningHoursSource;
};

/** Compact multi-line display for ticket card / print. */
export function formatVenueOpeningHoursLines(info: VenueOpeningHoursInfo | null | undefined): string | null {
  if (!info?.lines?.length) return null;
  const cleaned = info.lines.map((line) => String(line || '').trim()).filter(Boolean);
  return cleaned.length ? cleaned.join('\n') : null;
}

/**
 * Known major open-date venues (seed / must-see). Hours are standard published schedules;
 * holiday caveat stays on the ticket UI.
 */
const EDITORIAL_OPENING_HOURS_BY_SLUG: Record<string, string[]> = {
  ermitazh: [
    'Ср, Пт, Вс: 11:00-18:00',
    'Чт, Сб: 11:00-21:00',
    'Вт - выходной',
  ],
  'moscow-tret-yakovskaya-galereya': [
    'Вт, Ср, Вс: 10:00-18:00',
    'Чт, Пт, Сб: 10:00-21:00',
    'Пн - выходной',
  ],
  erarta: ['Ежедневно: 10:00-22:00'],
};

function normalizeVenueSlug(slug: string | null | undefined): string {
  return String(slug || '')
    .trim()
    .toLowerCase();
}

/** Resolve hours for a venue slug from the editorial overlay (null if unknown). */
export function resolveVenueOpeningHours(
  venueSlug: string | null | undefined,
): VenueOpeningHoursInfo | null {
  const key = normalizeVenueSlug(venueSlug);
  if (!key) return null;
  const lines = EDITORIAL_OPENING_HOURS_BY_SLUG[key];
  if (!lines?.length) return null;
  return { lines: [...lines], source: 'editorial' };
}

/** Prefer order-provided hours text; else editorial map by slug. */
export function resolveTicketOpeningHours(input: {
  venueSlug?: string | null;
  venueOpeningHours?: string | null;
}): string | null {
  const fromOrder = String(input.venueOpeningHours || '').trim();
  if (fromOrder) return fromOrder;
  return formatVenueOpeningHoursLines(resolveVenueOpeningHours(input.venueSlug));
}

/** Open-date warning when concrete hours are shown. */
export const OPEN_DATE_HOURS_HOLIDAY_NOTE =
  'В праздники график может отличаться - сверяйте с официальным сайтом площадки.';

/** Open-date warning when hours are unknown. */
export const OPEN_DATE_HOURS_UNKNOWN_NOTE =
  'Уточняйте график работы в планируемый день посещения. Режим и правила посещения - на официальном сайте площадки, особенно в праздники.';

/** Session / dated ticket arrival warning. */
export const SESSION_ARRIVE_EARLY_NOTE =
  'Рекомендуем приходить за 15-20 минут до указанного времени. При опоздании билеты могут быть аннулированы.';
