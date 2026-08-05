import { Anchor, Bus, Landmark, MapPin, Trees, type LucideIcon } from 'lucide-react';

import { formatNumber } from '@/lib/format';

export type VenuePageTemplate = 'institution' | 'location';

export const INSTITUTION_KINDS = new Set([
  'museum',
  'art_space',
  'museum_art_space',
  'theater',
  'concert_hall',
  'bar',
  'club_bar_restaurant',
]);

const VENUE_TYPE_LABELS: Record<string, string> = {
  museum: 'Музей',
  art_space: 'Арт-пространство',
  /** Legacy DB enum MUSEUM_ART_SPACE до split в public kind. */
  museum_art_space: 'Музей',
  theater: 'Театр',
  concert_hall: 'Концертный зал',
  bar: 'Бар',
  club_bar_restaurant: 'Клуб / ресторан',
  pier: 'Причал',
  bus: 'Автобусы',
  venue: 'Площадка',
  outdoor_location: 'Открытая локация',
  park: 'Парк',
  monument: 'Памятник',
  sport_activity_space: 'Спорт / активность',
  attraction: 'Достопримечательность',
  meeting_point: 'Точка сбора',
  online: 'Онлайн',
  other: 'Локация',
};

/** Множественное число для сегмента крошек: Главная > Город > {Type} > Title. */
const VENUE_TYPE_BREADCRUMB_PLURALS: Record<string, string> = {
  museum: 'Музеи',
  art_space: 'Арт-пространства',
  museum_art_space: 'Музеи',
  theater: 'Театры',
  concert_hall: 'Концертные залы',
  bar: 'Бары',
  club_bar_restaurant: 'Клубы и рестораны',
  pier: 'Причалы',
  pier_water: 'Причалы',
  bus: 'Автобусы',
  venue: 'Площадки',
  outdoor_location: 'Открытые локации',
  park: 'Парки',
  monument: 'Памятники',
  sport_activity_space: 'Спорт и активность',
  attraction: 'Достопримечательности',
  meeting_point: 'Точки сбора',
  online: 'Онлайн',
  other: 'Локации',
  /** Legacy template aliases (session.venueKind / тесты). */
  institution: 'Площадки',
  location: 'Локации',
};

/**
 * Public split MUSEUM_ART_SPACE → museum | art_space (crumbs + ?type=).
 * DB enum пока один; TODO: Prisma MUSEUM / ART_SPACE + backfill.
 * Третьяковка → museum; «Галерея …» / арт-пространство → art_space.
 */
export function classifyMuseumOrArtSpace(name?: string | null, extraText?: string | null): 'museum' | 'art_space' {
  const text = `${name || ''} ${extraText || ''}`.toLowerCase();
  // Explicit overrides: Erarta (legacy ART_SPACE) stays art_space despite «Музей» in title.
  if (/эрарта|\berarta\b|ven_spbboats_erarta/i.test(text)) return 'art_space';
  if (/музей\s+современного\s+искусств/i.test(text)) return 'art_space';
  if (/арт[-\s]?пространств|art[-\s]?space|иммерсив|люмьер|глазунов/i.test(text)) return 'art_space';
  if (/галере/i.test(text) && !/музей|третьяков|эрмитаж|пушкинск|русск(?:ий|ого)\s+музей/i.test(text)) {
    return 'art_space';
  }
  return 'museum';
}

/** Нормализует public type для крошек/фильтров (split museum_art_space). */
export function resolvePublicVenueType(type?: string | null, name?: string | null): string {
  const key = normalizeVenueKind(type);
  if (key === 'museum' || key === 'art_space') return key;
  if (key === 'museum_art_space') return classifyMuseumOrArtSpace(name);
  return key;
}

/** Href сегмента типа в крошках: /venues?type=museum&city=… */
export function venueTypeCatalogHref(input: {
  type?: string | null;
  name?: string | null;
  city?: string | null;
}): string {
  const publicType = resolvePublicVenueType(input.type, input.name);
  const template = venuePageTemplate(publicType);
  const base = template === 'location' ? '/locations' : '/venues';
  const params = new URLSearchParams();
  params.set('type', publicType);
  const city = String(input.city || '').trim();
  if (city && city !== 'Не указан') params.set('city', city);
  return `${base}?${params.toString()}`;
}

export function normalizeVenueKind(type?: string | null): string {
  return String(type || 'other')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function formatPublicVenueTitle(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
    .trim();
}

export function isMeetingPointLike(input: {
  type?: string | null;
  name?: string | null;
  title?: string | null;
  address?: string | null;
}): boolean {
  const kind = normalizeVenueKind(input.type);
  if (kind === 'meeting_point') return true;
  // Explicit park/monument kinds are destinations (Важные места), not tour meeting points.
  if (kind === 'park' || kind === 'monument') return false;
  const name = `${input.name || input.title || ''} ${input.address || ''}`.toLowerCase();
  return /место сбора|место встречи|точка сбора|точка встречи|площадка:|^метро\b|^м\.(?:\s|«|"|')|\bм\.\s*(?:«|[а-яё])|\bу метро\b|около метро|у памятник|памятник|\bпам\.|у пам\.|\bу пам\b|пл\.\s*у пам/u.test(name);
}

export function venueTypeLabel(type?: string | null, name?: string | null): string {
  const key = resolvePublicVenueType(type, name);
  if (key === 'pier_water') return VENUE_TYPE_LABELS.pier;
  return VENUE_TYPE_LABELS[key] || VENUE_TYPE_LABELS.other;
}

/** Plural nominative для middle-сегмента breadcrumbs (не generic «Площадки»). */
export function venueTypeBreadcrumbPlural(type?: string | null, name?: string | null): string {
  const key = resolvePublicVenueType(type, name);
  if (VENUE_TYPE_BREADCRUMB_PLURALS[key]) return VENUE_TYPE_BREADCRUMB_PLURALS[key];
  return venuePageTemplate(key) === 'location' ? 'Локации' : 'Площадки';
}

export function venueTypeIcon(type?: string | null): LucideIcon {
  const key = normalizeVenueKind(type);
  if (key === 'pier' || key === 'pier_water') return Anchor;
  if (key === 'bus') return Bus;
  if (key === 'park') return Trees;
  if (key === 'monument') return Landmark;
  if (INSTITUTION_KINDS.has(key)) return Landmark;
  return MapPin;
}

export function venuePageTemplate(type?: string | null): VenuePageTemplate {
  const key = normalizeVenueKind(type);
  if (key === 'institution') return 'institution';
  if (key === 'location') return 'location';
  if (INSTITUTION_KINDS.has(key)) return 'institution';
  return 'location';
}

const WEAK_VENUE_LEAD_RE = /^(легенда|описание|текст|n\/a|нет|—|-)$/i;

function isWeakVenueLeadText(value?: string | null): boolean {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return true;
  if (text.length < 24) return true;
  if (WEAK_VENUE_LEAD_RE.test(text)) return true;
  return false;
}

function isTruncatedVenueLeadText(value?: string | null): boolean {
  return /\.\.\.$/.test(String(value || '').replace(/\s+/g, ' ').trim());
}

export function resolveLocationVenueCopy(venue: {
  name?: string | null;
  city?: string | null;
  description?: string | null;
  shortDescription?: string | null;
}) {
  const description = String(venue.description || '').replace(/\s+/g, ' ').trim();
  const shortDescription = String(venue.shortDescription || '').replace(/\s+/g, ' ').trim();
  const fullDescription =
    description || (!isWeakVenueLeadText(shortDescription) ? shortDescription : '');
  const heroLead =
    !isWeakVenueLeadText(shortDescription) && !isTruncatedVenueLeadText(shortDescription)
      ? shortDescription
      : fullDescription;
  const fallback = `Локация «${venue.name || 'точка отправления'}» в ${venue.city || 'городе'}. Адрес и время отправления уточняйте в карточке события перед покупкой.`;

  return {
    fullDescription: fullDescription || fallback,
    heroLead: heroLead || fallback,
    howToFind: fullDescription || fallback,
  };
}

export function institutionTypeEmoji(type?: string | null): string {
  const key = resolvePublicVenueType(type);
  const map: Record<string, string> = {
    museum: '🏛️',
    art_space: '🎨',
    museum_art_space: '🏛️',
    theater: '🎭',
    concert_hall: '🎼',
    bar: '🍸',
    club_bar_restaurant: '🎧',
  };
  return map[key] || '✨';
}

export const CATALOG_TYPE_OPTIONS: Array<{ value: string; label: string; template: VenuePageTemplate }> = [
  { value: 'museum', label: 'Музеи', template: 'institution' },
  { value: 'art_space', label: 'Арт-пространства', template: 'institution' },
  { value: 'theater', label: 'Театр', template: 'institution' },
  { value: 'concert_hall', label: 'Концертный зал', template: 'institution' },
  { value: 'bar', label: 'Бар', template: 'institution' },
  { value: 'club_bar_restaurant', label: 'Клуб / ресторан', template: 'institution' },
  { value: 'pier', label: 'Причал', template: 'location' },
  { value: 'bus', label: 'Автобусы', template: 'location' },
  { value: 'venue', label: 'Площадка', template: 'location' },
  { value: 'park', label: 'Парк', template: 'location' },
  { value: 'monument', label: 'Памятник', template: 'location' },
  { value: 'outdoor_location', label: 'Открытая локация', template: 'location' },
  { value: 'sport_activity_space', label: 'Спорт / активность', template: 'location' },
  { value: 'attraction', label: 'Достопримечательность', template: 'location' },
  { value: 'other', label: 'Другое', template: 'location' },
];

export function locationTypeEmoji(type?: string | null): string {
  const key = normalizeVenueKind(type);
  const map: Record<string, string> = {
    pier: '⚓',
    pier_water: '⚓',
    bus: '🚌',
    venue: '📍',
    park: '🌳',
    monument: '🗿',
    outdoor_location: '🌳',
    sport_activity_space: '⚡',
    attraction: '🏛',
    other: '📍',
  };
  return map[key] || '📍';
}

export const INSTITUTION_CATALOG_TYPE_OPTIONS = CATALOG_TYPE_OPTIONS.filter((option) => option.template === 'institution').map(
  (option) => ({
    ...option,
    emoji: institutionTypeEmoji(option.value),
  }),
);

export const LOCATION_CATALOG_TYPE_OPTIONS = CATALOG_TYPE_OPTIONS.filter((option) => option.template === 'location').map(
  (option) => ({
    ...option,
    emoji: locationTypeEmoji(option.value),
  }),
);

/** UX-масштаб площадок на `/venues` - только эвристики по kind, без Prisma. */
export type InstitutionScale = 'museum' | 'large_hall' | 'intimate' | 'other';

const MUSEUM_SCALE_KINDS = new Set(['museum', 'art_space', 'museum_art_space']);
const LARGE_HALL_KINDS = new Set(['theater', 'concert_hall']);
const INTIMATE_KINDS = new Set(['bar', 'club_bar_restaurant']);

const LARGE_HALL_NAME_RE =
  /\b(большой|марийский|новат|оперн|балет|филармон|консерватор|дворец\s+спорт|ледовый|арена|стадион)\b/iu;
const INTIMATE_NAME_RE = /\b(камерн|лофт|клуб|бар|рюмочн|speakeasy|спикизи|галере)\b/iu;

export function resolveInstitutionScale(type?: string | null, name?: string | null): InstitutionScale {
  const publicType = resolvePublicVenueType(type, name);
  if (MUSEUM_SCALE_KINDS.has(publicType)) return 'museum';
  if (LARGE_HALL_KINDS.has(publicType)) return 'large_hall';
  if (INTIMATE_KINDS.has(publicType)) return 'intimate';
  const text = String(name || '');
  if (LARGE_HALL_NAME_RE.test(text)) return 'large_hall';
  if (INTIMATE_NAME_RE.test(text)) return 'intimate';
  return 'other';
}

export const INSTITUTION_SCALE_OPTIONS: Array<{ value: InstitutionScale | 'all'; label: string }> = [
  { value: 'all', label: 'Все масштабы' },
  { value: 'museum', label: 'Музеи' },
  { value: 'large_hall', label: 'Крупные залы' },
  { value: 'intimate', label: 'Камерные' },
];

/** Логистические группы на `/locations` - причалы / автобусы / пешеходные. */
export type LocationLogisticsGroup = 'pier' | 'bus' | 'walking' | 'other';

const PIER_KINDS = new Set(['pier', 'pier_water']);
const BUS_KINDS = new Set(['bus']);
const WALKING_KINDS = new Set([
  'park',
  'monument',
  'outdoor_location',
  'attraction',
  'meeting_point',
  'sport_activity_space',
]);

export function resolveLocationLogisticsGroup(type?: string | null, name?: string | null): LocationLogisticsGroup {
  const key = resolvePublicVenueType(type, name);
  if (PIER_KINDS.has(key)) return 'pier';
  if (BUS_KINDS.has(key)) return 'bus';
  if (WALKING_KINDS.has(key)) return 'walking';
  const text = String(name || '').toLowerCase();
  if (/причал|пристань|дебаркадер|набережн/.test(text)) return 'pier';
  if (/автобус|автовокзал|место посадки/.test(text)) return 'bus';
  if (/пешеход|прогулк|двор|улица|площад|парк|сквер/.test(text)) return 'walking';
  return 'other';
}

export const LOCATION_LOGISTICS_OPTIONS: Array<{ value: LocationLogisticsGroup | 'all'; label: string }> = [
  { value: 'all', label: 'Все точки' },
  { value: 'pier', label: 'Причалы' },
  { value: 'bus', label: 'Автобусы' },
  { value: 'walking', label: 'Пешеходные' },
];
