/**
 * Per-venue editorial content overlay (highlights / FAQ / feature chips / contacts).
 *
 * Catalog Venue has no highlights/faq/features columns yet. Until CMS ships them,
 * keep a curated slug map so institution PDP can show SPBBOATS-class content
 * without a prod DB write. Other venues stay on generic FAQ / no chips.
 *
 * Source for ermitazh: docs/research/venue-seeds-hermitage-garage/ermitazh.venue-seed.json
 * (hyphen-only copy). Hours live in venue-opening-hours.ts (official hermitagemuseum.org
 * Main Museum Complex: 11:00 starts - SPBBOATS seed 10:30 is superseded).
 */

import type { PublicVenueDto } from '@daibilet/contracts/public';

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

export type VenueFeatureChip = {
  code: VenueFeatureCode;
  label: string;
  icon: string;
};

export type VenueEditorialTickets = {
  /** Display price in rubles (seed priceFrom is kopecks / 100). */
  priceFromRub: number;
  /** Primary purchase URL (official / redirect). */
  href: string;
  /** Short badge under CTA, e.g. «Официальный сайт». */
  badge?: string;
};

export type VenueEditorialContent = {
  /** Overrides H1 / name / seoH1 when DB still has legacy title. */
  displayTitle?: string;
  /** Interesting fact above «О месте» (city-hub style). */
  hookFact?: string;
  /**
   * Extra gallery URLs (real assets only). Combined with hero when ≥2 unique images.
   */
  galleryUrls?: string[];
  highlights: string[];
  features: VenueFeatureCode[];
  faq: VenueEditorialFaqItem[];
  /** Hero/logistics fallback when Venue.metroStation is empty in DB. */
  metroStation?: string;
  phone?: string;
  website?: string;
  websiteLabel?: string;
  /**
   * External official tickets CTA (not internal LC inventory).
   * Kept in overlay for future use; institution PDP hides commercial blocks for now.
   */
  tickets?: VenueEditorialTickets;
};

const FEATURE_CHIPS: Record<VenueFeatureCode, VenueFeatureChip> = {
  no_queue: { code: 'no_queue', label: 'Без очереди', icon: '⚡' },
  audio_guide: { code: 'audio_guide', label: 'Аудиогид', icon: '🎧' },
  kids_friendly: { code: 'kids_friendly', label: 'С детьми', icon: '👶' },
  wheelchair: { code: 'wheelchair', label: 'Доступность', icon: '♿' },
  cafe: { code: 'cafe', label: 'Кафе', icon: '☕' },
  gift_shop: { code: 'gift_shop', label: 'Магазин', icon: '🎁' },
};

const EDITORIAL_BY_SLUG: Record<string, VenueEditorialContent> = {
  ermitazh: {
    displayTitle: 'Государственный Эрмитаж (Зимний дворец)',
    hookFact:
      'Если вы решите задержаться у каждого экспоната музея хотя бы на одну минуту, вам придется провести здесь без сна и еды целых 8 лет.',
    // Real local covers only (main complex + General Staff) - no stock Unsplash fillers.
    galleryUrls: [
      '/images/venues/saint-petersburg/ermitazh.jpg',
      '/images/venues/saint-petersburg/glavnyy-shtab-ermitazh.jpg',
    ],
    highlights: [
      '3 миллиона экспонатов',
      'Зимний дворец - объект ЮНЕСКО',
      'Импрессионисты, Рембрандт, Леонардо да Винчи',
      'Рыцарский зал, Египетский зал, Малахитовая гостиная',
      'Входит в топ-5 музеев мира',
    ],
    features: ['no_queue', 'audio_guide', 'kids_friendly', 'wheelchair', 'cafe', 'gift_shop'],
    metroStation: 'Адмиралтейская',
    phone: '+7 (812) 710-90-79',
    website: 'https://hermitagemuseum.org',
    websiteLabel: 'Официальный сайт',
    tickets: {
      priceFromRub: 500,
      href: 'https://www.hermitagemuseum.org/wps/portal/hermitage/tickets',
      badge: 'Официальный сайт',
    },
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
          'На странице показываем официальный график главного комплекса (hermitagemuseum.org / visitus): вход с 11:00. В праздники и при сеансовой системе сверяйте с сайтом музея.',
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

/**
 * Patch public venue DTO with curated title / metro when DB lags.
 * Used by venue PDP SSR + client so H1 and SEO stay aligned.
 */
export function applyVenueEditorialOverlay<T extends PublicVenueDto>(venue: T): T {
  const editorial = resolveVenueEditorialContent(venue.slug);
  if (!editorial) return venue;
  let next: T = venue;
  if (editorial.displayTitle) {
    next = {
      ...next,
      name: editorial.displayTitle,
      title: editorial.displayTitle,
      seoH1: editorial.displayTitle,
    };
  }
  const metro = String(next.metroStation || '').trim();
  if ((!metro || metro === '-' || metro === '—' || metro === '–') && editorial.metroStation) {
    next = { ...next, metroStation: editorial.metroStation };
  }
  const existingHook = String(next.hookFact || '').trim();
  if (!existingHook && editorial.hookFact) {
    next = { ...next, hookFact: editorial.hookFact };
  }
  return next;
}

/** Human labels for feature codes (unknown codes skipped). */
export function venueFeatureLabels(codes: readonly string[] | null | undefined): string[] {
  return venueFeatureChips(codes).map((chip) => chip.label);
}

/** Icon chips for hero / «О месте» (SPBBOATS-style). */
export function venueFeatureChips(codes: readonly string[] | null | undefined): VenueFeatureChip[] {
  if (!codes?.length) return [];
  const out: VenueFeatureChip[] = [];
  for (const code of codes) {
    const chip = FEATURE_CHIPS[code as VenueFeatureCode];
    if (chip) out.push(chip);
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

/**
 * Gallery for institution PDP: editorial URLs + hero, deduped.
 * Returns [] unless there are at least 2 real images (never invent fillers).
 */
export function resolveVenueGalleryImages(input: {
  slug?: string | null;
  heroImageUrl?: string | null;
}): string[] {
  const editorial = resolveVenueEditorialContent(input.slug);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string | null | undefined) => {
    const url = String(raw || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  for (const url of editorial?.galleryUrls || []) push(url);
  push(input.heroImageUrl);
  return out.length >= 2 ? out : [];
}

/** @internal test helper */
export function __editorialVenueContentSlugCountForTests(): number {
  return Object.keys(EDITORIAL_BY_SLUG).length;
}
