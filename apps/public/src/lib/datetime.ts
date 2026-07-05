import { DEFAULT_CITY_TIME_ZONE, resolveSessionTimeZone } from '@/lib/city-timezone';

export const SITE_TIME_ZONE = DEFAULT_CITY_TIME_ZONE;

type DateParts = { year: number; month: number; day: number };

/**
 * Парсит startsAt из API/БД.
 * Naive ISO без таймзоны (`2026-06-25T07:00:00`) — UTC (так хранится в PostgreSQL timestamp).
 * Строки с offset/Z парсятся как есть.
 */
export function parseSessionStartsAt(value: string | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  const raw = String(value || '').trim();
  if (!raw) return new Date(NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}(:\d{2}|\d{2})$/.test(raw)) {
    return new Date(raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
    return new Date(`${raw.replace(' ', 'T')}Z`);
  }
  return new Date(raw);
}

export function normalizeStartsAt(value: string | Date | null | undefined): string | null {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);

  return { year, month, day };
}

export function getSessionDateParts(startsAt: string, timeZone: string = SITE_TIME_ZONE): DateParts | null {
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  return getDatePartsInTimeZone(date, timeZone);
}

export function getSessionHour(startsAt: string, timeZone: string = SITE_TIME_ZONE): number {
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return 0;
  const hour = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).formatToParts(date).find((part) => part.type === 'hour')?.value;
  return Number(hour ?? 0);
}

export function formatSessionTime(
  startsAt?: string | null,
  fallback?: string | null,
  timeZone: string = SITE_TIME_ZONE,
): string {
  if (!startsAt) return String(fallback || '').trim() || '—';
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return String(fallback || '').trim() || '—';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export function formatSessionDate(
  startsAt?: string | null,
  fallback?: string | null,
  timeZone: string = SITE_TIME_ZONE,
): string {
  if (!startsAt) return String(fallback || '').trim();
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return String(fallback || '').trim();
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone,
  }).format(date);
}

export function isSameSessionDay(
  startsAt: string,
  reference: Date = new Date(),
  timeZone: string = SITE_TIME_ZONE,
): boolean {
  const sessionParts = getSessionDateParts(startsAt, timeZone);
  if (!sessionParts) return false;
  const refParts = getDatePartsInTimeZone(reference, timeZone);
  return (
    sessionParts.year === refParts.year &&
    sessionParts.month === refParts.month &&
    sessionParts.day === refParts.day
  );
}

export function isSessionTomorrow(startsAt: string, timeZone: string = SITE_TIME_ZONE): boolean {
  const sessionParts = getSessionDateParts(startsAt, timeZone);
  if (!sessionParts) return false;
  const today = getDatePartsInTimeZone(new Date(), timeZone);
  const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  const tomorrowParts = getDatePartsInTimeZone(tomorrow, timeZone);
  return (
    sessionParts.year === tomorrowParts.year &&
    sessionParts.month === tomorrowParts.month &&
    sessionParts.day === tomorrowParts.day
  );
}

export function isSessionWeekend(startsAt: string, timeZone: string = SITE_TIME_ZONE): boolean {
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return false;
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone,
  }).format(date);
  return weekday === 'Sat' || weekday === 'Sun';
}

export function sessionTimeSlotFilter(startsAt: string, timeZone: string = SITE_TIME_ZONE): 'morning' | 'day' | 'evening' | 'night' {
  const hour = getSessionHour(startsAt, timeZone);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  if (hour < 22) return 'evening';
  return 'night';
}

export function sessionTimeCategory(startsAt: string, timeZone: string = SITE_TIME_ZONE): 'morning' | 'day' | 'evening' | 'night' {
  const hour = getSessionHour(startsAt, timeZone);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

type SessionLike = {
  startsAt?: string | null;
  timeLabel?: string | null;
  dateLabel?: string | null;
  city?: string | null;
  destination?: string | null;
  timeZone?: string | null;
};
type SlotLike = { startsAt?: string | null; timeLabel?: string | null; dateLabel?: string | null };

export function resolveSessionTimeZoneForSession(session: SessionLike): string {
  return resolveSessionTimeZone(session);
}

export function resolveSessionTime(session: SessionLike, slot?: SlotLike | null): string {
  const timeZone = resolveSessionTimeZoneForSession(session);
  return formatSessionTime(slot?.startsAt || session.startsAt, slot?.timeLabel || session.timeLabel, timeZone);
}

export function resolveSessionDate(session: SessionLike, slot?: SlotLike | null): string {
  const timeZone = resolveSessionTimeZoneForSession(session);
  return formatSessionDate(slot?.startsAt || session.startsAt, slot?.dateLabel || session.dateLabel, timeZone);
}
