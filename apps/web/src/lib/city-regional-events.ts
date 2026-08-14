import { CITY_REGIONAL_EVENTS, type CityRegionalEvent } from '../data/city-regional-events.ts';
import { normalizeCityHubSlug } from './city-hub-config.ts';

export type CityRegionalEventStatus = 'upcoming' | 'now' | 'past';

export type CityRegionalEventView = CityRegionalEvent & {
  status: CityRegionalEventStatus;
};

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function regionalEventStatus(event: CityRegionalEvent, now = new Date()): CityRegionalEventStatus {
  const today = ymd(now);
  if (today < event.startDate) return 'upcoming';
  if (today > event.endDate) return 'past';
  return 'now';
}

export function regionalEventStatusLabel(status: CityRegionalEventStatus): string {
  if (status === 'upcoming') return 'Скоро';
  if (status === 'now') return 'Сейчас';
  return 'Уже прошёл';
}

const STATUS_RANK: Record<CityRegionalEventStatus, number> = {
  now: 0,
  upcoming: 1,
  past: 2,
};

function listAllCityRegionalEvents(
  slug: string | null | undefined,
  now = new Date(),
): CityRegionalEventView[] {
  const normalized = normalizeCityHubSlug(slug);
  const rows = normalized ? CITY_REGIONAL_EVENTS[normalized] || [] : [];
  return rows
    .map((event) => ({ ...event, status: regionalEventStatus(event, now) }))
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (rank !== 0) return rank;
      if (a.status === 'past') return b.startDate.localeCompare(a.startDate);
      return a.startDate.localeCompare(b.startDate);
    });
}

export function listCityRegionalEvents(
  slug: string | null | undefined,
  now = new Date(),
  limit = 5,
): CityRegionalEventView[] {
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(5, Math.floor(limit))) : 5;
  return listAllCityRegionalEvents(slug, now)
    .filter((event) => event.status !== 'past')
    .slice(0, cap);
}

export function listCityRegionalPastEvents(
  slug: string | null | undefined,
  now = new Date(),
  limit = 5,
): CityRegionalEventView[] {
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(8, Math.floor(limit))) : 5;
  return listAllCityRegionalEvents(slug, now)
    .filter((event) => event.status === 'past')
    .slice(0, cap);
}
