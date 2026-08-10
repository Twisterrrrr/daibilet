/**
 * Per-venue editorial content overlay (highlights / FAQ / feature chips).
 *
 * Catalog Venue has no highlights/faq/features columns yet. Until CMS ships them,
 * keep a curated slug map so institution PDP can show SPBBOATS-class content
 * without a prod DB write. Other venues stay on generic FAQ / no chips.
 *
 * Source for ermitazh: docs/research/venue-seeds-hermitage-garage/ermitazh.venue-seed.json
 * (hyphen-only copy; hours live in venue-opening-hours.ts).
 */

export type VenueEditorialFaqItem = {
  question: string;
  answer: string;
};

export type VenueFeatureCode =
  | 'no_queue'
  | 'audio_guide'
  | 'kids_friendly'
  | 'wheelchair'
  | 'cafe'
  | 'gift_shop';

export type VenueEditorialContent = {
  highlights: string[];
  features: VenueFeatureCode[];
  faq: VenueEditorialFaqItem[];
  /** Hero/logistics fallback when Venue.metroStation is empty in DB. */
  metroStation?: string;
};

const FEATURE_LABELS: Record<VenueFeatureCode, string> = {
  no_queue: 'Без очереди',
  audio_guide: 'Аудиогид',
  kids_friendly: 'С детьми',
  wheelchair: 'Доступность',
  cafe: 'Кафе',
  gift_shop: 'Магазин',
};

const EDITORIAL_BY_SLUG: Record<string, VenueEditorialContent> = {
  ermitazh: {
    highlights: [
      '3 миллиона экспонатов',
      'Зимний дворец - объект ЮНЕСКО',
      'Импрессионисты, Рембрандт, Леонардо да Винчи',
      'Рыцарский зал, Египетский зал, Малахитовая гостиная',
      'Входит в топ-5 музеев мира',
    ],
    features: ['no_queue', 'audio_guide', 'kids_friendly', 'wheelchair', 'cafe', 'gift_shop'],
    metroStation: 'Адмиралтейская',
    faq: [
      {
        question: 'Можно ли вернуть билет?',
        answer: 'Да, возврат возможен не позднее чем за 2 часа до визита.',
      },
      {
        question: 'Есть ли льготные билеты?',
        answer:
          'Бесплатно для детей до 14 лет и студентов РФ. Первый четверг месяца - бесплатный вход (условия уточняйте на сайте музея).',
      },
      {
        question: 'Можно ли без очереди?',
        answer: 'Да, при покупке электронного билета проход через отдельный вход без очереди.',
      },
      {
        question: 'Сколько времени нужно на осмотр?',
        answer: 'Минимум 2-3 часа для основных залов, полный обход - 4-5 часов.',
      },
      {
        question: 'Актуальны ли часы работы?',
        answer:
          'На странице показываем редакционный график главного комплекса. В праздники и при сеансовой системе сверяйте с hermitagemuseum.org.',
      },
    ],
  },
};

function normalizeVenueSlug(slug: string | null | undefined): string {
  return String(slug || '')
    .trim()
    .toLowerCase();
}

/** Resolve per-venue editorial content (null if none curated). */
export function resolveVenueEditorialContent(
  venueSlug: string | null | undefined,
): VenueEditorialContent | null {
  const key = normalizeVenueSlug(venueSlug);
  if (!key) return null;
  return EDITORIAL_BY_SLUG[key] ?? null;
}

/** Human labels for feature codes (unknown codes skipped). */
export function venueFeatureLabels(codes: readonly string[] | null | undefined): string[] {
  if (!codes?.length) return [];
  const out: string[] = [];
  for (const code of codes) {
    const label = FEATURE_LABELS[code as VenueFeatureCode];
    if (label) out.push(label);
  }
  return out;
}

/** Hero metro line: «м. Адмиралтейская». Empty input → null. */
export function formatVenueMetroLabel(metro: string | null | undefined): string | null {
  const text = String(metro ?? '').trim();
  if (!text || text === '-' || text === '—' || text === '–') return null;
  if (/^м[\.\s]/i.test(text)) return text;
  return `м. ${text}`;
}

/** @internal test helper */
export function __editorialVenueContentSlugCountForTests(): number {
  return Object.keys(EDITORIAL_BY_SLUG).length;
}
