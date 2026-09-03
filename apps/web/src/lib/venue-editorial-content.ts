/**
 * Per-venue editorial content overlay (highlights / FAQ / feature chips / contacts / SEO).
 *
 * Catalog Venue has no highlights/faq/features columns yet. Until CMS ships them,
 * keep curated packs in venue-editorial-packs.ts so institution PDP can show
 * glossy + commercially honest content without a prod DB write.
 *
 * Workflow: owner sends draft YAML base → agent edits (hyphens, URLs, honesty,
 * venue-specific H2) → lands in VENUE_EDITORIAL_PACKS.
 */

import type { PublicVenueDto } from '@daibilet/contracts/public';

import { VENUE_EDITORIAL_PACKS } from './venue-editorial-packs';

export type VenueEditorialFaqItem = {
  question: string;
  answer: string;
};

export type VenueEditorialSeoSection = {
  h2: string;
  body: string;
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
  /** Hero lead under H1 (also fills shortDescription when DB empty). */
  heroLead?: string;
  /** Meta description overlay. */
  seoDescription?: string;
  /** Hero chips (prefer over auto type/category chips when set). */
  badges?: string[];
  /** Interesting fact above «О месте» (city-hub style). */
  hookFact?: string;
  /** Long «О клубе / О месте» prose under highlights (prefer over DB description). */
  aboutBody?: string;
  /**
   * Extra gallery URLs (real assets only). Combined with hero when ≥2 unique images.
   */
  galleryUrls?: string[];
  highlights: string[];
  features: VenueFeatureCode[];
  faq: VenueEditorialFaqItem[];
  /** Structured SEO body sections (unique H2 per venue type). */
  seoSections?: VenueEditorialSeoSection[];
  /** Hero/logistics fallback when Venue.metroStation is empty in DB. */
  metroStation?: string;
  phone?: string;
  website?: string;
  websiteLabel?: string;
  wayToFind?: string;
  visitTips?: string;
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

const EDITORIAL_BY_SLUG: Record<string, VenueEditorialContent> = VENUE_EDITORIAL_PACKS;

/** Owner/YAML drafts sometimes add city suffix; map to catalog slug. */
const EDITORIAL_SLUG_ALIASES: Record<string, string> = {
  'dzhaz-klub-igorya-butmana-spb': 'dzhaz-klub-igorya-butmana',
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
  const raw = normalizeVenueSlug(venueSlug);
  if (!raw) return null;
  const key = EDITORIAL_SLUG_ALIASES[raw] || raw;
  return EDITORIAL_BY_SLUG[key] ?? null;
}

/** Curated FAQ only - never fall back to generic template on glossy PDP. */
export function resolveVenueCuratedFaqItems(
  venueSlug: string | null | undefined,
): VenueEditorialFaqItem[] {
  const curated = resolveVenueEditorialContent(venueSlug)?.faq;
  return curated?.length ? curated : [];
}

/** Generic FAQ when venue has no curated overlay (shared SSR + client). */
export const VENUE_GENERIC_FAQ: VenueEditorialFaqItem[] = [
  {
    question: 'Есть ли билеты с открытой датой?',
    answer:
      'У многих музеев и выставок бывают билеты без фиксированного сеанса. Это будет указано в карточке события.',
  },
  {
    question: 'Где проходит оплата?',
    answer:
      'Покупка - в виджете билетной системы или на сайте организатора. Дайбилет помогает выбрать событие и хранит статус заказа.',
  },
  {
    question: 'Актуальны ли часы работы?',
    answer:
      'Мы показываем афишу событий; режим работы учреждения лучше проверить на его официальном сайте.',
  },
];

/** Curated FAQ if present, otherwise generic venue FAQ. */
export function resolveVenueFaqItems(
  venueSlug: string | null | undefined,
): VenueEditorialFaqItem[] {
  const curated = resolveVenueEditorialContent(venueSlug)?.faq;
  return curated?.length ? curated : VENUE_GENERIC_FAQ;
}

/**
 * Patch public venue DTO with curated title / metro / SEO when DB lags.
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
  const existingSeo = String(next.seoDescription || '').trim();
  if (!existingSeo && editorial.seoDescription) {
    next = { ...next, seoDescription: editorial.seoDescription };
  }
  const existingShort = String(next.shortDescription || '').trim();
  if (!existingShort && editorial.heroLead) {
    next = { ...next, shortDescription: editorial.heroLead };
  }
  const existingWay = String(next.wayToFind || '').trim();
  if ((!existingWay || existingWay === '-' || existingWay === '—') && editorial.wayToFind) {
    next = { ...next, wayToFind: editorial.wayToFind };
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
