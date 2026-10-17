/**
 * Guest «мои сценарии» for /my-day - localStorage named snapshots (Lovable parity MVP).
 */

import {
  buildDayRouteSharePath,
  clearDayRoute,
  createTextDayRouteStopId,
  hydrateDayRouteFromShare,
  parseDayRouteItemsParam,
  readDayRouteFresh,
  type DayRouteTravelMode,
  type DayRouteVenueItem,
  writeDayRoute,
} from './day-route';

export const DAY_ROUTE_SCENARIOS_KEY = 'daibilet:my-day-scenarios';

export type DayRouteSavedScenario = {
  id: string;
  name: string;
  title: string;
  citySlug: string | null;
  cityName: string | null;
  /** Share-format items param. */
  items: string;
  travelMode: DayRouteTravelMode;
  hourStart: string;
  hourEnd: string;
  hourPlanOn: boolean;
  savedAt: number;
};

function safeParse(raw: string | null): DayRouteSavedScenario[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => {
        const r = row as Partial<DayRouteSavedScenario>;
        if (!r || typeof r.id !== 'string' || typeof r.name !== 'string') return null;
        return {
          id: r.id,
          name: String(r.name).trim(),
          title: String(r.title || r.name).trim(),
          citySlug: r.citySlug ? String(r.citySlug) : null,
          cityName: r.cityName ? String(r.cityName) : null,
          items: String(r.items || ''),
          travelMode: r.travelMode === 'auto' ? 'auto' : 'walk',
          hourStart: String(r.hourStart || '10:00'),
          hourEnd: String(r.hourEnd || '22:00'),
          hourPlanOn: Boolean(r.hourPlanOn),
          savedAt: Number(r.savedAt) || Date.now(),
        } satisfies DayRouteSavedScenario;
      })
      .filter(Boolean) as DayRouteSavedScenario[];
  } catch {
    return [];
  }
}

export function readDayRouteScenarios(): DayRouteSavedScenario[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse(localStorage.getItem(DAY_ROUTE_SCENARIOS_KEY));
  } catch {
    return [];
  }
}

export function writeDayRouteScenarios(list: DayRouteSavedScenario[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAY_ROUTE_SCENARIOS_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    // ignore quota
  }
}

export function filterDayRouteScenariosByCity(
  list: DayRouteSavedScenario[],
  citySlug?: string | null,
): DayRouteSavedScenario[] {
  const key = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (!key) return list;
  return list.filter((row) => {
    const slug = String(row.citySlug || '')
      .trim()
      .toLowerCase();
    return !slug || slug === key;
  });
}

export function saveDayRouteScenario(input: {
  name: string;
  citySlug?: string | null;
  cityName?: string | null;
  venues: DayRouteVenueItem[];
  travelMode: DayRouteTravelMode;
  hourStart: string;
  hourEnd: string;
  hourPlanOn: boolean;
}): DayRouteSavedScenario | null {
  const name = String(input.name || '').trim();
  if (!name || !input.venues.length) return null;
  const path = buildDayRouteSharePath(input.venues, { citySlug: input.citySlug || null });
  const items = new URL(path, 'https://daibilet.ru').searchParams.get('items') || '';
  if (!items) return null;
  const entry: DayRouteSavedScenario = {
    id: `scn_${Date.now()}`,
    name,
    title: `${input.cityName || 'Город'}: ${input.venues.length} точек`,
    citySlug: input.citySlug || null,
    cityName: input.cityName || null,
    items,
    travelMode: input.travelMode,
    hourStart: input.hourStart,
    hourEnd: input.hourEnd,
    hourPlanOn: input.hourPlanOn,
    savedAt: Date.now(),
  };
  const prev = readDayRouteScenarios().filter((s) => s.name !== name);
  writeDayRouteScenarios([entry, ...prev]);
  return entry;
}

export function removeDayRouteScenario(id: string): void {
  writeDayRouteScenarios(readDayRouteScenarios().filter((s) => s.id !== id));
}

/**
 * Apply scenario into local day-route bucket. Returns venues count applied.
 * Catalog titles may be stubs until enrich runs in the panel.
 */
export function applyDayRouteScenario(scenario: DayRouteSavedScenario): number {
  const tokens = parseDayRouteItemsParam(scenario.items);
  if (!tokens.length) return 0;
  // Prefer share hydrate path: text tokens + catalog locators as stubs.
  const venues: DayRouteVenueItem[] = [];
  for (const token of tokens) {
    if (token.isText) {
      const title = token.id.toLowerCase().startsWith('t:') ? token.id.slice(2) : token.id;
      venues.push({
        id: createTextDayRouteStopId(),
        title: title || 'Место',
        slug: null,
        href: null,
      });
      continue;
    }
    venues.push({
      id: token.id,
      slug: token.id,
      title: 'Место из сценария',
      href: `/venues/${encodeURIComponent(token.id)}`,
    });
  }
  if (!venues.length) return 0;
  clearDayRoute();
  const next = hydrateDayRouteFromShare(venues, null);
  writeDayRoute(next);
  return readDayRouteFresh().venues.length;
}
