import { MIN_DISPLAY_PRICE_RUB, isOpenDateCatalogRow, isPublicSalesStatusBlocked } from './catalog-availability.js';
import { formatPublicEventTitle } from './event-title-normalize.ts';
import type { PublicSessionDto } from './types/public.js';

type CatalogSlot = NonNullable<PublicSessionDto['upcomingSlots']>[number] & {
  eventId?: string | null;
  sourceStatus?: string | null;
  purchaseReady?: boolean | null;
  vacant?: number | null;
};

const KNOWN_PIER_ADDRESS_PATTERNS = [
  { key: 'sinopskaya-10', test: (text: string) => /синопск/.test(text) && /\b10\b/.test(text) },
  { key: 'fontanka-53', test: (text: string) => /фонтанк/.test(text) && /\b53\b/.test(text) },
];

export function sessionHasCoverImage(session: Pick<PublicSessionDto, 'imageUrl'>): boolean {
  const url = String(session?.imageUrl || '').trim();
  if (!url) return false;
  if (url.startsWith('/images/cities/')) return false;
  return true;
}

export function regroupMappedPublicCatalogSessions(sessions: PublicSessionDto[]): PublicSessionDto[] {
  const groups = new Map<string, PublicSessionDto>();

  for (const session of sessions) {
    const key = session.groupKey;
    if (!key) {
      groups.set(`id:${session.id}`, session);
      continue;
    }

    const slotFromSession: CatalogSlot | null = session.startsAt
      ? {
          eventId: session.id,
          startsAt: session.startsAt,
          dateLabel: session.dateLabel,
          timeLabel: session.timeLabel,
          purchaseUrl: session.purchaseUrl ?? null,
          sourceStatus: session.sourceStatus || null,
          vacant: session.vacant ?? null,
          ...(session.purchaseReady === undefined ? {} : { purchaseReady: session.purchaseReady }),
        }
      : null;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...session,
        groupEventIds: uniqueValues(session.groupEventIds || [session.id]),
        groupedEventsCount: session.groupedEventsCount || 1,
        sessionCount: session.sessionCount || (slotFromSession ? 1 : 0),
        upcomingSlots: uniqueSlots(
          [...(session.upcomingSlots || []), ...(slotFromSession ? [slotFromSession] : [])],
        ),
      });
      continue;
    }

    current.groupEventIds = uniqueValues([...(current.groupEventIds || []), ...(session.groupEventIds || [session.id])]);
    current.groupedEventsCount = current.groupEventIds.length;
    current.sessionCount = (current.sessionCount || 0) + (session.sessionCount || (slotFromSession ? 1 : 0));
    current.upcomingSlots = uniqueSlots([
      ...(current.upcomingSlots || []),
      ...(session.upcomingSlots || []),
      ...(slotFromSession ? [slotFromSession] : []),
    ]);
    current.priceFrom = minNullableNumber([current.priceFrom, session.priceFrom]);
    current.priceTo = maxNullableNumber([current.priceTo, session.priceTo, session.priceFrom]);
    current.vacant = sumNullableNumbers([current.vacant, session.vacant]);
    current.tags = uniqueValues([...(current.tags || []), ...(session.tags || [])]);
    current.title = mergeCatalogDisplayTitle(current.title, session.title, current.venue || session.venue);
    if (session.manualLandingStatus === 'PINNED') current.manualLandingStatus = 'PINNED';

    if (shouldPromoteGroupedRepresentative(current, session)) {
      const merged = {
        groupKey: key,
        groupEventIds: current.groupEventIds,
        groupedEventsCount: current.groupedEventsCount,
        sessionCount: current.sessionCount,
        upcomingSlots: current.upcomingSlots,
        priceFrom: current.priceFrom,
        priceTo: current.priceTo,
        vacant: current.vacant,
        tags: current.tags,
        manualLandingStatus: current.manualLandingStatus,
      };
      Object.assign(current, session, merged);
    }
  }

  return Array.from(groups.values())
    .map((session) => ({
      ...session,
      title: resolveCatalogDisplayTitle(session.title, session.venue),
      groupedEventsCount: session.groupEventIds?.length || session.groupedEventsCount || 1,
      sessionCount: session.sessionCount || session.upcomingSlots?.length || 1,
      upcomingSlots: uniqueSlots(session.upcomingSlots || []).sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ),
    }))
    .sort((left, right) => {
      const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY;
      return leftTime - rightTime || String(left.title).localeCompare(String(right.title), 'ru');
    });
}

export function dedupeCrossSourceCatalogSessions(sessions: PublicSessionDto[]): PublicSessionDto[] {
  const passthrough: PublicSessionDto[] = [];
  const pierSessions: PublicSessionDto[] = [];

  for (const session of sessions || []) {
    if (isWidgetProviderSession(session) && canonicalSessionPierKey(session)) {
      pierSessions.push(session);
    } else {
      passthrough.push(session);
    }
  }

  const used = new Set<number>();
  const merged: PublicSessionDto[] = [];

  for (let index = 0; index < pierSessions.length; index += 1) {
    if (used.has(index)) continue;

    let current = pierSessions[index];
    if (!current) continue;
    used.add(index);
    const pierKey = canonicalSessionPierKey(current);

    for (let otherIndex = index + 1; otherIndex < pierSessions.length; otherIndex += 1) {
      if (used.has(otherIndex)) continue;
      const other = pierSessions[otherIndex];
      if (!other) continue;
      if (canonicalSessionPierKey(other) !== pierKey) continue;
      if (sessionWidgetProvider(current) === sessionWidgetProvider(other)) continue;
      if (!crossSourceTitlesMatch(current.title, other.title)) continue;
      current = mergeCrossSourceSessions(current, other);
      used.add(otherIndex);
    }

    merged.push(current);
  }

  return passthrough.concat(merged);
}

export function normalizeGroupPart(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resolveCatalogDisplayTitle(rawTitle?: string | null, venue?: string | null): string {
  const normalized = normalizeCatalogGroupTitle(rawTitle);
  if (normalized.length >= 3 && !isDateLikeCatalogTitle(normalized)) {
    return formatPublicEventTitle(normalized);
  }

  const cleanRaw = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  if (cleanRaw && !isDateLikeCatalogTitle(cleanRaw)) return formatPublicEventTitle(cleanRaw);

  const venueTitle = formatPublicVenueTitle(venue) || String(venue || '').trim();
  if (venueTitle && venueTitle !== 'Не указано') return formatPublicEventTitle(venueTitle);

  return formatPublicEventTitle(cleanRaw || 'Событие');
}

export function shouldPromoteGroupedRepresentative(
  current: PublicSessionDto,
  candidate: PublicSessionDto,
): boolean {
  if (!candidate?.startsAt) return false;
  const currentBlocked = isPublicSessionPurchaseBlocked(current);
  const candidateBlocked = isPublicSessionPurchaseBlocked(candidate);
  if (currentBlocked && !candidateBlocked) return true;
  if (!currentBlocked && candidateBlocked) return false;
  if (!current.startsAt) return true;
  return new Date(candidate.startsAt) < new Date(current.startsAt);
}

export function isPublicSessionPurchaseBlocked(session: PublicSessionDto): boolean {
  const statuses = [session.sourceStatus].map((value) => String(value || '').toLowerCase());
  if (!session.startsAt && !isOpenDateCatalogRow(session)) return true;
  if (statuses.some((status) => isPublicSalesStatusBlocked(status))) {
    return true;
  }
  if (session.purchaseReady === false) return true;
  const purchaseUrl = session.purchaseUrl || session.widgetUrl || null;
  const provider = String(session.purchaseProvider || session.offerSourceCode || '').toUpperCase();
  if (
    (provider.includes('TEPLOHOD') || provider.includes('TEP') || String(purchaseUrl).includes('teplohod.info')) &&
    purchaseUrl
  ) {
    return false;
  }
  if (session.vacant === 0) return true;
  return false;
}

export function canonicalSessionPierKey(session: Pick<PublicSessionDto, 'venue' | 'venueAddress'>): string | null {
  return canonicalPierLocationKey(session.venue, session.venueAddress);
}

export function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function minNullableNumber(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number =>
    Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB,
  );
  return numbers.length ? Math.min(...numbers) : null;
}

export function maxNullableNumber(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number =>
    Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB,
  );
  return numbers.length ? Math.max(...numbers) : null;
}

export function sumNullableNumbers(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

export function uniqueSlots(slots: CatalogSlot[]): CatalogSlot[] {
  const seen = new Set<string>();
  const result: CatalogSlot[] = [];
  for (const slot of slots || []) {
    const key = `${slot.startsAt || ''}|${slot.eventId || ''}`;
    if (!slot.startsAt || seen.has(key)) continue;
    seen.add(key);
    result.push(slot);
  }
  return result;
}

function mergeCatalogDisplayTitle(
  currentTitle?: string | null,
  candidateTitle?: string | null,
  venue?: string | null,
): string {
  const candidates = [currentTitle, candidateTitle].filter(Boolean);
  for (const raw of candidates) {
    const normalized = normalizeCatalogGroupTitle(raw);
    if (normalized.length >= 3 && !isDateLikeCatalogTitle(normalized)) {
      return formatPublicEventTitle(normalized);
    }
  }
  for (const raw of candidates) {
    if (raw && !isDateLikeCatalogTitle(raw)) return formatPublicEventTitle(String(raw).trim());
  }
  return resolveCatalogDisplayTitle(candidates[0], venue);
}

function sessionWidgetProvider(session: PublicSessionDto): 'TEPLOHOD' | 'TICKETSCLOUD' | null {
  const code = String(session.offerSourceCode || session.purchaseProvider || '').toUpperCase();
  if (code.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (code.includes('TICKETSCLOUD') || code === 'TC') return 'TICKETSCLOUD';
  const url = String(session.purchaseUrl || '').toLowerCase();
  if (url.includes('teplohod.info')) return 'TEPLOHOD';
  if (url.includes('ticketscloud')) return 'TICKETSCLOUD';
  const groupKey = String(session.groupKey || '').toLowerCase();
  if (groupKey.startsWith('teplohod')) return 'TEPLOHOD';
  if (groupKey.startsWith('ticketscloud')) return 'TICKETSCLOUD';
  return null;
}

function isWidgetProviderSession(session: PublicSessionDto): boolean {
  return sessionWidgetProvider(session) != null;
}

function canonicalPierLocationKey(name?: string | null, address?: string | null): string | null {
  const text = normalizeVenueTextKey(`${name || ''} ${address || ''}`);
  if (!text) return null;

  for (const pattern of KNOWN_PIER_ADDRESS_PATTERNS) {
    if (pattern.test(text)) return pattern.key;
  }

  if (/причал|набереж/.test(text)) {
    const addressKey = canonicalVenueAddressKey(name, address);
    if (addressKey.length >= 8) return `pier|${addressKey}`;
  }

  return null;
}

function normalizeCrossSourceTourTitle(title?: string | null): string {
  const text = String(title || '')
    .toLowerCase()
    .replace(/[«»"'“”]/g, ' ')
    .replace(
      /^(?:(?:обзорная|ночная|утренняя|авторская|детская|вечерняя)\s+)?(?:экскурсия|развлекательно\s*-\s*познавательная\s+программа)\s+/i,
      '',
    )
    .replace(/\s+с\s+гидом\b/g, '')
    .replace(/,\s*или\s+.+/g, '')
    .replace(/\s+\d+\+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalizeVenueTextKey(text);
}

function crossSourceTitlesMatch(leftTitle?: string | null, rightTitle?: string | null): boolean {
  const left = normalizeCrossSourceTourTitle(leftTitle);
  const right = normalizeCrossSourceTourTitle(rightTitle);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(' ').filter((token) => token.length > 3));
  const rightTokens = new Set(right.split(' ').filter((token) => token.length > 3));
  if (!leftTokens.size || !rightTokens.size) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const minSize = Math.min(leftTokens.size, rightTokens.size);
  return overlap >= 2 && overlap / minSize >= 0.6;
}

function crossSourceProviderScore(session: PublicSessionDto): number {
  let score = 0;
  if (sessionWidgetProvider(session) === 'TEPLOHOD') score += 100;
  if (sessionWidgetProvider(session) === 'TICKETSCLOUD') score += 10;
  if (session.purchaseReady !== false) score += 50;
  if ((session.upcomingSlots || []).length > 0) score += 5;
  if (session.imageUrl) score += 3;
  if (session.manualLandingStatus === 'PINNED') score += 1000;
  if (!isPublicSessionPurchaseBlocked(session)) score += 20;
  return score;
}

function preferCrossSourceRepresentative(current: PublicSessionDto, candidate: PublicSessionDto): boolean {
  return crossSourceProviderScore(candidate) > crossSourceProviderScore(current);
}

function publicCrossSourceCatalogKey(session: PublicSessionDto): string {
  const city = normalizeGroupPart(resolveMappedSessionCity(session));
  const pier = canonicalSessionPierKey(session) || normalizeGroupPart(session.venue);
  const title = normalizeCrossSourceTourTitle(session.title);
  return `${city}|${pier}|${title}`;
}

function mergeCrossSourceSessions(current: PublicSessionDto, candidate: PublicSessionDto): PublicSessionDto {
  const winner = preferCrossSourceRepresentative(current, candidate) ? candidate : current;
  const mergedGroupEventIds = uniqueValues(sessionGroupIds(current).concat(sessionGroupIds(candidate)));

  return {
    ...winner,
    groupKey: publicCrossSourceCatalogKey(winner),
    groupEventIds: mergedGroupEventIds,
    groupedEventsCount: mergedGroupEventIds.length,
    priceFrom: minNullableNumber([current.priceFrom, candidate.priceFrom]),
    priceTo: maxNullableNumber([current.priceTo, candidate.priceTo, current.priceFrom, candidate.priceFrom]),
    vacant: sumNullableNumbers([current.vacant, candidate.vacant]),
    manualLandingStatus:
      current.manualLandingStatus === 'PINNED' || candidate.manualLandingStatus === 'PINNED' ? 'PINNED' : null,
  };
}

function sessionGroupIds(session: PublicSessionDto): string[] {
  return uniqueValues([session.id, ...(session.groupEventIds || [])]);
}

export { sessionGroupIds };

function resolveMappedSessionCity(session: Pick<PublicSessionDto, 'city' | 'destination'>): string {
  return String(session.city || session.destination || 'Не указан').trim();
}

function isDateLikeCatalogTitle(title?: string | null): boolean {
  const text = String(title || '').trim();
  if (!text) return true;
  if (/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?/u.test(text)) return true;
  if (/^\d{1,2}:\d{2}/u.test(text)) return true;
  return false;
}

function normalizeCatalogGroupTitle(rawTitle?: string | null): string {
  let text = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  text = text
    .replace(
      /^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?(?:\s*(?:,\s*|\s+в\s+))?\d{1,2}:\d{2}(?:\s*(?:\([^)]{2,40}\))?)?(?:\s*[-–—]\s*)?/iu,
      '',
    )
    .trim();
  text = text.replace(/\s*\([^)]{2,40}\)\s*$/u, '').trim();
  text = text.replace(/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?(?:\s*,\s*)?/u, '').trim();

  return text;
}

function formatPublicVenueTitle(value?: string | null): string | null {
  if (value == null) return null;
  return String(value)
    .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
    .trim();
}

function normalizeVenueTextKey(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVenueAddressMergeKey(value?: string | null): string {
  return normalizeVenueTextKey(value)
    .replace(/(\d)\s+([a-zа-я])/gi, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalVenueAddressKey(name?: string | null, address?: string | null): string {
  const titlePart = normalizeVenueTextKey(formatPublicVenueTitle(name) || name || '');
  const addressPart = normalizeVenueAddressMergeKey(address || '');
  let text = `${titlePart} ${addressPart}`
    .replace(/(?:^|\s)причал(?:\s|$)/g, ' ')
    .replace(/(?:^|\s)наб(?:\s|$)/g, ' набережная ')
    .replace(/(?:^|\s)ул(?:\s|$)/g, ' улица ')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.replace(/(\d)\s+([a-zа-я])/gi, '$1$2');
  return text;
}
