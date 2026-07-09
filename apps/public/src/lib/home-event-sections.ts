import { isEventSessionToday, isSessionToday } from '@/lib/event-card-meta';
import { parseSessionStartsAt } from '@/lib/datetime';
import type { PublicSession } from '@/types';

export const HOME_SECTION_EVENT_LIMIT = 4;
export const HOME_MIN_EVENTS_FOR_SPLIT = 12;

export type HomeEventSection = {
  key: 'all' | 'today' | 'popular' | 'nearest';
  title: string;
  subtitle: string;
  events: PublicSession[];
  muted?: boolean;
};

export type HomeEventSectionsResult = {
  mode: 'single' | 'split';
  sections: HomeEventSection[];
};

type BuildHomeEventSectionsOptions = {
  cityName?: string | null;
  limit?: number;
  minEventsForSplit?: number;
  cityLabel?: (city: string) => string;
};

export function buildHomeEventSections(
  sessions: PublicSession[],
  options: BuildHomeEventSectionsOptions = {},
): HomeEventSectionsResult {
  const limit = options.limit ?? HOME_SECTION_EVENT_LIMIT;
  const minEventsForSplit = options.minEventsForSplit ?? HOME_MIN_EVENTS_FOR_SPLIT;
  const cityLabel = options.cityLabel ?? ((city: string) => city);
  const cityName = options.cityName?.trim() || null;
  const inCity = cityName ? ` в ${cityLabel(cityName)}` : '';

  if (sessions.length < minEventsForSplit) {
    return {
      mode: 'single',
      sections: [
        {
          key: 'all',
          title: cityName ? `События${inCity}` : 'События',
          subtitle: cityName ? 'Актуальная афиша в выбранном городе' : 'Актуальная афиша — от сегодня до ближайших дат',
          events: takeUniqueSessions(sortSingleBlock(sessions), limit, new Set(), new Set()),
        },
      ],
    };
  }

  const shownIds = new Set<string>();
  const shownTitles = new Set<string>();
  const sections: HomeEventSection[] = [];

  const todayCandidates = [...sessions]
    .filter(isEventSessionToday)
    .sort((a, b) => compareByStartsAt(a, b, getEarliestStartsAt));
  const todayEvents = takeUniqueSessions(todayCandidates, limit, shownIds, shownTitles);
  if (todayEvents.length) {
    sections.push({
      key: 'today',
      title: cityName ? `Сегодня${inCity}` : 'Сегодня',
      subtitle: 'Сеансы, которые ещё можно успеть посетить',
      events: todayEvents,
    });
  }

  const popularCandidates = [...sessions]
    .filter((event) => !isAlreadyShown(event, shownIds, shownTitles))
    .sort((a, b) => comparePopularEvents(a, b));
  const popularEvents = takeUniqueSessions(popularCandidates, limit, shownIds, shownTitles);
  if (popularEvents.length) {
    sections.push({
      key: 'popular',
      title: cityName ? `Популярные события${inCity}` : 'Популярные события',
      subtitle: cityName
        ? 'Закреплённые вручную и события с большим числом сеансов'
        : 'Закреплённые вручную, много сеансов и доступные цены',
      events: popularEvents,
    });
  }

  const nearestCandidates = [...sessions]
    .filter((event) => !isAlreadyShown(event, shownIds, shownTitles) && isEventFromTomorrowOrLater(event))
    .sort((a, b) => compareByStartsAt(a, b, getEarliestNonTodayStartsAt));
  const nearestEvents = takeUniqueSessions(nearestCandidates, limit, shownIds, shownTitles);
  if (nearestEvents.length) {
    sections.push({
      key: 'nearest',
      title: cityName ? `Ближайшие события${inCity}` : 'Ближайшие события',
      subtitle: cityName ? 'С завтрашнего дня и дальше' : 'С завтра — удобно спланировать заранее',
      events: nearestEvents,
      muted: true,
    });
  }

  return { mode: 'split', sections };
}

function isFeaturedEvent(event: PublicSession): boolean {
  return event.manualLandingStatus === 'PINNED';
}

function popularScore(event: PublicSession): number {
  let score = (event.sessionCount || 1) * 1000;
  if (isFeaturedEvent(event)) score += 1_000_000;
  if (Number.isFinite(event.priceFrom) && event.priceFrom! > 0) {
    score += Math.max(0, 5000 - event.priceFrom!);
  }
  return score;
}

function comparePopularEvents(a: PublicSession, b: PublicSession): number {
  const scoreDiff = popularScore(b) - popularScore(a);
  if (scoreDiff) return scoreDiff;
  return compareByStartsAt(a, b, getEarliestStartsAt);
}

function sortSingleBlock(events: PublicSession[]): PublicSession[] {
  return [...events].sort((a, b) => {
    const featuredDiff = Number(isFeaturedEvent(b)) - Number(isFeaturedEvent(a));
    if (featuredDiff) return featuredDiff;

    const aToday = isEventSessionToday(a);
    const bToday = isEventSessionToday(b);
    if (aToday !== bToday) return aToday ? -1 : 1;
    if (aToday && bToday) return compareByStartsAt(a, b, getEarliestStartsAt);

    const popularDiff = popularScore(b) - popularScore(a);
    if (popularDiff) return popularDiff;
    return compareByStartsAt(a, b, getEarliestStartsAt);
  });
}

function getEarliestStartsAt(event: PublicSession): number {
  const times = collectStartTimes(event);
  return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function getEarliestNonTodayStartsAt(event: PublicSession): number {
  const times = collectStartIsos(event)
    .filter((iso) => !isSessionToday(iso))
    .map((iso) => parseSessionStartsAt(iso).getTime())
    .filter(Number.isFinite);
  return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function collectStartIsos(event: PublicSession): string[] {
  const isos = [event.startsAt, ...(event.upcomingSlots || []).map((slot) => slot.startsAt)].filter(Boolean) as string[];
  return isos;
}

function collectStartTimes(event: PublicSession): number[] {
  return collectStartIsos(event)
    .map((iso) => parseSessionStartsAt(iso).getTime())
    .filter(Number.isFinite);
}

function isEventFromTomorrowOrLater(event: PublicSession): boolean {
  const iso = collectStartIsos(event).find((value) => value && !isSessionToday(value));
  return Boolean(iso);
}

function compareByStartsAt(
  a: PublicSession,
  b: PublicSession,
  picker: (event: PublicSession) => number,
): number {
  const timeDiff = picker(a) - picker(b);
  if (timeDiff) return timeDiff;
  return a.title.localeCompare(b.title, 'ru');
}

function sessionDedupeKey(event: PublicSession): string {
  const groupKey = String(event.groupKey || '').trim().toLowerCase();
  if (groupKey) return `group:${groupKey}`;
  return `title:${event.title.trim().toLowerCase()}`;
}

function isAlreadyShown(event: PublicSession, shownIds: Set<string>, shownTitles: Set<string>): boolean {
  if (shownIds.has(event.id)) return true;
  const key = sessionDedupeKey(event);
  return shownTitles.has(key);
}

function takeUniqueSessions(
  events: PublicSession[],
  max: number,
  shownIds: Set<string>,
  shownTitles: Set<string>,
): PublicSession[] {
  const result: PublicSession[] = [];

  for (const event of events) {
    if (isAlreadyShown(event, shownIds, shownTitles)) continue;

    shownIds.add(event.id);
    shownTitles.add(sessionDedupeKey(event));
    result.push(event);
    if (result.length >= max) break;
  }

  return result;
}
