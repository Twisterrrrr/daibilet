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

/** Split catalog `stats.types` into institution vs location counts for Places eyebrow. */
export function countCatalogFamilies(types: Record<string, number> | null | undefined): {
  institutions: number;
  locations: number;
} {
  let institutions = 0;
  let locations = 0;
  for (const [kind, raw] of Object.entries(types || {})) {
    const n = Number(raw) || 0;
    if (INSTITUTION_KINDS.has(normalizeVenueKind(kind))) institutions += n;
    else locations += n;
  }
  return { institutions, locations };
}

const VENUE_TYPE_LABELS: Record<string, string> = {
  museum: 'Музей',
  /** Public kind for commercial / artist galleries (places chip «Галереи»). */
  art_space: 'Галерея',
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
  temple: 'Храм',
  gastro: 'Гастроточка',
  meeting_point: 'Точка сбора',
  online: 'Онлайн',
  other: 'Локация',
};

/** Множественное число для сегмента крошек: Главная > Город > {Type} > Title. */
const VENUE_TYPE_BREADCRUMB_PLURALS: Record<string, string> = {
  museum: 'Музеи',
  art_space: 'Галереи',
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
  temple: 'Храмы',
  gastro: 'Гастроточки',
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
  // Commercial gallery despite «Музейно-выставочный центр» in the legal title.
  if (
    /петербургск(?:ий|ого)\s+художник|muzeino-vystavochnyi-centr-peterburgskii-hudozhnik/i.test(
      text,
    )
  ) {
    return 'art_space';
  }
  if (/музей\s+современного\s+искусств/i.test(text)) return 'art_space';
  if (/арт[-\s]?пространств|art[-\s]?space|иммерсив|люмьер|глазунов/i.test(text)) return 'art_space';
  if (/галере/i.test(text) && !/музей|третьяков|эрмитаж|пушкинск|русск(?:ий|ого)\s+музей/i.test(text)) {
    return 'art_space';
  }
  return 'museum';
}

/** Собор / церковь / монастырь / мечеть → public kind `temple` (чип «Храмы»). */
export function isTempleLikeVenueName(name?: string | null): boolean {
  return /(?:собор|церков|храм|монастыр|мечет|синагог|кирх|часовн|костел|\bлавр[аы]\b)/iu.test(
    String(name || ''),
  );
}

/** Нормализует public type для крошек/фильтров (split museum_art_space + temple). */
export function resolvePublicVenueType(type?: string | null, name?: string | null): string {
  const key = normalizeVenueKind(type);
  if (key === 'temple') return 'temple';
  if (
    (key === 'attraction' || key === 'outdoor_location') &&
    isTempleLikeVenueName(name)
  ) {
    return 'temple';
  }
  if (key === 'art_space') return 'art_space';
  // Stored museum / legacy museum_art_space: title may still mean gallery (Глазунов, Петербургский художник).
  if (key === 'museum' || key === 'museum_art_space') return classifyMuseumOrArtSpace(name);
  return key;
}

/** Href сегмента типа в крошках: /places?type=museum&city=… */
export function venueTypeCatalogHref(input: {
  type?: string | null;
  name?: string | null;
  city?: string | null;
}): string {
  const publicType = resolvePublicVenueType(input.type, input.name);
  const params = new URLSearchParams();
  params.set('type', publicType);
  const city = String(input.city || '').trim();
  if (city && city !== 'Не указан') params.set('city', city);
  return `/places?${params.toString()}`;
}

export function normalizeVenueKind(type?: string | null): string {
  return String(type || 'other')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function formatPublicVenueTitle(value?: string | null): string {
  if (!value) return '';
  let text = String(value).replace(/\s+/g, ' ').trim();
  text = text.replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '').trim();
  const pickupParen =
    /\s*\((?=[^)]*(?:внутренняя территория|ближе к|со стороны|точка сбора|место сбора|место встречи|вход со стороны|у входа|площадка расположена|ориентир))[^)]*\)\s*$/iu;
  const hadPickup = pickupParen.test(text);
  text = text.replace(pickupParen, '').replace(/[.,;:\s]+$/u, '').trim();
  const split = text.match(/^(.{4,120}?)\.\s+([^.]+)$/u);
  if (!split) return text;
  const head = split[1].trim();
  const tail = split[2].trim();
  const lastWord = head.split(/\s+/).pop() || '';
  if (/^(им|ул|пр|пер|наб|ш|пл|д|г|стр|лит|о|т|п|с|ч|н)\.?$/i.test(lastWord) || /^[А-ЯЁA-Z]\.?$/u.test(lastWord)) {
    return text;
  }
  if (hadPickup || /равелин|бастион|куртина|внутренн|корпус|крыло|флигель|башня\b/iu.test(tail)) {
    return head;
  }
  return text;
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
  if (kind === 'park' || kind === 'monument' || kind === 'temple' || kind === 'attraction') return false;
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
  if (key === 'monument' || key === 'temple' || key === 'attraction') return Landmark;
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
const MAP_PIN_LEAD_RE =
  /на карте города|точка на (карте|маршруте)|ориентир в городе|жанровая точка|парковая точка|литературная точка|открытое пространство для прогулок|открытая локация для прогулок и событий/i;

export function isWeakVenueLeadText(value?: string | null): boolean {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return true;
  if (text.length < 24) return true;
  if (WEAK_VENUE_LEAD_RE.test(text)) return true;
  if (MAP_PIN_LEAD_RE.test(text)) return true;
  return false;
}

function isTruncatedVenueLeadText(value?: string | null): boolean {
  return /\.\.\.$/.test(String(value || '').replace(/\s+/g, ' ').trim());
}

/** Drop hookFact when description already starts with the same sentence (catalog monuments). */
export function stripLeadingHookFact(
  description?: string | null,
  hookFact?: string | null,
): string {
  const body = String(description || '')
    .replace(/\s+/g, ' ')
    .trim();
  const hook = String(hookFact || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!body) return '';
  if (!hook) return body;
  if (body === hook) return '';
  if (body.startsWith(hook)) {
    return body
      .slice(hook.length)
      .replace(/^[\s.]+/, '')
      .trim();
  }
  return body;
}

export function resolveLocationVenueCopy(venue: {
  name?: string | null;
  city?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  hookFact?: string | null;
}) {
  const description = String(venue.description || '').replace(/\s+/g, ' ').trim();
  const shortDescription = String(venue.shortDescription || '').replace(/\s+/g, ' ').trim();
  const hookFact = String(venue.hookFact || '').replace(/\s+/g, ' ').trim();
  const strongDescription = !isWeakVenueLeadText(description) ? description : '';
  const strongShort = !isWeakVenueLeadText(shortDescription) ? shortDescription : '';
  const fullDescription = strongDescription || strongShort;
  const heroLead =
    strongShort && !isTruncatedVenueLeadText(shortDescription) ? strongShort : fullDescription;
  const aboutBody = stripLeadingHookFact(fullDescription, hookFact);

  return {
    fullDescription,
    /** Body for «О локации» without repeating hookFact. */
    aboutBody,
    heroLead,
    howToFind: fullDescription,
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
  { value: 'art_space', label: 'Галереи', template: 'institution' },
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
  { value: 'temple', label: 'Храм', template: 'location' },
  { value: 'gastro', label: 'Гастроточка', template: 'location' },
  { value: 'meeting_point', label: 'Точка сбора', template: 'location' },
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
    temple: '⛪',
    gastro: '🍽',
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

/**
 * Чипы `/places` для людей: без жаргона «площадка/локация» как семейства.
 * Логистика (причалы / автобусы) и редкие kind оставляем - иначе хаб «теряет» целые срезы.
 * `id` уходит в `?type=`; `types` - фактические kind для фильтрации.
 */
export const PLACES_HUB_CATEGORY_CHIPS: Array<{ id: string; label: string; types: string[] }> = [
  { id: 'museums', label: 'Музеи', types: ['museum', 'museum_art_space'] },
  { id: 'galleries', label: 'Галереи', types: ['art_space'] },
  { id: 'theaters', label: 'Театры', types: ['theater'] },
  { id: 'concert_halls', label: 'Концертные залы', types: ['concert_hall'] },
  { id: 'bars_restaurants', label: 'Бары и рестораны', types: ['bar', 'club_bar_restaurant'] },
  { id: 'gastro', label: 'Гастроточки', types: ['gastro'] },
  {
    id: 'outdoors',
    label: 'Парки и открытые места',
    types: ['park', 'outdoor_location'],
  },
  { id: 'attractions', label: 'Достопримечательности', types: ['attraction'] },
  { id: 'temples', label: 'Храмы', types: ['temple'] },
  { id: 'monuments', label: 'Памятники', types: ['monument'] },
  { id: 'piers', label: 'Причалы', types: ['pier', 'pier_water'] },
  { id: 'buses', label: 'Автобусы', types: ['bus'] },
  { id: 'venues', label: 'Площадки', types: ['venue', 'other'] },
  { id: 'sport', label: 'Спорт', types: ['sport_activity_space'] },
];

export function resolvePlacesHubCategoryChip(
  typeParam: string | null | undefined,
): (typeof PLACES_HUB_CATEGORY_CHIPS)[number] | null {
  const raw = String(typeParam || '')
    .trim()
    .toLowerCase();
  if (!raw || raw === 'all') return null;
  const byId = PLACES_HUB_CATEGORY_CHIPS.find((chip) => chip.id === raw);
  if (byId) return byId;
  // Legacy `?type=theater` / `museum` from older URLs.
  return (
    PLACES_HUB_CATEGORY_CHIPS.find((chip) => chip.types.includes(normalizeVenueKind(raw))) || null
  );
}

export function placesHubCategoryCount(
  typesCounts: Record<string, number> | null | undefined,
  chip: (typeof PLACES_HUB_CATEGORY_CHIPS)[number],
): number {
  const counts = typesCounts || {};
  return chip.types.reduce((sum, type) => sum + (Number(counts[type]) || 0), 0);
}

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
  'temple',
  'gastro',
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

/** Secondary quick-toggles on `/locations` - do not replace kind chips. */
export const LOCATION_LOGISTICS_OPTIONS: Array<{ value: LocationLogisticsGroup | 'all'; label: string }> = [
  { value: 'all', label: 'Любая логистика' },
  { value: 'pier', label: 'Причалы' },
  { value: 'bus', label: 'Автобусы' },
  { value: 'walking', label: 'Пешеходные' },
];

/**
 * Cultural attractions that can sit next to museums on institution PDP
 * (Исаакий, Кунсткамера) - never bars / standup clubs.
 */
const CULTURAL_ATTRACTION_NAME_RE =
  /музей|собор|кунсткамер|галере|эрмитаж|дворец|храм|крепост|петропавл|исаак|фаберже|эрарта|штаб|арсенал|монастыр/iu;

function isCulturalAttractionLike(type: string, name?: string | null): boolean {
  return (
    (type === 'attraction' || type === 'monument' || type === 'temple') &&
    CULTURAL_ATTRACTION_NAME_RE.test(String(name || ''))
  );
}

/**
 * Related venues for institution PDP: same commercial family only.
 * Museums → museums / art spaces / cultural attractions; never bars/clubs/standup.
 * Empty result → caller hides the block.
 */
export function filterSimilarInstitutionVenues<
  T extends { type?: string | null; name?: string | null; title?: string | null; events?: number | null },
>(current: { type?: string | null; name?: string | null; title?: string | null }, related: T[], limit = 4): T[] {
  const currentType = resolvePublicVenueType(current.type, current.name || current.title);
  const currentName = current.name || current.title || '';
  const scored = related
    .map((item) => {
      const type = resolvePublicVenueType(item.type, item.name || item.title);
      const name = item.name || item.title || '';
      let score = -1;
      if (MUSEUM_SCALE_KINDS.has(currentType) || isCulturalAttractionLike(currentType, currentName)) {
        if (MUSEUM_SCALE_KINDS.has(type)) score = type === 'museum' || type === 'museum_art_space' ? 100 : 90;
        else if (isCulturalAttractionLike(type, name)) score = 70;
      } else if (LARGE_HALL_KINDS.has(currentType)) {
        if (LARGE_HALL_KINDS.has(type)) score = type === currentType ? 100 : 80;
      } else if (INTIMATE_KINDS.has(currentType)) {
        if (INTIMATE_KINDS.has(type)) score = type === currentType ? 100 : 80;
      } else if (type === currentType) {
        score = 50;
      }
      if (score < 0) return null;
      return { item, score: score + Math.min(20, Number(item.events) || 0) };
    })
    .filter((row): row is { item: T; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.item);
}
