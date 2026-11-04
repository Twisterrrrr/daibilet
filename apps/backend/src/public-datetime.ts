import { localHourFromInstant } from './city-timezone.js';

export const SITE_TIME_ZONE = 'Europe/Moscow';

const MOSCOW_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

// Prisma interprets PostgreSQL timestamp-without-time-zone as UTC. Imports store
// Moscow wall time, so convert the preserved clock components to the real UTC instant.
export function prismaWallTimeToUtc(value: Date): Date {
  return new Date(value.getTime() - MOSCOW_UTC_OFFSET_MS);
}

export function prismaWallTimeToIso(value?: Date | null): string | null {
  return value ? prismaWallTimeToUtc(value).toISOString() : null;
}

export function parseSessionStartsAt(value: unknown): Date {
  if (value instanceof Date) return value;
  const raw = String(value || '').trim();
  if (!raw) return new Date(Number.NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}(:\d{2}|\d{2})$/.test(raw)) {
    return new Date(raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
    return new Date(`${raw.replace(' ', 'T')}Z`);
  }
  return new Date(raw);
}

export function normalizeStartsAt(value: unknown): string | null {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function formatDate(value: unknown, timeZone = SITE_TIME_ZONE): string {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone,
  }).format(date);
}

export function formatTime(value: unknown, timeZone = SITE_TIME_ZONE): string {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export function timeBucket(value: unknown, timeZone = SITE_TIME_ZONE): 'morning' | 'day' | 'evening' | 'night' {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return 'night';
  const hour = localHourFromInstant(date, timeZone);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}
