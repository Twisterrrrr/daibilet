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

  // Batch 2026-08-09: published from CANDIDATE (official sites; holiday caveat on ticket UI)
  'gmii-im-pushkina-672f34b6ebf4808956f1474a': [
    'Вт, Ср, Сб, Вс: 11:00-20:00',
    'Чт, Пт: 11:00-21:00',
    'Пн - выходной',
  ],
  'государственныи-музеи-а-с-пушкина-5bf694763dc0e5000bc16feb': [
    'Вт, Ср, Пт, Сб, Вс: 10:00-18:00',
    'Чт: 13:00-21:00',
    'Пн - выходной',
  ],
  'дом-музеи-гоголя-5693cd139cb53836a4dbec2c': [
    'Вт, Ср, Пт: 12:00-19:00',
    'Чт: 14:00-21:00',
    'Сб, Вс: 12:00-18:00',
    'Пн - выходной',
  ],
  'государственныи-геологическии-музеи-им-вернадского-58d0097cd352860017f35db4': [
    'Вт-Пт: 11:00-19:00',
    'Сб, Вс: 12:00-19:00',
    'Пн - выходной',
  ],
  'memorialnyi-muzei-a-n-skryabina-bolshoi-zal-633e7d3b1156365c15b6da1a': [
    'Ср, Пт, Сб, Вс: 12:00-20:00',
    'Чт: 13:00-21:00',
    'Пн, Вт - выходной',
  ],
  'музеи-им-н-островского-5d61087e6be9adfb0dd8425b': [
    'Вт-Вс: 09:00-20:00',
    'Пн - выходной',
  ],
  'galereya-ili-glazunova-6225a53df0a5daf0e7ce8b21': [
    'Вт, Ср, Пт, Сб, Вс: 11:00-19:00',
    'Чт: 11:00-21:00',
    'Пн - выходной',
  ],
  'muzei-sovremennogo-iskusstva-permm-5e4423fcaadb42a1889abee3': [
    'Вт-Вс: 12:00-21:00',
    'Пн - выходной',
  ],
  'muzei-usadba-g-r-derzhavina-5a04a866515e3500198b0d76': [
    'Пн, Ср, Пт, Сб, Вс: 10:30-18:00',
    'Чт: 12:00-20:00',
    'Вт - выходной',
  ],
  'muzeinyi-kompleks-verhnyaya-pyshma-69ce61cbda2cf85a00abb80d': [
    'Вт-Вс: 10:00-19:00',
    'Пн - выходной',
  ],
  'muzeinyi-centr-ploschad-mira-5b59418f515e35001ebf3c42': [
    'Вт, Ср, Пт, Сб, Вс: 11:00-19:00',
    'Чт: 13:00-21:00',
    'Пн - выходной',
  ],
  'покровскии-собор-638f165cb2496ab2eb6eb37a': [
    'Пн-Ср, Вс: 10:00-18:00',
    'Чт-Сб: 10:00-19:00',
    '1-я среда месяца - выходной',
  ],
  'petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639': [
    'Только по экскурсии (запись заранее)',
    'Пн и последняя пятница месяца - выходной',
  ],
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
