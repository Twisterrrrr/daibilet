import { formatNumber } from '@/lib/format';
import { formatSessionTime, isSameSessionDay, parseSessionStartsAt, resolveSessionTimeZoneForSession, SITE_TIME_ZONE } from '@/lib/datetime';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export const LOW_TICKETS_THRESHOLD = 20;
export const MIN_DISPLAY_PRICE_RUB = 100;
export const CATALOG_DISPLAY_SLOT_LIMIT = 5;

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

  for (const slot of event.upcomingSlots || []) {
    if (options?.todayOnly && slot.startsAt && !isSessionToday(slot.startsAt, timeZone)) continue;
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

/** Подписи слотов «дата, время» для карточки каталога (несколько дат одного события). */
export function collectDisplaySlotLabels(event: PublicSessionDto, limit = CATALOG_DISPLAY_SLOT_LIMIT): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const timeZone = resolveSessionTimeZoneForSession(event);

  for (const slot of event.upcomingSlots || []) {
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
  return value.replace(/\s+/g, ' ').trim();
}

/** Стабильный псевдорейтинг 4.0–5.0 до появления реальных отзывов. */
export function resolvePseudoRating(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const step = hash % 11;
  return Math.round((4 + step / 10) * 10) / 10;
}

export function formatShowcaseSessionDate(event: PublicSessionDto): string {
  if (isOpenDate(event)) return 'Открытая дата';
  const timeZone = resolveSessionTimeZoneForSession(event);
  const d = parseSessionStartsAt(event.startsAt);
  if (Number.isNaN(d.getTime())) {
    return [event.dateLabel, event.timeLabel].filter(Boolean).join(' · ') || '—';
  }
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone })
    .format(d)
    .replace(/\./g, '')
    .replace(/\s*г\.?$/i, '');
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone })
    .format(d)
    .replace(/\./g, '');
  const time = formatSessionTime(event.startsAt, event.timeLabel, timeZone);
  return time ? `${day} · ${weekday} · ${time}` : `${day} · ${weekday}`;
}

/** Короткая дата для узких карточек в горизонтальной ленте */
export function formatShowcaseSessionDateCompact(event: PublicSessionDto): string {
  if (isOpenDate(event)) return 'Открытая дата';
  const timeZone = resolveSessionTimeZoneForSession(event);
  const d = parseSessionStartsAt(event.startsAt);
  if (Number.isNaN(d.getTime())) {
    return [event.dateLabel, event.timeLabel].filter(Boolean).join(' · ') || '—';
  }
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone })
    .format(d)
    .replace(/\./g, '')
    .replace(/\s*г\.?$/i, '');
  const time = formatSessionTime(event.startsAt, event.timeLabel, timeZone);
  return time ? `${day} · ${time}` : day;
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

export function resolveAgeBadge(tags: string[], ageLimit?: string | null): string | null {
  const fromLimit = String(ageLimit || '').match(/\b(\d{1,2})\+\b/);
  if (fromLimit) return `${fromLimit[1]}+`;

  for (const tag of tags) {
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
  return label.includes('виджет') || label.includes('выберите время') || label.includes('при покупке');
}
