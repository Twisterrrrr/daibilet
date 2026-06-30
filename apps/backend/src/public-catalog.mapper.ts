import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchingLandingSlugs } from './landing-rules.js';
import type { DestinationType, PurchaseMode, PurchaseProvider, PurchaseUrlSource, TimeBucket } from './types/common.js';
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
  kind: string;
  imageUrl: string | null;
  category: string | null;
  cityId: string | null;
  city: string | null;
  citySlug: string | null;
  cityIsDestination: boolean | null;
  regionId: string | null;
  regionSlug: string | null;
  regionTitle: string | null;
  venueId: string | null;
  venueSlug: string | null;
  venue: string | null;
  venueKind: string | null;
  overrideTitle: string | null;
  overrideImageUrl: string | null;
  offerSourceCode: string | null;
  offerTitle: string | null;
  offerPriceRub: number | null;
  offerWidgetUrl: string | null;
  offerDeeplinkUrl: string | null;
  startsAt: string | Date;
  tags: string[];
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

interface PurchaseInfo {
  ready: boolean;
  mode: PurchaseMode | null;
  provider: PurchaseProvider | null;
  urlSource: PurchaseUrlSource | null;
  url: string | null;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cityRouting = loadCityRouting();
const standaloneCityNames = new Set(cityRouting.standaloneCities || []);
const cityToRegion = new Map(Object.entries(cityRouting.cityToRegion || {}));

export function mapGroupedPublicSession(row: PublicCatalogMappingRow): PublicSessionDto {
  const tags = row.tags || [];
  const destination = publicDestinationForCity(row);
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const upcomingSlots = parseUpcomingSlots(row.upcomingSlots)
    .filter(hasSlotStart)
    .slice(0, 8)
    .map((slot) => {
      const sourceCode = slot.sourceCode || slot.offerSourceCode || row.sourceCode || row.offerSourceCode;
      const provider = providerForSource(sourceCode);
      const slotExternalId = provider === 'TEPLOHOD'
        ? slot.providerEventId || row.externalId
        : slot.providerSessionId || slot.externalId || slot.providerEventId || row.externalId;
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

  const startsAt = toIsoString(row.startsAt);
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
    city: row.city || 'Не указан',
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
    tags: tags.slice(0, 4),
    startsAt,
    dateLabel: formatDate(startsAt),
    timeLabel: formatTime(startsAt),
    timeBucket: timeBucket(startsAt),
    priceFrom: row.priceFrom,
    vacant: row.vacant,
    imageUrl: row.overrideImageUrl || row.imageUrl,
  };

  session.landingSlugs = matchingLandingSlugs({
    title: session.title,
    category: session.category,
    sourceCategory: session.category,
    tags: session.tags,
    venue: session.venue,
    city: session.city,
    destination: session.destination,
  });
  return session;
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

function purchaseInfo(row: {
  sourceCode?: string | null | undefined;
  offerSourceCode?: string | null | undefined;
  offerWidgetUrl?: string | null | undefined;
  offerDeeplinkUrl?: string | null | undefined;
  externalId?: string | null | undefined;
}): PurchaseInfo {
  const sourceCode = row.sourceCode || row.offerSourceCode;
  const provider = providerForSource(sourceCode);
  const explicitUrl = row.offerWidgetUrl || row.offerDeeplinkUrl || null;
  const fallbackUrl = buildProviderWidgetUrl({ ...row, offerSourceCode: sourceCode });
  const url = explicitUrl || fallbackUrl || null;
  return {
    ready: Boolean(url),
    mode: provider ? 'widget' : url ? 'redirect' : null,
    provider,
    urlSource: explicitUrl ? 'offer' : fallbackUrl ? 'fallback' : null,
    url,
  };
}

function buildProviderWidgetUrl(row: {
  sourceCode?: string | null | undefined;
  offerSourceCode?: string | null | undefined;
  offerDeeplinkUrl?: string | null | undefined;
  externalId?: string | null | undefined;
}): string | null {
  const provider = providerForSource(row.sourceCode || row.offerSourceCode);
  if (provider === 'TEPLOHOD') {
    return row.offerDeeplinkUrl || buildTeplohodUrl(row.externalId);
  }
  if (provider === 'TICKETSCLOUD') return buildTicketscloudWidgetUrl(row.externalId);
  return null;
}

function providerForSource(sourceCode?: string | null): PurchaseProvider | null {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'TICKETSCLOUD';
  return null;
}

function buildTicketscloudWidgetUrl(eventExternalId?: string | null): string | null {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;
  const normalizedToken = token.startsWith('r:') ? token : `r:${token}`;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.org/v1/widgets/common');
  url.searchParams.set('token', normalizedToken);
  url.searchParams.set('event', eventExternalId);
  return url.toString();
}

function buildTeplohodUrl(eventExternalId?: string | null): string | null {
  if (!eventExternalId) return null;
  const baseUrl = process.env.TEP_WIDGET_BASE_URL || 'https://teplohod.info';
  return `${baseUrl.replace(/\/+$/, '')}/event/${encodeURIComponent(eventExternalId)}`;
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
  if (value instanceof Date) return value.toISOString();
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
