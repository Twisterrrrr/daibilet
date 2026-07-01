/** Все события на сайте — в часовом поясе России (МСК). */
export const SITE_TIME_ZONE = 'Europe/Moscow';

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

export function getSessionDateParts(startsAt: string): DateParts | null {
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  return getDatePartsInTimeZone(date, SITE_TIME_ZONE);
}

export function getSessionHour(startsAt: string): number {
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return 0;
  const hour = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hour12: false,
    timeZone: SITE_TIME_ZONE,
  }).formatToParts(date).find((part) => part.type === 'hour')?.value;
  return Number(hour ?? 0);
}

export function formatSessionTime(startsAt?: string | null, fallback?: string | null): string {
  if (!startsAt) return String(fallback || '').trim() || '—';
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return String(fallback || '').trim() || '—';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

export function formatSessionDate(startsAt?: string | null, fallback?: string | null): string {
  if (!startsAt) return String(fallback || '').trim();
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return String(fallback || '').trim();
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

export function isSameSessionDay(startsAt: string, reference: Date = new Date()): boolean {
  const sessionParts = getSessionDateParts(startsAt);
  if (!sessionParts) return false;
  const refParts = getDatePartsInTimeZone(reference, SITE_TIME_ZONE);
  return (
    sessionParts.year === refParts.year &&
    sessionParts.month === refParts.month &&
    sessionParts.day === refParts.day
  );
}

export function isSessionTomorrow(startsAt: string): boolean {
  const sessionParts = getSessionDateParts(startsAt);
  if (!sessionParts) return false;
  const today = getDatePartsInTimeZone(new Date(), SITE_TIME_ZONE);
  const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  const tomorrowParts = getDatePartsInTimeZone(tomorrow, SITE_TIME_ZONE);
  return (
    sessionParts.year === tomorrowParts.year &&
    sessionParts.month === tomorrowParts.month &&
    sessionParts.day === tomorrowParts.day
  );
}

export function isSessionWeekend(startsAt: string): boolean {
  const date = parseSessionStartsAt(startsAt);
  if (Number.isNaN(date.getTime())) return false;
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
  return weekday === 'Sat' || weekday === 'Sun';
}

export function sessionTimeSlotFilter(startsAt: string): 'morning' | 'day' | 'evening' | 'night' {
  const hour = getSessionHour(startsAt);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  if (hour < 22) return 'evening';
  return 'night';
}

export function sessionTimeCategory(startsAt: string): 'morning' | 'day' | 'evening' | 'night' {
  const hour = getSessionHour(startsAt);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

type SessionLike = { startsAt?: string | null; timeLabel?: string | null; dateLabel?: string | null };
type SlotLike = { startsAt?: string | null; timeLabel?: string | null; dateLabel?: string | null };

export function resolveSessionTime(session: SessionLike, slot?: SlotLike | null): string {
  return formatSessionTime(slot?.startsAt || session.startsAt, slot?.timeLabel || session.timeLabel);
}

export function resolveSessionDate(session: SessionLike, slot?: SlotLike | null): string {
  return formatSessionDate(slot?.startsAt || session.startsAt, slot?.dateLabel || session.dateLabel);
}
