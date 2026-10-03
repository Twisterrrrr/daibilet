import type { PublicSessionDto } from './types/public.js';
import type { PublicRegionChildCityDto, RegionCenterConfig } from './region-hub.js';

export type RegionInfoVenueHint = {
  name: string;
  city: string;
  eventCount: number;
};

export type RegionInfoPromptContext = {
  regionName: string;
  regionSlug: string;
  excludeCenter: string | null;
  cities: Array<{ name: string; eventCount: number; venues: string[] }>;
  venues: RegionInfoVenueHint[];
  genres: string[];
  promptBlock: string;
};

/**
 * Жёсткий контекст для LLM: только региональные города/venues/genres, центр — в exclude.
 */
export function buildRegionInfoPromptContext(input: {
  regionName: string;
  regionSlug: string;
  centerCityName?: string | null;
  childCities: PublicRegionChildCityDto[];
  sessions: PublicSessionDto[];
  hub?: RegionCenterConfig | null;
}): RegionInfoPromptContext {
  const excludeCenter = input.centerCityName || input.hub?.centerCity || null;
  const excludeKey = normalize(excludeCenter);

  const venueCounts = new Map<string, { name: string; city: string; eventCount: number }>();
  const genreCounts = new Map<string, number>();

  for (const session of input.sessions || []) {
    const city = String(session.city || '').trim();
    if (!city || city === 'Не указан') continue;
    if (excludeKey && normalize(city) === excludeKey) continue;

    const venue = String(session.venue || '').trim();
    if (venue && venue !== 'Не указано') {
      const key = `${normalize(city)}|${normalize(venue)}`;
      const prev = venueCounts.get(key);
      if (prev) prev.eventCount += 1;
      else venueCounts.set(key, { name: venue, city, eventCount: 1 });
    }

    const category = String(session.category || '').trim();
    if (category) genreCounts.set(category, (genreCounts.get(category) || 0) + 1);
  }

  const venues = [...venueCounts.values()]
    .sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name, 'ru'))
    .slice(0, 24);

  const venuesByCity = new Map<string, string[]>();
  for (const venue of venues) {
    const list = venuesByCity.get(venue.city) || [];
    if (list.length < 3) {
      list.push(venue.name);
      venuesByCity.set(venue.city, list);
    }
  }

  const cities = (input.childCities || [])
    .filter((city) => city.eventCount > 0)
    .filter((city) => !excludeKey || normalize(city.name) !== excludeKey)
    .map((city) => ({
      name: city.name,
      eventCount: city.eventCount,
      venues: venuesByCity.get(city.name) || [],
    }));

  const genres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  const cityLines = cities
    .map((city) => {
      const venuePart = city.venues.length ? ` (${city.venues.join(', ')})` : '';
      return `${city.name}${venuePart}`;
    })
    .join('; ');

  const promptBlock = [
    `Регион: ${input.regionName}`,
    `Центр (ИСКЛЮЧИТЬ из описания): ${excludeCenter || '—'}`,
    `Города с событиями: ${cityLines || '—'}`,
    `Жанры: ${genres.join(', ') || '—'}`,
  ].join('\n');

  return {
    regionName: input.regionName,
    regionSlug: input.regionSlug,
    excludeCenter,
    cities,
    venues,
    genres,
    promptBlock,
  };
}

export const REGION_INFO_SYSTEM_PROMPT = `Напиши гид по региону только для загородного отдыха и поездок между городами субъекта.
Запрещено описывать достопримечательности, афишу и инфраструктуру города-центра из поля «Центр (ИСКЛЮЧИТЬ)».
Используй только города и площадки из контекста. Не выдумывай venues.
Верни строго JSON:
{
  "brief": "150-220 знаков",
  "topPlaces": [{ "name": "...", "desc": "...", "cityNames": ["ТочноеИмяГорода"] }],
  "faq": [{ "q": "...", "a": "..." }]
}
topPlaces: 2-4 карточки. faq: 2-3 вопроса про транспорт, сезонность или билеты.
cityNames — подмножество городов из контекста (точные строки имён).`;

function normalize(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}
