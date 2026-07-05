import { formatNumber } from '@/data';
import { formatSessionTime, isSameSessionDay, parseSessionStartsAt } from '@/lib/datetime';
import type { PublicSession } from '@/types';

export const LOW_TICKETS_THRESHOLD = 20;
export const MIN_DISPLAY_PRICE_RUB = 100;

export function formatPriceRub(value?: number | null) {
  if (!value || value <= 0) return '—';
  return formatNumber(Math.round(value));
}

function formatSlotTime(startsAt?: string | null, fallback?: string | null) {
  const formatted = formatSessionTime(startsAt, fallback);
  return formatted === '—' ? '' : formatted;
}

export function collectDisplaySlotTimes(event: PublicSession, options?: { todayOnly?: boolean }): string[] {
  const seen = new Set<string>();
  const slots: string[] = [];

  for (const slot of event.upcomingSlots || []) {
    if (options?.todayOnly && slot.startsAt && !isSessionToday(slot.startsAt)) continue;
    const time = formatSlotTime(slot.startsAt, slot.timeLabel);
    if (!time || seen.has(time)) continue;
    seen.add(time);
    slots.push(time);
    if (slots.length >= 5) break;
  }

  if (!slots.length && event.startsAt) {
    const time = formatSlotTime(event.startsAt, event.timeLabel);
    if (time) slots.push(time);
  }

  return slots;
}

export function isEventSessionToday(event: PublicSession): boolean {
  if (event.startsAt && isSessionToday(event.startsAt)) return true;
  return (event.upcomingSlots || []).some((slot) => slot.startsAt && isSessionToday(slot.startsAt));
}

export function formatNextSession(iso: string): string | null {
  const d = parseSessionStartsAt(iso);
  if (Number.isNaN(d.getTime())) return null;

  const time = formatSessionTime(iso);
  if (isSameSessionDay(iso)) return `Сегодня, ${time}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameSessionDay(iso, tomorrow)) return `Завтра, ${time}`;

  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Moscow',
  }).format(d);
  return `${date}, ${time}`;
}

export function isSessionToday(iso: string): boolean {
  return isSameSessionDay(iso);
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

export function formatShowcaseSessionDate(event: PublicSession): string {
  if (isOpenDate(event)) return 'Открытая дата';
  const d = parseSessionStartsAt(event.startsAt);
  if (Number.isNaN(d.getTime())) {
    return [event.dateLabel, event.timeLabel].filter(Boolean).join(' · ') || '—';
  }
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Europe/Moscow' })
    .format(d)
    .replace(/\./g, '')
    .replace(/\s*г\.?$/i, '');
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'Europe/Moscow' })
    .format(d)
    .replace(/\./g, '');
  const time = formatSessionTime(event.startsAt, event.timeLabel);
  return time ? `${day} · ${weekday} · ${time}` : `${day} · ${weekday}`;
}

/** Короткая дата для узких карточек в горизонтальной ленте */
export function formatShowcaseSessionDateCompact(event: PublicSession): string {
  if (isOpenDate(event)) return 'Открытая дата';
  const d = parseSessionStartsAt(event.startsAt);
  if (Number.isNaN(d.getTime())) {
    return [event.dateLabel, event.timeLabel].filter(Boolean).join(' · ') || '—';
  }
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Europe/Moscow' })
    .format(d)
    .replace(/\./g, '')
    .replace(/\s*г\.?$/i, '');
  const time = formatSessionTime(event.startsAt, event.timeLabel);
  return time ? `${day} · ${time}` : day;
}

export function formatShowcasePriceLabel(priceFrom?: number | null): string {
  if (!priceFrom || priceFrom < MIN_DISPLAY_PRICE_RUB) return 'Бесплатно';
  return `от ${formatPriceRub(priceFrom)} ₽`;
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

export function isOpenDate(event: PublicSession): boolean {
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
  if (isOpenDate(session as PublicSession)) return true;
  if (!session.startsAt) return true;
  const sourceStatus = String(session.sourceStatus || '').toLowerCase();
  if (sourceStatus === 'widget' || sourceStatus === 'open_date') return true;
  const label = `${session.dateLabel || ''} ${session.timeLabel || ''}`.toLowerCase();
  return label.includes('виджет') || label.includes('выберите время') || label.includes('при покупке');
}
