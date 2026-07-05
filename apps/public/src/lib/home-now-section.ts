import { isSessionToday } from '@/lib/event-card-meta';
import {
  formatSessionDate,
  formatSessionTime,
  isSessionTomorrow,
  isSessionWeekend,
  parseSessionStartsAt,
} from '@/lib/datetime';
import { spreadCatalogSessionsByCoverImage } from '@/lib/session-cover-image';
import type { PublicSession } from '@/types';

export type HomeNowTabKey = 'today' | 'tomorrow' | 'weekend' | 'nearest';

export type HomeNowTab = {
  key: HomeNowTabKey;
  label: string;
  title: string;
  subtitle: string;
  events: PublicSession[];
  catalogQuery: Record<string, string>;
  usedFallback: boolean;
};

const TAB_LIMIT = 8;
const MIN_PRIMARY_EVENTS = 1;

type SlotFilter = (iso: string) => boolean;

function collectStartIsos(event: PublicSession): string[] {
  return [event.startsAt, ...(event.upcomingSlots || []).map((slot) => slot.startsAt)].filter(Boolean) as string[];
}

function collectMatchingSlots(event: PublicSession, slotFilter: SlotFilter): string[] {
  return collectStartIsos(event)
    .filter((iso) => slotFilter(iso))
    .sort((a, b) => parseSessionStartsAt(a).getTime() - parseSessionStartsAt(b).getTime());
}

function eventMatchesSlotFilter(event: PublicSession, slotFilter: SlotFilter): boolean {
  return collectMatchingSlots(event, slotFilter).length > 0;
}

function isSlotUpcoming(iso: string): boolean {
  const time = parseSessionStartsAt(iso).getTime();
  return Number.isFinite(time) && time >= Date.now() - 60_000;
}

function withTabDisplaySlot(event: PublicSession, slotFilter: SlotFilter): PublicSession {
  const matchingSlot = collectMatchingSlots(event, slotFilter)[0];
  if (!matchingSlot || matchingSlot === event.startsAt) return event;

  return {
    ...event,
    startsAt: matchingSlot,
    timeLabel: formatSessionTime(matchingSlot, event.timeLabel),
    dateLabel: formatSessionDate(matchingSlot, event.dateLabel),
  };
}

function popularScore(event: PublicSession): number {
  let score = (event.sessionCount || 1) * 1000;
  if (event.manualLandingStatus === 'PINNED') score += 1_000_000;
  if (Number.isFinite(event.priceFrom) && event.priceFrom! > 0) score += Math.max(0, 5000 - event.priceFrom!);
  return score;
}

function sessionDedupeKey(event: PublicSession): string {
  const groupKey = String(event.groupKey || '').trim().toLowerCase();
  if (groupKey) return `group:${groupKey}`;
  return `title:${event.title.trim().toLowerCase()}`;
}

function takeUnique(events: PublicSession[], max: number): PublicSession[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const result: PublicSession[] = [];

  for (const event of events) {
    if (seenIds.has(event.id) || seenTitles.has(sessionDedupeKey(event))) continue;
    seenIds.add(event.id);
    seenTitles.add(sessionDedupeKey(event));
    result.push(event);
    if (result.length >= max) break;
  }

  return result;
}

function sortByPopular(events: PublicSession[]): PublicSession[] {
  return [...events].sort((a, b) => {
    const scoreDiff = popularScore(b) - popularScore(a);
    if (scoreDiff) return scoreDiff;
    return parseSessionStartsAt(a.startsAt).getTime() - parseSessionStartsAt(b.startsAt).getTime();
  });
}

function sortByMatchingSlot(events: PublicSession[], slotFilter: SlotFilter): PublicSession[] {
  return [...events].sort((a, b) => {
    const aTime = parseSessionStartsAt(collectMatchingSlots(a, slotFilter)[0] || a.startsAt).getTime();
    const bTime = parseSessionStartsAt(collectMatchingSlots(b, slotFilter)[0] || b.startsAt).getTime();
    return aTime - bTime;
  });
}

function buildTabPool(sessions: PublicSession[], slotFilter: SlotFilter): PublicSession[] {
  const matched = sortByMatchingSlot(
    sessions.filter((event) => eventMatchesSlotFilter(event, slotFilter)),
    slotFilter,
  ).map((event) => withTabDisplaySlot(event, slotFilter));

  return spreadCatalogSessionsByCoverImage(takeUnique(matched, TAB_LIMIT));
}

type BuildHomeNowTabsOptions = {
  cityName?: string | null;
};

export function buildHomeNowTabs(sessions: PublicSession[], options: BuildHomeNowTabsOptions = {}): HomeNowTab[] {
  const cityName = options.cityName?.trim() || null;
  const inCity = cityName ? ` в ${cityName}` : '';

  const tabDefs: Array<{
    key: HomeNowTabKey;
    label: string;
    title: string;
    subtitle: string;
    slotFilter: SlotFilter;
    catalogQuery: Record<string, string>;
    fallbackTitle: string;
    fallbackSubtitle: string;
  }> = [
    {
      key: 'today',
      label: 'Сегодня',
      title: `Сегодня${inCity}`,
      subtitle: 'Сеансы, которые ещё можно успеть',
      slotFilter: isSessionToday,
      catalogQuery: { date: 'today', sort: 'time' },
      fallbackTitle: cityName ? `Популярное${inCity}` : 'Популярное в ближайшие дни',
      fallbackSubtitle: 'Рекомендуем начать с этих событий',
    },
    {
      key: 'tomorrow',
      label: 'Завтра',
      title: `Завтра${inCity}`,
      subtitle: 'Удобно спланировать заранее',
      slotFilter: isSessionTomorrow,
      catalogQuery: { date: 'tomorrow', sort: 'time' },
      fallbackTitle: cityName ? `Рекомендуем${inCity}` : 'Рекомендуем в ближайшие дни',
      fallbackSubtitle: 'Лучшие предложения из каталога',
    },
    {
      key: 'weekend',
      label: 'На выходных',
      title: `На выходных${inCity}`,
      subtitle: 'Сб и вс — семейные и вечерние форматы',
      slotFilter: isSessionWeekend,
      catalogQuery: { date: 'weekend', sort: 'popular' },
      fallbackTitle: 'Лучшие предложения сезона',
      fallbackSubtitle: 'Подборка по популярности',
    },
    {
      key: 'nearest',
      label: 'Ближайшие даты',
      title: `Ближайшие даты${inCity}`,
      subtitle: 'Скоро в афише',
      slotFilter: isSlotUpcoming,
      catalogQuery: { sort: 'time' },
      fallbackTitle: cityName ? `Популярное${inCity}` : 'Популярное сейчас',
      fallbackSubtitle: 'Топ каталога',
    },
  ];

  const fallbackByTab = new Map<HomeNowTabKey, PublicSession[]>();

  return tabDefs
    .map((def) => {
      const primary = buildTabPool(sessions, def.slotFilter);
      const usedFallback = primary.length < MIN_PRIMARY_EVENTS;
      let events = primary;

      if (usedFallback) {
        if (!fallbackByTab.has(def.key)) {
          const offset = { today: 0, tomorrow: 2, weekend: 4, nearest: 6 }[def.key];
          const rotated = [...sessions.slice(offset), ...sessions.slice(0, offset)];
          fallbackByTab.set(
            def.key,
            spreadCatalogSessionsByCoverImage(takeUnique(sortByPopular(rotated), TAB_LIMIT)),
          );
        }
        events = fallbackByTab.get(def.key) || [];
      }

      return {
        key: def.key,
        label: def.label,
        title: usedFallback ? def.fallbackTitle : def.title,
        subtitle: usedFallback ? def.fallbackSubtitle : def.subtitle,
        events,
        catalogQuery: usedFallback ? { sort: 'popular' } : def.catalogQuery,
        usedFallback,
      };
    })
    .filter((tab) => tab.events.length > 0);
}

export function pickDefaultHomeNowTab(tabs: HomeNowTab[]): HomeNowTabKey {
  const preferred: HomeNowTabKey[] = ['today', 'weekend', 'tomorrow', 'nearest'];
  for (const key of preferred) {
    if (tabs.some((tab) => tab.key === key)) return key;
  }
  return tabs[0]?.key || 'today';
}
