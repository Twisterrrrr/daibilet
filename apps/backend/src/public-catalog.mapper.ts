import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchingLandingSlugs } from './landing-rules.js';
import {
  buildProviderWidgetUrl,
  providerForSource,
  purchaseInfo,
  resolveSessionPurchaseExternalId,
} from './provider-purchase.js';
import { prismaWallTimeToIso } from './public-datetime.js';
import type { DestinationType, TimeBucket } from './types/common.js';
import type { PublicSessionDto } from './types/public.js';

export interface PublicCatalogSlotRow {
  id?: string | null;
  eventId?: string | null;
  startsAt?: string | Date | null;
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
  vacant: number | null;
  upcomingSlots: unknown;
}

interface CityRoutingConfig {
  standaloneCities?: string[];
  cityToRegion?: Record<string, string>;
}

interface PublicDestination {
  id: string;
  slug: string;
  sourceSlug: string;
  name: string;
  type: DestinationType;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cityRouting = loadCityRouting();
const standaloneCityNames = new Set(cityRouting.standaloneCities || []);
const cityToRegion = new Map(Object.entries(cityRouting.cityToRegion || {}));
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

export function mapGroupedPublicSession(row: PublicCatalogMappingRow): PublicSessionDto {
  const tags = row.tags || [];
  const subcategories = pickCatalogSubcategories({
    category: row.category,
    subcategories: row.subcategories,
    tags,
  });
  const cityName = resolvePublicSessionCity(row);
  const destination = publicDestinationForCity({ ...row, city: cityName });
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const upcomingSlots = parseUpcomingSlots(row.upcomingSlots)
    .filter(hasSlotStart)
    .slice(0, 8)
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
        dateLabel: formatDate(startsAt),
        timeLabel: formatTime(startsAt),
        timeBucket: timeBucket(startsAt),
        purchaseUrl: slotPurchase.url || purchaseUrl,
      };
    });

  const openDate = isOpenDateCatalogRow(row);
  const startsAt = openDate || !row.startsAt ? '' : toIsoString(row.startsAt);
  const session: PublicSessionDto = {
    id: row.id,
    slug: publicSlug(row.slug),
    sourceSlug: row.slug,
    groupKey: row.groupKey,
    groupEventIds: (row.groupEventIds || [row.id]).slice(0, 12),
    groupedEventsCount: row.groupedEventsCount || 1,
    sessionCount: row.sessionCount || upcomingSlots.length || 1,
    upcomingSlots,
    landingSlugs: [],
    title: row.overrideTitle || row.title,
    cityId: row.cityId,
    citySlug: destination.slug,
    sourceCitySlug: row.citySlug,
    city: cityName,
    destination: destination.name,
    destinationType: destination.type,
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
    description: cleanImportedDescription(row.overrideDescription || row.description || row.overrideShortDescription),
    startsAt,
    dateLabel: openDate ? 'Открытая дата' : formatDate(startsAt),
    timeLabel: openDate ? 'В виджете' : formatTime(startsAt),
    timeBucket: openDate ? 'day' : timeBucket(startsAt),
    priceFrom: row.priceFrom,
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
  return session;
}

export function pickCatalogSubcategories(
  session: { category?: string | null; sourceCategory?: string | null; subcategories?: string[]; tags?: string[] },
  limit = 4,
): string[] {
  const category = session.category || session.sourceCategory || '';
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const label of [...(session.subcategories || []), ...(session.tags || [])]) {
    const value = String(label || '').trim();
    if (!isCatalogSubcategoryLabel(value, category) || seen.has(value)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) break;
  }
  return labels;
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

function loadCityRouting(): CityRoutingConfig {
  try {
    return JSON.parse(
      readFileSync(path.join(projectRoot, 'data', 'geo', 'city-routing.ru.json'), 'utf8'),
    ) as CityRoutingConfig;
  } catch {
    return {};
  }
}

function publicDestinationForCity(row: PublicCatalogMappingRow): PublicDestination {
  const cityName = cleanDisplayName(row.city) || 'Не указан';
  const mappedRegion = cityToRegion.get(cityName);
  if (mappedRegion && !standaloneCityNames.has(cityName)) {
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

function isOpenDateCatalogRow(row: Pick<PublicCatalogMappingRow, 'kind' | 'sourceStatus'>): boolean {
  return row.kind.toUpperCase() === 'OPEN_DATE' || String(row.sourceStatus || '').toLowerCase() === 'open_date';
}

function resolvePublicSessionImageUrl(row: PublicCatalogMappingRow): string | null {
  if (row.overrideImageUrl) return row.overrideImageUrl;
  if (row.imageUrl) return row.imageUrl;
  if (row.venueHeroImageUrl) return row.venueHeroImageUrl;
  if (row.cityHeroImageUrl) return row.cityHeroImageUrl;
  const slug = row.citySlug;
  if (!slug) return null;
  const imageSlug = cityImageAliases[slug] || slug;
  return cityImageSlugs.has(imageSlug) ? `/images/cities/${imageSlug}.png` : null;
}

function cleanImportedDescription(value?: string | null): string | null {
  const cleaned = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
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

function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' }).format(date);
}

function formatTime(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function timeBucket(value: string | Date): TimeBucket {
  const hour = new Date(value).getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return prismaWallTimeToIso(value) || '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
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
