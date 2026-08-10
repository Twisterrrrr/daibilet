import { resolveCityTimeZone } from './city-timezone.js';
import { matchingLandingSlugs } from './landing-rules.js';
import {
  isFutureSlotStart,
  isOpenDateCatalogRow,
  isPublicSalesStatusBlocked,
  isPublicSessionRowOnSale,
} from './catalog-availability.js';
import { resolveEditorialEventImage } from './event-cover-images.js';
import { pickFirstUsableEventImageUrl } from './event-image-url.js';
import {
  buildProviderWidgetUrl,
  providerForSource,
  purchaseInfo,
  resolveSessionPurchaseExternalId,
} from './provider-purchase.js';
import { normalizeStartsAt, parseSessionStartsAt } from './public-datetime.js';
import { formatPublicEventTitle } from './event-title-normalize.ts';
import { loadCityRoutingConfig } from './city-routing-config.js';
import type { DestinationType, TimeBucket } from './types/common.js';
import type { PublicSessionDto } from './types/public.js';

export interface PublicCatalogSlotRow {
  id?: string | null;
  eventId?: string | null;
  startsAt?: string | Date | null;
  sourceStatus?: string | null;
  sourceCode?: string | null;
  offerSourceCode?: string | null;
  offerWidgetUrl?: string | null;
  offerDeeplinkUrl?: string | null;
  providerSessionId?: string | null;
  providerEventId?: string | null;
  externalId?: string | null;
}

export interface PublicCatalogMappingRow {
  id: string;
  slug: string;
  externalId: string | null;
  sourceCode: string | null;
  sourceName: string | null;
  sourceLabel: string;
  title: string;
  description: string | null;
  kind: string;
  sourceStatus: string | null;
  ageLimit?: string | null;
  imageUrl: string | null;
  category: string | null;
  cityId: string | null;
  city: string | null;
  citySlug: string | null;
  cityHeroImageUrl: string | null;
  cityIsDestination: boolean | null;
  regionId: string | null;
  regionSlug: string | null;
  regionTitle: string | null;
  venueId: string | null;
  venueSlug: string | null;
  venue: string | null;
  venueHeroImageUrl: string | null;
  venueKind: string | null;
  overrideTitle: string | null;
  overrideMergeGroupKey: string | null;
  overrideDescription: string | null;
  overrideShortDescription: string | null;
  overrideImageUrl: string | null;
  offerSourceCode: string | null;
  offerTitle: string | null;
  offerPriceRub: number | null;
  offerWidgetUrl: string | null;
  offerDeeplinkUrl: string | null;
  startsAt: string | Date | null;
  tags: string[];
  subcategories: string[];
  groupKey: string;
  groupEventIds: string[];
  groupedEventsCount: number;
  sessionCount: number;
  priceFrom: number;
  priceTo?: number | null;
  vacant: number | null;
  upcomingSlots: unknown;
}

interface CityRoutingConfig {
  standaloneCities?: string[];
  cityToRegion?: Record<string, string>;
  foreignCities?: string[];
}

interface PublicDestination {
  id: string;
  slug: string;
  sourceSlug: string;
  name: string;
  type: DestinationType;
}

const cityRouting = loadCityRoutingConfig(import.meta.url) as CityRoutingConfig;
const standaloneCityNames = new Set(cityRouting.standaloneCities || []);
const cityToRegion = new Map(Object.entries(cityRouting.cityToRegion || {}));
const foreignCityNames = new Set(cityRouting.foreignCities || []);

function isForeignPublicCity(name: string | null | undefined): boolean {
  const clean = cleanDisplayName(name);
  return Boolean(clean && foreignCityNames.has(clean));
}
const cityImageAliases: Record<string, string> = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
};
const cityImageSlugs = new Set([
  'saint-petersburg', 'moscow', 'kazan', 'kaliningrad', 'vladivostok', 'vologda', 'irkutsk',
  'perm', 'samara', 'sochi', 'ekaterinburg', 'nizhny-novgorod', 'novosibirsk', 'krasnodar',
  'suzdal', 'veliky-novgorod', 'voronezh', 'yaroslavl', 'krasnoyarsk', 'omsk',
]);
const knownSessionCities = [
  'Нижний Новгород', 'Санкт-Петербург', 'Ростов-на-Дону', 'Екатеринбург', 'Красноярск',
  'Новосибирск', 'Калининград', 'Москва', 'Казань', 'Самара', 'Волгоград', 'Ярославль',
  'Владимир', 'Пермь', 'Тверь', 'Сочи', 'Тула',
].sort((left, right) => right.length - left.length);

export function mapGroupedPublicSession(
  row: PublicCatalogMappingRow,
  pinnedEventIds: Set<string> = new Set(),
): PublicSessionDto | null {
  const tags = row.tags || [];
  const subcategories = pickCatalogSubcategories({
    category: row.category,
    subcategories: row.subcategories,
    tags,
    title: row.overrideTitle || row.title,
    venue: row.venue,
  });
  const cityName = resolvePublicSessionCity(row);
  if (isForeignPublicCity(cityName) || isForeignPublicCity(row.city)) return null;
  const destination = publicDestinationForCity({ ...row, city: cityName });
  if (!destination) return null;
  const timeZone = resolveCityTimeZone(cityName, destination.name);
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  if (!isPublicSessionRowOnSale({ sourceStatus: row.sourceStatus })) return null;
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const upcomingSlots = dedupeCatalogSlotsByClock(
    parseUpcomingSlots(row.upcomingSlots)
      .filter(hasSlotStart)
      .filter((slot) => isFutureSlotStart(slot.startsAt))
      .filter((slot) => !isPublicSalesStatusBlocked(slot.sourceStatus))
      .map((slot) => {
        const sourceCode = slot.sourceCode || slot.offerSourceCode || row.sourceCode || row.offerSourceCode;
        const slotExternalId = resolveSessionPurchaseExternalId({
          sourceCode,
          providerSessionId: slot.providerSessionId || slot.externalId,
          providerEventId: slot.providerEventId,
          fallbackEventId: row.externalId,
        });
        const slotPurchase = purchaseInfo({
          sourceCode,
          offerSourceCode: slot.offerSourceCode || row.offerSourceCode,
          offerWidgetUrl: slot.offerWidgetUrl,
          offerDeeplinkUrl: slot.offerDeeplinkUrl,
          externalId: slotExternalId,
        });
        const startsAt = toIsoString(slot.startsAt);
        return {
          ...(slot.id ? { id: slot.id } : {}),
          ...(slot.eventId ? { eventId: slot.eventId } : {}),
          startsAt,
          dateLabel: formatDate(startsAt, timeZone),
          timeLabel: formatTime(startsAt, timeZone),
          timeBucket: timeBucket(startsAt, timeZone),
          timeZone,
          purchaseUrl: slotPurchase.url || purchaseUrl,
        };
      })
      .sort(
        (left, right) =>
          parseSessionStartsAt(left.startsAt).getTime() - parseSessionStartsAt(right.startsAt).getTime(),
      ),
    timeZone,
  ).slice(0, 8);

  const openDate = isOpenDateCatalogRow(row);
  // Primary must share the same instant path as upcomingSlots (jsonb strings vs SQL Date
  // used to diverge when Date-only got prismaWallTime −3h). Prefer earliest unique slot.
  const primarySlot = upcomingSlots[0];
  const startsAt =
    openDate || !row.startsAt
      ? ''
      : primarySlot?.startsAt || toIsoString(row.startsAt);
  const groupEventIds = (row.groupEventIds || [row.id]).slice(0, 12);
  const manualLandingStatus = groupEventIds.some((id) => pinnedEventIds.has(id)) ? 'PINNED' : null;
  const session: PublicSessionDto = {
    id: row.id,
    slug: publicSlug(row.slug),
    sourceSlug: row.slug,
    groupKey: row.groupKey,
    groupEventIds,
    groupedEventsCount: row.groupedEventsCount || 1,
    sessionCount: row.sessionCount || upcomingSlots.length || 1,
    upcomingSlots,
    landingSlugs: [],
    title: formatPublicEventTitle(row.overrideTitle || row.title),
    cityId: row.cityId,
    citySlug: destination.slug,
    sourceCitySlug: row.citySlug,
    city: cityName,
    destination: destination.name,
    destinationType: destination.type,
    timeZone,
    venueId: row.venueId,
    venueSlug: row.venueSlug,
    venue: row.venue || 'Не указано',
    venueKind: row.venueKind || 'OTHER',
    offerTitle: row.offerTitle,
    offerSourceCode: row.offerSourceCode,
    purchaseUrl,
    widgetUrl: row.offerWidgetUrl || fallbackWidgetUrl,
    deeplinkUrl: row.offerDeeplinkUrl,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    category: row.category || 'unknown',
    subcategories,
    tags: tags.slice(0, 4),
    kind: row.kind || null,
    sourceStatus: row.sourceStatus || null,
    ageLimit: row.ageLimit ?? null,
    description: cleanImportedDescription(row.overrideDescription || row.description || row.overrideShortDescription),
    startsAt,
    dateLabel: openDate
      ? 'Открытая дата'
      : primarySlot?.dateLabel || formatDate(startsAt, timeZone),
    timeLabel: openDate
      ? 'В виджете'
      : primarySlot?.timeLabel || formatTime(startsAt, timeZone),
    timeBucket: openDate
      ? 'day'
      : primarySlot?.timeBucket || timeBucket(startsAt, timeZone),
    priceFrom: row.priceFrom,
    priceTo: row.priceTo ?? row.priceFrom,
    vacant: row.vacant,
    imageUrl: resolvePublicSessionImageUrl(row),
  };

  session.landingSlugs = matchingLandingSlugs({
    title: session.title,
    category: session.category,
    sourceCategory: session.category,
    tags,
    subcategories,
    venue: session.venue,
    city: session.city,
    destination: session.destination,
    startsAt: session.startsAt,
    upcomingSlots,
  });
  session.manualLandingStatus = manualLandingStatus;
  return session;
}

export function pickCatalogSubcategories(
  session: {
    category?: string | null;
    sourceCategory?: string | null;
    subcategories?: string[];
    tags?: string[];
    title?: string | null;
    venue?: string | null;
  },
  limit = 4,
): string[] {
  const category = session.category || session.sourceCategory || '';
  const transport = resolveCatalogTransportHint(session);
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const label of [...(session.subcategories || []), ...(session.tags || [])]) {
    const value = String(label || '').trim();
    if (!isCatalogSubcategoryLabel(value, category) || seen.has(value)) continue;
    if (isConflictingTransportCatalogLabel(value, transport)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) break;
  }
  return labels;
}

const WATER_CATALOG_HINT_RE =
  /(водн(?:ые|ая)?\s+экскурси|речн(?:ая|ые)?|реч(?:ной|ная)\s+порт|теплоход|катер|яхт|лодк|причал|речные\s+прогулки)/i;
const BUS_CATALOG_LABEL_RE = /автобус/i;

type CatalogTransportHint = 'water' | 'bus';

function resolveCatalogTransportHint(
  session: { title?: string | null; venue?: string | null; subcategories?: string[]; tags?: string[] },
): CatalogTransportHint | null {
  const haystack = [
    session.title,
    session.venue,
    ...(session.subcategories || []),
    ...(session.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (WATER_CATALOG_HINT_RE.test(haystack)) return 'water';
  if (BUS_CATALOG_LABEL_RE.test(haystack)) return 'bus';
  return null;
}

function isConflictingTransportCatalogLabel(label: string, transport: CatalogTransportHint | null): boolean {
  if (!transport) return false;
  const lower = label.toLowerCase();
  if (transport === 'water') return BUS_CATALOG_LABEL_RE.test(lower);
  if (transport === 'bus') return WATER_CATALOG_HINT_RE.test(lower);
  return false;
}

function isCatalogSubcategoryLabel(label: string, category: string): boolean {
  if (!label || isUtilityCatalogTag(label) || isVenuePolicyCatalogTag(label) || isAmenityCatalogTag(label)) return false;
  return !category || label.toLowerCase() !== category.toLowerCase();
}

function isUtilityCatalogTag(tag: string): boolean {
  const value = tag.trim();
  const lower = value.toLowerCase();
  if (!value) return true;
  if (/^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|кафе-бар|парковка|гардероб|кондиционирование)$/i.test(lower)) return true;
  if (/^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i.test(lower)) return true;
  if (/^(теплоход|катер|яхт|судно|лодк)\s*:/i.test(lower)) return true;
  if (/^площадка\s*:/i.test(lower) || /^причал\b/i.test(lower)) return true;
  return value.length > 42;
}

function isVenuePolicyCatalogTag(tag: string): boolean {
  const lower = tag.trim().toLowerCase();
  if (!lower) return true;
  if (/^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i.test(lower)) return true;
  return (/отдельн/i.test(lower) && /столик/i.test(lower)) ||
    /коляск|велосипед|животн|сво[ейё]м?\s+алкогол|сво[ейё]й?\s+ед/i.test(lower);
}

function isAmenityCatalogTag(tag: string): boolean {
  const lower = tag.trim().toLowerCase();
  if (!lower) return false;
  return /^(ресторан[-\s]?бар|отопление|экскурсовод|аудиогид)$/i.test(lower) ||
    /тё?плые?\s+плед|^панорамн|детск(ие|ая)\s+стуль|^с\s+(обедом|ужином|питанием)|^ледовый\s+класс/i.test(lower);
}

function publicDestinationForCity(row: PublicCatalogMappingRow): PublicDestination | null {
  const cityName = cleanDisplayName(row.city) || 'Не указан';
  if (isForeignPublicCity(cityName)) return null;

  const mappedRegion = cityToRegion.get(cityName);
  if (mappedRegion && !standaloneCityNames.has(cityName)) {
    // Fold into standalone city when mapped target is itself a public city (Зеленоград→Москва).
    if (standaloneCityNames.has(mappedRegion)) {
      const slug = publicSlug(mappedRegion);
      return {
        id: row.cityId || `city_${slug}`,
        slug,
        sourceSlug: row.citySlug || slug,
        name: mappedRegion,
        type: 'city',
      };
    }
    const slug = publicSlug(mappedRegion);
    return {
      id: row.regionId || `region_${slug}`,
      slug,
      sourceSlug: row.regionSlug || slug,
      name: mappedRegion,
      type: 'region',
    };
  }

  if (row.cityIsDestination === false && row.regionTitle) {
    const slug = publicSlug(row.regionTitle);
    return {
      id: row.regionId || `region_${slug}`,
      slug,
      sourceSlug: row.regionSlug || slug,
      name: row.regionTitle,
      type: 'region',
    };
  }

  const slug = publicSlug(cityName);
  return {
    id: row.cityId || `city_${slug}`,
    slug,
    sourceSlug: row.citySlug || slug,
    name: cityName,
    type: 'city',
  };
}

function resolvePublicSessionCity(row: PublicCatalogMappingRow): string {
  const city = cleanDisplayName(row.city);
  if (city && city !== 'Не указан') return city;
  const haystack = [row.title, row.venue, ...(row.tags || [])].filter(Boolean).join(' ').toLowerCase();
  for (const candidate of knownSessionCities) {
    const normalized = candidate.toLowerCase();
    if (haystack.includes(normalized) || haystack.includes(cityNameStem(candidate))) return candidate;
  }
  return city || 'Не указан';
}

function cityNameStem(city: string): string {
  const compact = city.toLowerCase().replace(/[^а-яё]/g, '');
  if (compact.length <= 5) return compact;
  return compact.slice(0, Math.max(5, compact.length - 2));
}

function resolvePublicSessionImageUrl(row: PublicCatalogMappingRow): string | null {
  const editorial = resolveEditorialEventImage(row.id, row.slug, null);
  if (editorial) return editorial;

  const direct = pickFirstUsableEventImageUrl(row.overrideImageUrl, row.imageUrl, row.venueHeroImageUrl, row.cityHeroImageUrl);
  if (direct) return direct;

  const slug = row.citySlug;
  if (!slug) return null;
  const imageSlug = cityImageAliases[slug] || slug;
  return cityImageSlugs.has(imageSlug) ? `/images/cities/${imageSlug}.png` : null;
}

function cleanImportedDescription(value?: string | null): string | null {
  const cleaned = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return cleaned || null;
}

function parseUpcomingSlots(value: unknown): PublicCatalogSlotRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((slot): slot is PublicCatalogSlotRow => Boolean(slot && typeof slot === 'object'));
}

function hasSlotStart(
  slot: PublicCatalogSlotRow,
): slot is PublicCatalogSlotRow & { startsAt: string | Date } {
  return Boolean(slot.startsAt);
}

function cleanDisplayName(value?: string | null): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatDate(value: string | Date, timeZone: string): string {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone,
  }).format(date);
}

function formatTime(value: string | Date, timeZone: string): string {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

function timeBucket(value: string | Date, timeZone: string): TimeBucket {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return 'day';
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour');
  const hour = Number(hourPart?.value);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

/**
 * One clock for SQL Date and jsonb string slots.
 * Do NOT apply prismaWallTime only to Date: that made primary −3h vs upcomingSlots
 * (e.g. bridges main 20:55 / chips 23:55 for the same sailing).
 */
function toIsoString(value: string | Date): string {
  return normalizeStartsAt(value) || '';
}

function catalogSlotClockKey(startsAt: string, timeZone: string): string {
  const date = parseSessionStartsAt(startsAt);
  if (!Number.isFinite(date.getTime())) return startsAt;
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const time = formatTime(startsAt, timeZone);
  return `${day}|${time}`;
}

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Drop same-eventId sessions that are exactly −3h before another session
 * (legacy wall-shift duplicate: 17:55Z phantom next to real 20:55Z = 23:55 MSK).
 * Different eventIds 3h apart (real 12:00 / 15:00 sailings) are kept.
 */
function dropMinus3hSameEventPhantoms<T extends { startsAt: string; eventId?: string | null }>(
  slots: T[],
): T[] {
  const byEvent = new Map<string, number[]>();
  for (const slot of slots) {
    const eventId = String(slot.eventId || '').trim();
    if (!eventId) continue;
    const ms = parseSessionStartsAt(slot.startsAt).getTime();
    if (!Number.isFinite(ms)) continue;
    const bucket = byEvent.get(eventId) || [];
    bucket.push(ms);
    byEvent.set(eventId, bucket);
  }
  return slots.filter((slot) => {
    const eventId = String(slot.eventId || '').trim();
    if (!eventId) return true;
    const ms = parseSessionStartsAt(slot.startsAt).getTime();
    if (!Number.isFinite(ms)) return true;
    const siblings = byEvent.get(eventId) || [];
    return !siblings.some((other) => other === ms + MSK_OFFSET_MS);
  });
}

function dedupeCatalogSlotsByClock<T extends { startsAt: string; eventId?: string | null }>(
  slots: T[],
  timeZone: string,
): T[] {
  const cleaned = dropMinus3hSameEventPhantoms(slots);
  const seen = new Set<string>();
  const out: T[] = [];
  for (const slot of cleaned) {
    const key = catalogSlotClockKey(slot.startsAt, timeZone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(slot);
  }
  return out;
}

function publicSlug(value?: string | null): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => letters[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
