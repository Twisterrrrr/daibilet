import type { CatalogPresetSlug } from '@/lib/catalog-presets';
import {
  catalogIntentPath,
  catalogPresetToIntentPath,
  type CatalogIntentSlug,
} from '@/lib/catalog-intent-routes';
import {
  concertsLandingHref,
  isLandingCityAllowed,
  landingCategoryHref,
  normalizeCitySlug,
  resolveConcertGenreTag,
} from '@/lib/landing-routes';

/** Статичный SEO-URL подборки; fallback на /events только если пресет неизвестен. */
export function buildCatalogPresetHref(slug: CatalogPresetSlug, city?: string): string {
  return catalogPresetToIntentPath(slug, city) || '/events';
}

export type CatalogTagHrefKind = 'chpu' | 'fallback';

export type CatalogTagHrefResult = {
  href: string;
  kind: CatalogTagHrefKind;
};

/** Точные/нормализованные теги → landing slug (без жанрового query). */
const EXACT_TAG_LANDING: Record<string, string> = {
  'stand up': 'standup',
  standup: 'standup',
  стендап: 'standup',
  юмор: 'standup',
  комедия: 'standup',
  импровизация: 'standup',
  'открытый микрофон': 'standup',
  'open mic': 'standup',
  'водные экскурсии': 'river-cruises',
  'речные прогулки': 'river-cruises',
  'речной круиз': 'river-cruises',
  теплоход: 'river-cruises',
  'автобусные туры': 'bus-tours',
  'автобусные экскурсии': 'bus-tours',
  автобус: 'bus-tours',
  экскурсии: 'excursions',
  экскурсия: 'excursions',
  'пешие экскурсии': 'walking-tours',
  'пешая экскурсия': 'walking-tours',
  'загородные экскурсии': 'country-tours',
  загород: 'country-tours',
  выставки: 'exhibitions',
  выставка: 'exhibitions',
  музеи: 'exhibitions',
  музей: 'exhibitions',
  лекция: 'exhibitions',
  картины: 'exhibitions',
  'необычные театры': 'unusual-theatres',
  антреприза: 'unusual-theatres',
  'тематические вечеринки': 'river-party',
  вечеринка: 'river-party',
  дискотека: 'river-party',
  детям: 'family-kids',
  дети: 'family-kids',
  семья: 'family-kids',
  семейный: 'family-kids',
  'мастер-класс': 'family-kids',
  крыши: 'rooftops',
  крыша: 'rooftops',
  'разводные мосты': 'bridges-night',
  мосты: 'bridges-night',
  концерты: 'concerts-genre',
  концерт: 'concerts-genre',
  активный: 'active-sport',
  спорт: 'active-sport',
};

/** Жанровые/музыкальные теги → лендинг концертов (с genre= если известен канон). */
const CONCERT_TAG_ALIASES = new Set(
  [
    'рок',
    'поп',
    'джаз',
    'классика',
    'металл',
    'эстрада',
    'орган',
    'альтернатива',
    'рэп/хип-хоп',
    'рэп',
    'хип-хоп',
    'hip-hop',
    'блюз',
    'фолк',
    'шансон',
    'инди',
    'панк',
    'world music',
    'электроника',
    'ska punk',
    'саксофон',
    'соул',
    'этно',
    'фьюжн',
    'мюзикл',
    'современный',
  ].map((item) => item.toLowerCase()),
);

const INTENT_TAG_ALIASES: Record<string, CatalogIntentSlug> = {
  бесплатно: 'besplatno',
  free: 'besplatno',
  'на выходные': 'na-vyhodnye',
  'на выходных': 'na-vyhodnye',
  выходные: 'na-vyhodnye',
  weekend: 'na-vyhodnye',
  'сегодня вечером': 'segodnya-vecherom',
  вечером: 'segodnya-vecherom',
  'до 2000': 'do-2000',
  бюджет: 'do-2000',
  скоро: 'skoro',
};

function normalizeTagKey(tag: string): string {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function fallbackTagHref(tag: string, city?: string): CatalogTagHrefResult {
  const params = new URLSearchParams();
  params.set('q', tag);
  if (city && city !== 'all') params.set('city', city);
  return { href: `/events?${params.toString()}`, kind: 'fallback' };
}

function landingHrefForTag(landingSlug: string, city?: string | null): string {
  const citySlug = city && city !== 'all' ? normalizeCitySlug(city) || city : null;
  if (citySlug && !isLandingCityAllowed(landingSlug, citySlug)) {
    return landingCategoryHref(landingSlug);
  }
  return landingCategoryHref(landingSlug, citySlug);
}

function heuristicLandingSlug(tag: string): string | null {
  const hay = normalizeTagKey(tag);
  if (!hay) return null;
  if (/стендап|stand[\s-]?up|юмор|комеди|импровиз/.test(hay)) return 'standup';
  if (/крыш/.test(hay)) return 'rooftops';
  if (/мост/.test(hay)) return 'bridges-night';
  if (/теплоход|катер|речн|водн|канал/.test(hay)) return 'river-cruises';
  if (/вечерин|диско|party/.test(hay)) return 'river-party';
  if (/пеш(ие|ая|еход)/.test(hay) && /экскурс/.test(hay)) return 'walking-tours';
  if (/автобус/.test(hay)) return 'bus-tours';
  if (/загород|петергоф|царск|павловск/.test(hay)) return 'country-tours';
  if (/выставк|музе|лекци|картин/.test(hay)) return 'exhibitions';
  if (/театр|антреприз|спектакл/.test(hay)) return 'unusual-theatres';
  if (/концерт|рок|джаз|поп|метал|классик|эстрад/.test(hay)) return 'concerts-genre';
  if (/дет|семь|мастер[\s-]?класс/.test(hay)) return 'family-kids';
  if (/экскурс/.test(hay)) return 'excursions';
  if (/актив|спорт/.test(hay)) return 'active-sport';
  return null;
}

/**
 * Тег облака `/podborki` → CHPU landing/intent, если есть посадка.
 * Иначе fallback `/events?q=` (и city, если выбран).
 */
export function resolveCatalogTagHref(tag: string, city?: string): CatalogTagHrefResult {
  const raw = String(tag || '').trim();
  if (!raw) return fallbackTagHref(tag, city);

  const key = normalizeTagKey(raw);
  const citySlug = city && city !== 'all' ? city : undefined;

  const intent = INTENT_TAG_ALIASES[key];
  if (intent) {
    return { href: catalogIntentPath(intent, citySlug), kind: 'chpu' };
  }

  const exactLanding = EXACT_TAG_LANDING[key];
  if (exactLanding) {
    if (exactLanding === 'concerts-genre') {
      return { href: concertsLandingHref(citySlug), kind: 'chpu' };
    }
    return { href: landingHrefForTag(exactLanding, citySlug), kind: 'chpu' };
  }

  const genre = resolveConcertGenreTag(raw);
  if (genre || CONCERT_TAG_ALIASES.has(key)) {
    return { href: concertsLandingHref(citySlug, genre), kind: 'chpu' };
  }

  const heuristic = heuristicLandingSlug(raw);
  if (heuristic) {
    if (heuristic === 'concerts-genre') {
      return { href: concertsLandingHref(citySlug), kind: 'chpu' };
    }
    return { href: landingHrefForTag(heuristic, citySlug), kind: 'chpu' };
  }

  return fallbackTagHref(raw, citySlug);
}

export function buildCatalogTagHref(tag: string, city?: string): string {
  return resolveCatalogTagHref(tag, city).href;
}
