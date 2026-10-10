export type SearchGeoKind = 'city' | 'suburb' | 'satellite';

export type SearchGeoHit = {
  kind: SearchGeoKind;
  /** Formula A for satellites: `{City}, {Region} • Ближайшие события`. */
  label: string;
  /** `{City}, {Region}` for satellites; same as label for hubs/suburbs. */
  shortLabel: string;
  sublabel: string;
  slug: string;
  href: string;
  score: number;
};

export type CityRoutingConfig = {
  standaloneCities?: string[];
  cityToRegion?: Record<string, string>;
};

type SuburbEntry = {
  label: string;
  aliases: string[];
  parentSlug: string;
  parentName: string;
};

/** cityToRegion child: real municipality, not a palace suburb of the parent hub. */
type SatelliteEntry = {
  label: string;
  aliases: string[];
  citySlug: string;
  regionSlug: string;
  regionName: string;
};

/** Public hub path after Next aliases (`moskva` → `moscow`). */
const HUB_HREF_SLUG: Record<string, string> = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-on-don': 'rostov-na-donu',
};

const CITY_EXTRA_ALIASES: Record<string, string[]> = {
  'Санкт-Петербург': ['спб', 'питер', 'петербург', 'saint-petersburg', 'sankt-peterburg'],
  Москва: ['мск', 'moscow', 'moskva'],
  Екатеринбург: ['екб', 'екат'],
  'Нижний Новгород': ['нн', 'нижний'],
  'Ростов-на-Дону': ['ростов', 'ростов на дону'],
  'Великий Новгород': ['новгород'],
};

/**
 * Editorial day-trip anchors from cityInfo.significantSuburbs.
 * Palace / municipal parts of the parent city (Петергоф, Пушкин, Кронштадт).
 * Not City rows and not cityToRegion satellites (Раменское, Королёв, Выборг).
 */
const SUBURB_HITS: SuburbEntry[] = [
  {
    label: 'Петергоф',
    aliases: ['петергоф', 'петродворец', 'петергофа', 'нижний парк'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Царское Село',
    aliases: ['царское село', 'царское', 'пушкин', 'екатерининский дворец'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Кронштадт',
    aliases: ['кронштадт', 'остров фортов'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Гатчина',
    aliases: ['гатчина', 'гатчинский дворец'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Павловск',
    aliases: ['павловск', 'павловский дворец'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Ораниенбаум',
    aliases: ['ораниенбаум', 'ломоносов'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Стрельна',
    aliases: ['стрельна', 'константиновский дворец'],
    parentSlug: 'saint-petersburg',
    parentName: 'Санкт-Петербург',
  },
  {
    label: 'Сергиев Посад',
    aliases: ['сергиев посад', 'сергиев', 'лавра', 'троице-сергиева'],
    parentSlug: 'moscow',
    parentName: 'Москва',
  },
  {
    label: 'Истра',
    aliases: ['истра', 'новый иерусалим'],
    parentSlug: 'moscow',
    parentName: 'Москва',
  },
  {
    label: 'Коломна',
    aliases: ['коломна'],
    parentSlug: 'moscow',
    parentName: 'Москва',
  },
  {
    label: 'Светлогорск',
    aliases: ['светлогорск', 'раушен'],
    parentSlug: 'kaliningrad',
    parentName: 'Калининград',
  },
  {
    label: 'Зеленоградск',
    aliases: ['зеленоградск', 'кранц'],
    parentSlug: 'kaliningrad',
    parentName: 'Калининград',
  },
  {
    label: 'Куршская коса',
    aliases: ['куршская коса', 'куршская', 'дюна эфа'],
    parentSlug: 'kaliningrad',
    parentName: 'Калининград',
  },
];

/**
 * Extra search aliases for cityToRegion satellites (landmarks, not city names).
 * Выборг is a city in Ленинградская область, not an SPb municipal suburb.
 * SPb significantSuburbs card stays tourist content; events canonical is the region hub.
 */
const SATELLITE_ALIAS_EXTRAS: Record<string, string[]> = {
  vyborg: ['выборгский замок', 'монрепо'],
};

/** Catalog may store «Отрадное (Ленинградская область)» - strip before Formula A. */
function stripCityDisambiguator(name: string): string {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  return raw.replace(/\s*\([^)]*\)\s*$/u, '').trim() || raw;
}

export function childCityShortLabel(cityName: string, regionName: string): string {
  const city = stripCityDisambiguator(cityName) || String(cityName || '').trim();
  return `${city}, ${regionName}`;
}

/** Formula A: search label + region-hub H1. Not the indexed document title. */
export function childCityScopeLabel(cityName: string, regionName: string): string {
  return `${childCityShortLabel(cityName, regionName)} • Ближайшие события`;
}

/** Canonical satellite href. Always `?city=`, never `?city-slug`. */
export function regionChildCityHref(regionSlug: string, citySlug: string): string {
  const region = publicCitySlug(regionSlug) || String(regionSlug || '').trim();
  const city = publicCitySlug(citySlug) || String(citySlug || '').trim().toLowerCase();
  return `/cities/${region}?city=${encodeURIComponent(city)}`;
}

function readSearchParams(search: string | URLSearchParams): URLSearchParams {
  if (typeof search === 'string') {
    const trimmed = search.startsWith('?') ? search.slice(1) : search;
    return new URLSearchParams(trimmed);
  }
  return new URLSearchParams(search.toString());
}

/**
 * Child scope on a region hub.
 * Canonical: `?city=vyborg`. Also accepts the broken `?city-vyborg` (hyphen, empty value).
 */
export function parseRegionChildCityQuery(search: string | URLSearchParams): string | null {
  const params = readSearchParams(search);
  const explicit = String(params.get('city') || '').trim();
  if (explicit) return publicCitySlug(explicit) || explicit.toLowerCase();

  for (const [key, value] of params.entries()) {
    if (String(value || '').trim()) continue;
    const match = key.match(/^city-(.+)$/i);
    if (match?.[1]) return publicCitySlug(match[1]) || match[1].toLowerCase();
  }
  return null;
}

/** Rewrite `?city-vyborg` → `?city=vyborg`. Null if already canonical or no child token. */
export function canonicalizeRegionChildCitySearch(search: string | URLSearchParams): URLSearchParams | null {
  const params = readSearchParams(search);
  const slug = parseRegionChildCityQuery(params);
  if (!slug) return null;
  const current = String(params.get('city') || '').trim();
  const hasBroken = [...params.keys()].some((key) => /^city-/i.test(key) && !String(params.get(key) || '').trim());
  if (current === slug && !hasBroken) return null;
  const next = new URLSearchParams(params.toString());
  for (const key of [...next.keys()]) {
    if (/^city-/i.test(key) && !String(next.get(key) || '').trim()) next.delete(key);
  }
  next.set('city', slug);
  return next;
}

export function publicCitySlug(value?: string | null): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => letters[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function hubHrefSlug(nameOrSlug: string): string {
  const raw = publicCitySlug(nameOrSlug) || String(nameOrSlug || '').trim().toLowerCase();
  return HUB_HREF_SLUG[raw] || raw;
}

function norm(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function aliasScore(alias: string, term: string, allowContains = true): number {
  const a = norm(alias);
  const t = norm(term);
  if (!a || !t || t.length < 2) return 0;
  if (a === t) return 100;
  if (a.startsWith(t)) return 80;
  if (allowContains && t.length >= 4 && a.includes(t)) return 50;
  return 0;
}

function bestScore(aliases: string[], terms: string[], allowContains = true): number {
  let best = 0;
  for (const term of terms) {
    for (const alias of aliases) {
      best = Math.max(best, aliasScore(alias, term, allowContains));
    }
  }
  return best;
}

function isEditorialSuburbName(name: string): boolean {
  const needle = norm(name);
  if (!needle) return false;
  return SUBURB_HITS.some(
    (suburb) =>
      norm(suburb.label) === needle || suburb.aliases.some((alias) => norm(alias) === needle),
  );
}

function suburbFocusHref(suburb: SuburbEntry): string {
  const focus = publicCitySlug(suburb.label);
  const base = `/cities/${suburb.parentSlug}/`;
  return focus ? `${base}?suburb=${encodeURIComponent(focus)}#city-suburbs` : `${base}#city-suburbs`;
}

/**
 * cityToRegion children that are not editorial palace suburbs and do not fold
 * into a standalone parent city (Пушкин→СПб, Зеленоград→Москва).
 */
function satelliteHitsFromRouting(routing: CityRoutingConfig): SatelliteEntry[] {
  const standaloneCities = routing.standaloneCities || [];
  const cityToRegion = routing.cityToRegion || {};
  const standalone = new Set(standaloneCities.map(norm));
  const out: SatelliteEntry[] = [];
  const seen = new Set<string>();
  for (const [cityName, regionName] of Object.entries(cityToRegion)) {
    if (standalone.has(norm(cityName))) continue;
    if (standalone.has(norm(regionName))) continue;
    if (isEditorialSuburbName(cityName)) continue;
    const citySlug = publicCitySlug(cityName);
    const regionSlug = publicCitySlug(regionName);
    if (!citySlug || !regionSlug) continue;
    const key = `${regionSlug}:${citySlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: cityName,
      aliases: [cityName, citySlug, ...(SATELLITE_ALIAS_EXTRAS[citySlug] || [])],
      citySlug,
      regionSlug,
      regionName,
    });
  }
  return out;
}

function matchHits(
  standaloneCities: string[],
  satellites: SatelliteEntry[],
  terms: string[],
  limit: number,
): SearchGeoHit[] {
  const needles = terms.map(norm).filter((term) => term.length >= 2);
  if (!needles.length) return [];

  const hits: SearchGeoHit[] = [];

  for (const name of standaloneCities) {
    const slug = hubHrefSlug(name);
    const aliases = [name, publicCitySlug(name), slug, ...(CITY_EXTRA_ALIASES[name] || [])];
    const score = bestScore(aliases, needles);
    if (!score) continue;
    hits.push({
      kind: 'city',
      label: name,
      shortLabel: name,
      sublabel: 'Город',
      slug,
      href: `/cities/${slug}`,
      score,
    });
  }

  for (const suburb of SUBURB_HITS) {
    const aliases = [suburb.label, ...suburb.aliases];
    const score = bestScore(aliases, needles);
    if (!score) continue;
    hits.push({
      kind: 'suburb',
      label: suburb.label,
      shortLabel: suburb.label,
      sublabel: `Пригород · ${suburb.parentName}`,
      slug: suburb.parentSlug,
      href: suburbFocusHref(suburb),
      score,
    });
  }

  for (const satellite of satellites) {
    const aliases = [satellite.label, ...satellite.aliases];
    const score = bestScore(aliases, needles, false);
    if (!score) continue;
    const shortLabel = childCityShortLabel(satellite.label, satellite.regionName);
    hits.push({
      kind: 'satellite',
      label: childCityScopeLabel(satellite.label, satellite.regionName),
      shortLabel,
      sublabel: 'Город области',
      slug: satellite.regionSlug,
      href: regionChildCityHref(satellite.regionSlug, satellite.citySlug),
      score,
    });
  }

  hits.sort(
    (left, right) =>
      right.score - left.score ||
      Number(left.kind === 'suburb') - Number(right.kind === 'suburb') ||
      left.label.localeCompare(right.label, 'ru'),
  );

  const seen = new Set<string>();
  const out: SearchGeoHit[] = [];
  for (const hit of hits) {
    const key = `${hit.kind}:${hit.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Geo hits for header and /cities catalog search: standalone hubs + editorial suburbs
 * + cityToRegion satellites. Formula A label `{City}, {Region} • Ближайшие события`.
 * href `/cities/{regionSlug}?city={citySlug}` - UX-скоуп, не indexed document.
 * Palace suburbs stay on the parent hub `#city-suburbs` (with ?suburb= focus).
 * Выборг is not an SPb suburb: `/cities/leningradskaya-oblast?city=vyborg`.
 */
export function matchSearchGeoHitsWithRouting(
  routing: CityRoutingConfig,
  terms: string[],
  limit = 2,
): SearchGeoHit[] {
  return matchHits(
    routing.standaloneCities || [],
    satelliteHitsFromRouting(routing),
    terms,
    limit,
  );
}

export function createSearchGeoMatcher(routing: CityRoutingConfig) {
  const standaloneCities = routing.standaloneCities || [];
  const satellites = satelliteHitsFromRouting(routing);
  return (terms: string[], limit = 2): SearchGeoHit[] =>
    matchHits(standaloneCities, satellites, terms, limit);
}
