import { formatNumber } from '@/lib/format';
import { formatSessionTime, isSameSessionDay, parseSessionStartsAt, resolveSessionTimeZoneForSession, SITE_TIME_ZONE } from '@/lib/datetime';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export const LOW_TICKETS_THRESHOLD = 20;
export const MIN_DISPLAY_PRICE_RUB = 100;
export const CATALOG_DISPLAY_SLOT_LIMIT = 4;

function collectUpcomingSlotRows(event: PublicSessionDto) {
  const now = Date.now() - 60_000;
  return [...(event.upcomingSlots || [])]
    .filter((slot) => {
      if (!slot.startsAt) return false;
      const startMs = parseSessionStartsAt(slot.startsAt).getTime();
      return Number.isFinite(startMs) && startMs >= now;
    })
    .sort(
      (left, right) =>
        parseSessionStartsAt(left.startsAt!).getTime() - parseSessionStartsAt(right.startsAt!).getTime(),
    );
}

export function formatPriceRub(value?: number | null) {
  if (!value || value <= 0) return '—';
  return formatNumber(Math.round(value));
}

function formatSlotTime(event: PublicSessionDto, startsAt?: string | null, fallback?: string | null) {
  const formatted = formatSessionTime(startsAt, fallback, resolveSessionTimeZoneForSession(event));
  return formatted === '—' ? '' : formatted;
}

export function collectDisplaySlotTimes(event: PublicSessionDto, options?: { todayOnly?: boolean }): string[] {
  const seen = new Set<string>();
  const slots: string[] = [];
  const timeZone = resolveSessionTimeZoneForSession(event);
  const slotRows = options?.todayOnly
    ? collectUpcomingSlotRows(event).filter((slot) => slot.startsAt && isSessionToday(slot.startsAt, timeZone))
    : collectUpcomingSlotRows(event);

  for (const slot of slotRows) {
    const time = formatSlotTime(event, slot.startsAt, slot.timeLabel);
    if (!time || seen.has(time)) continue;
    seen.add(time);
    slots.push(time);
    if (slots.length >= CATALOG_DISPLAY_SLOT_LIMIT) break;
  }

  if (!slots.length && event.startsAt) {
    const time = formatSlotTime(event, event.startsAt, event.timeLabel);
    if (time) slots.push(time);
  }

  return slots;
}

/** Подписи слотов «дата, время» — до 4 ближайших сеансов для карточки каталога. */
export function collectDisplaySlotLabels(event: PublicSessionDto, limit = CATALOG_DISPLAY_SLOT_LIMIT): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const timeZone = resolveSessionTimeZoneForSession(event);

  for (const slot of collectUpcomingSlotRows(event)) {
    const date = slot.dateLabel?.trim();
    const time = slot.timeLabel?.trim() || (slot.startsAt ? formatSessionTime(slot.startsAt, null, timeZone) : '');
    const label = date && time ? `${date}, ${time}` : date || time;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= limit) break;
  }

  if (!labels.length && event.startsAt) {
    const fallback = formatEventNextSession(event);
    if (fallback) labels.push(fallback);
  }

  return labels;
}

export function hasMultipleCatalogSlots(event: PublicSessionDto): boolean {
  const slotCount = event.upcomingSlots?.length || 0;
  return slotCount > 1 || (event.groupedEventsCount || 0) > 1 || (event.sessionCount || 0) > 1;
}

export function isEventSessionToday(event: PublicSessionDto): boolean {
  const timeZone = resolveSessionTimeZoneForSession(event);
  if (event.startsAt && isSessionToday(event.startsAt, timeZone)) return true;
  return (event.upcomingSlots || []).some((slot) => slot.startsAt && isSessionToday(slot.startsAt, timeZone));
}

export function formatNextSession(iso: string, timeZone?: string | null): string | null {
  const zone = timeZone || SITE_TIME_ZONE;
  const d = parseSessionStartsAt(iso);
  if (Number.isNaN(d.getTime())) return null;

  const time = formatSessionTime(iso, null, zone);
  if (isSameSessionDay(iso, new Date(), zone)) return `Сегодня, ${time}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameSessionDay(iso, tomorrow, zone)) return `Завтра, ${time}`;

  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: zone,
  }).format(d);
  return `${date}, ${time}`;
}

export function formatEventNextSession(event: PublicSessionDto): string | null {
  if (!event.startsAt) return null;
  return formatNextSession(event.startsAt, resolveSessionTimeZoneForSession(event));
}

export function isSessionToday(iso: string, timeZone: string = SITE_TIME_ZONE): boolean {
  return isSameSessionDay(iso, new Date(), timeZone);
}

export function getDepartingSoonMinutes(startsAt: string): number | null {
  const d = parseSessionStartsAt(startsAt);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0 || diffMs > 120 * 60 * 1000) return null;
  return Math.max(1, Math.round(diffMs / 60000));
}

export function formatListDescription(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Стабильный псевдорейтинг 4.5–5.0 до ≥10 реальных отзывов (только UI). */
export function resolvePseudoRating(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const step = hash % 6; // 0..5 → 4.5 .. 5.0
  return Math.round((4.5 + step / 10) * 10) / 10;
}

export function formatShowcaseSessionDate(event: PublicSessionDto): string {
  if (isOpenDate(event)) return 'Открытая дата';
  const timeZone = resolveSessionTimeZoneForSession(event);
  const d = parseSessionStartsAt(event.startsAt);
  if (Number.isNaN(d.getTime())) {
    const fallback = [event.dateLabel, event.timeLabel].filter(Boolean).join(', ');
    return fallback || 'Дата уточняется';
  }
  // day+month together → genitive («25 июля»), not nominative «июль»
  const dayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(d);
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', timeZone })
    .format(d)
    .toLocaleLowerCase('ru-RU');
  const time = formatSessionTime(event.startsAt, event.timeLabel, timeZone);
  if (!time || time === '—') return `${dayMonth}, ${weekday}`;
  return `${dayMonth}, ${weekday} в ${time}`;
}

/** Короткая дата для узких карточек в горизонтальной ленте */
export function formatShowcaseSessionDateCompact(event: PublicSessionDto): string {
  if (isOpenDate(event)) return 'Открытая дата';
  const timeZone = resolveSessionTimeZoneForSession(event);
  const d = parseSessionStartsAt(event.startsAt);
  if (Number.isNaN(d.getTime())) {
    const fallback = [event.dateLabel, event.timeLabel].filter(Boolean).join(', ');
    return fallback || 'Дата уточняется';
  }
  const dayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(d);
  const time = formatSessionTime(event.startsAt, event.timeLabel, timeZone);
  if (!time || time === '—') return dayMonth;
  return `${dayMonth} в ${time}`;
}

export function formatShowcasePriceLabel(priceFrom?: number | null): string {
  if (!priceFrom || priceFrom < MIN_DISPLAY_PRICE_RUB) return 'Бесплатно';
  return `от ${formatPriceRub(priceFrom)} ₽`;
}

export function collectSessionPrices(sessions: Array<{ priceFrom?: number | null }>): number[] {
  return sessions
    .map((session) => session.priceFrom)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
}

export function resolveSessionPriceRange(sessions: Array<{ priceFrom?: number | null }>) {
  const prices = collectSessionPrices(sessions);
  if (!prices.length) return { priceFrom: null as number | null, priceTo: null as number | null };
  return { priceFrom: Math.min(...prices), priceTo: Math.max(...prices) };
}

export function resolveAgeBadge(tags?: string[] | null, ageLimit?: string | null): string | null {
  const fromLimit = String(ageLimit || '').match(/\b(\d{1,2})\+\b/);
  if (fromLimit) return `${fromLimit[1]}+`;

  for (const tag of tags || []) {
    const match = String(tag).match(/\b(\d{1,2})\+\b/);
    if (match) return `${match[1]}+`;
  }
  return null;
}

export function isOpenDate(event: PublicSessionDto): boolean {
  const kind = String((event as { kind?: string | null }).kind || '').toUpperCase();
  const sourceStatus = String((event as { sourceStatus?: string | null }).sourceStatus || '').toLowerCase();
  if (kind === 'OPEN_DATE' || sourceStatus === 'open_date') return true;
  const label = `${event.dateLabel || ''} ${event.timeLabel || ''}`.toLowerCase();
  return label.includes('открыт');
}

export const FLEXIBLE_SCHEDULE_LABEL = 'Билеты с открытой датой';

export function resolvePurchaseSessionForSlot(
  session: PublicSessionDto,
  label: string,
): PublicSessionDto {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) return session;

  for (const slot of session.upcomingSlots || []) {
    const date = slot.dateLabel?.trim();
    const time = slot.timeLabel?.trim() || '';
    const full = date && time ? `${date}, ${time}` : date || time;
    if (full === normalizedLabel || time === normalizedLabel) {
      return {
        ...session,
        id: slot.eventId || session.id,
        startsAt: slot.startsAt || session.startsAt,
        dateLabel: slot.dateLabel || session.dateLabel,
        timeLabel: slot.timeLabel || session.timeLabel,
        purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
      };
    }
  }

  return session;
}

export function canOpenCatalogPurchase(session: PublicSessionDto): boolean {
  const purchaseUrl =
    session.widgetUrl || session.purchaseUrl || session.deeplinkUrl || session.upcomingSlots?.[0]?.purchaseUrl;
  if (!purchaseUrl) return false;
  const provider = String(session.purchaseProvider || session.offerSourceCode || '').toUpperCase();
  if (provider.includes('TEPLOHOD') || provider.includes('TEP') || purchaseUrl.includes('teplohod.info')) return true;
  if (provider.includes('TC') || provider.includes('TICKETSCLOUD') || /ticketscloud/i.test(purchaseUrl)) return true;
  return Boolean(purchaseUrl);
}

export function isFlexibleScheduleSession(session: {
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  sourceStatus?: string | null;
  kind?: string | null;
}): boolean {
  if (isOpenDate(session as PublicSessionDto)) return true;
  if (!session.startsAt) return true;
  const sourceStatus = String(session.sourceStatus || '').toLowerCase();
  if (sourceStatus === 'widget' || sourceStatus === 'open_date') return true;
  const label = `${session.dateLabel || ''} ${session.timeLabel || ''}`.toLowerCase();
  return label.includes('виджет') || label.includes('выберите время') || label.includes('при покупке') || label.includes('открыт');
}
