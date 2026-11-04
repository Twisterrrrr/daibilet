import type { PublicSessionDto } from './types/public.js';

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isOpenDateCatalogSession(session: Pick<PublicSessionDto, 'kind' | 'sourceStatus'>): boolean {
  return (
    String(session.kind || '').toUpperCase() === 'OPEN_DATE' ||
    String(session.sourceStatus || '').toLowerCase() === 'open_date'
  );
}

/** Calendar-day match for ISO `from` / `to` (YYYY-MM-DD), inclusive. */
export function matchesCatalogDayRange(
  startsAt: string | null | undefined,
  from?: string,
  to?: string,
): boolean {
  const fromDay = from ? startOfLocalDay(new Date(from)) : null;
  const toDay = to ? startOfLocalDay(new Date(to)) : null;
  if (!fromDay && !toDay) return true;
  if (!startsAt) return false;

  const timestamp = new Date(startsAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const eventDay = startOfLocalDay(new Date(startsAt));
  if (fromDay && eventDay < fromDay) return false;
  if (toDay && eventDay > toDay) return false;
  return true;
}

export function matchesCatalogPresetDate(
  session: Pick<PublicSessionDto, 'startsAt' | 'timeBucket' | 'kind' | 'sourceStatus'>,
  dateFilter: string,
): boolean {
  if (dateFilter === 'all') return true;
  if (isOpenDateCatalogSession(session)) {
    return dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'weekend';
  }
  const startsAt = new Date(session.startsAt || '');
  if (!Number.isFinite(startsAt.getTime())) return false;

  const today = startOfLocalDay(new Date());
  const eventDay = startOfLocalDay(startsAt);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') return startsAt.getDay() === 0 || startsAt.getDay() === 6;
  if (dateFilter === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';
  return true;
}

function catalogSessionStartCandidates(session: PublicSessionDto): string[] {
  const out = new Set<string>();
  if (session.startsAt) out.add(session.startsAt);
  for (const slot of session.upcomingSlots || []) {
    if (slot.startsAt) out.add(slot.startsAt);
  }
  return [...out];
}

/** Any grouped slot may satisfy the preset date chip. */
export function sessionMatchesCatalogPresetDate(session: PublicSessionDto, dateFilter: string): boolean {
  if (dateFilter === 'all') return true;
  if (isOpenDateCatalogSession(session)) {
    return dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'weekend';
  }
  return catalogSessionStartCandidates(session).some((startsAt) =>
    matchesCatalogPresetDate({ ...session, startsAt }, dateFilter),
  );
}

/**
 * Explicit calendar day (`from`/`to` from date rail).
 * Open-date rows are excluded — they have no concrete day.
 */
export function sessionMatchesCatalogDayRange(
  session: PublicSessionDto,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) return true;
  if (isOpenDateCatalogSession(session)) return false;
  return catalogSessionStartCandidates(session).some((startsAt) =>
    matchesCatalogDayRange(startsAt, from, to),
  );
}
