/**
 * Single source of truth for which cities are tourist hubs.
 *
 * Before this, hub membership lived in three hand-maintained lists that had
 * drifted apart: TOURIST_AFFICHE_SLUGS (10), STRONG_CITY_SLUGS (16) and one
 * `<city>-hub.ts` content pack per city (26 files). The drift is not cosmetic -
 * `moscova` and `moskva` appear in different lists with different casing, and
 * the city exists twice in the database as a result.
 *
 * The content packs (per-city must-see routes) stay where they are; this module
 * only records which cities exist as hubs and derives the lists the rest of the
 * app still imports.
 *
 * Adding a hub means adding one row here, not editing three files.
 */

export type HubEntry = {
  /** Canonical slug as stored in City.slug. */
  slug: string;
  /** Russian name, for admin and reports. */
  title: string;
  /** Has a `<slug>-hub.ts` must-see content pack. */
  hasPack: boolean;
  /** Show the tourist affiche tab. */
  affiche: boolean;
  /** Indexable regardless of the event-count floor. */
  strong: boolean;
};

/**
 * `moscova`/`moskva` and `sankt-peterburg`/`saint-petersburg` both exist as slug
 * variants. The canonical spelling is the Cyrillic one used by the database;
 * aliases exist so a URL written in either spelling still resolves to a hub.
 */
export const CITY_HUBS: readonly HubEntry[] = [
  { slug: 'moskva', title: 'Москва', hasPack: false, affiche: true, strong: true },
  { slug: 'санкт-петербург', title: 'Санкт-Петербург', hasPack: false, affiche: true, strong: true },
  { slug: 'ekaterinburg', title: 'Екатеринбург', hasPack: true, affiche: true, strong: true },
  { slug: 'kazan', title: 'Казань', hasPack: true, affiche: true, strong: true },
  { slug: 'nizhniy-novgorod', title: 'Нижний Новгород', hasPack: false, affiche: true, strong: true },
  { slug: 'samara', title: 'Самара', hasPack: true, affiche: true, strong: true },
  { slug: 'novosibirsk', title: 'Новосибирск', hasPack: true, affiche: false, strong: true },
  { slug: 'krasnodar', title: 'Краснодар', hasPack: true, affiche: true, strong: true },
  { slug: 'sochi', title: 'Сочи', hasPack: true, affiche: false, strong: true },
  { slug: 'kaliningrad', title: 'Калининград', hasPack: false, affiche: true, strong: true },
  { slug: 'krasnoyarsk', title: 'Красноярск', hasPack: true, affiche: true, strong: false },
  { slug: 'perm', title: 'Пермь', hasPack: true, affiche: true, strong: true },
  { slug: 'yaroslavl', title: 'Ярославль', hasPack: true, affiche: false, strong: true },
  { slug: 'vladimir', title: 'Владимир', hasPack: false, affiche: false, strong: true },
  { slug: 'chelyabinsk', title: 'Челябинск', hasPack: true, affiche: false, strong: false },
  { slug: 'rostov-na-donu', title: 'Ростов-на-Дону', hasPack: true, affiche: false, strong: false },
  { slug: 'volgograd', title: 'Волгоград', hasPack: true, affiche: false, strong: false },
  { slug: 'voronezh', title: 'Воронеж', hasPack: true, affiche: false, strong: false },
  { slug: 'ufa', title: 'Уфа', hasPack: true, affiche: false, strong: false },
  { slug: 'ryazan', title: 'Рязань', hasPack: true, affiche: false, strong: false },
  { slug: 'tula', title: 'Тула', hasPack: true, affiche: false, strong: false },
  { slug: 'tyumen', title: 'Тюмень', hasPack: true, affiche: false, strong: false },
  { slug: 'saratov', title: 'Саратов', hasPack: true, affiche: false, strong: false },
  { slug: 'smolensk', title: 'Смоленск', hasPack: true, affiche: false, strong: false },
  { slug: 'tver', title: 'Тверь', hasPack: true, affiche: false, strong: false },
  { slug: 'tolyatti', title: 'Тольятти', hasPack: true, affiche: false, strong: false },
  { slug: 'barnaul', title: 'Барнаул', hasPack: true, affiche: false, strong: false },
  { slug: 'omsk', title: 'Омск', hasPack: true, affiche: false, strong: false },
  { slug: 'penza', title: 'Пенза', hasPack: true, affiche: false, strong: false },
  { slug: 'surgut', title: 'Сургут', hasPack: true, affiche: false, strong: false },
  { slug: 'vladikavkaz', title: 'Владикавказ', hasPack: true, affiche: false, strong: false },
];

/** Spelling variants that must resolve to the same hub. */
export const CITY_HUB_SLUG_ALIASES: Readonly<Record<string, string>> = {
  moscow: 'moskva',
  'moscow-saint-petersburg': 'санкт-петербург',
  'saint-petersburg': 'санкт-петербург',
  'sankt-peterburg': 'санкт-петербург',
  санктпетербург: 'санкт-петербург',
  'nizhny-novgorod': 'nizhniy-novgorod',
  ekaterinburg: 'ekaterinburg',
};

function baseSlug(value: string | null | undefined): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (CITY_HUB_SLUG_ALIASES[raw]) return CITY_HUB_SLUG_ALIASES[raw];
  // Accept a full places path such as /places/c/moscow: take the segment that is
  // actually the city, not the first path component.
  const segments = raw.split('/').filter(Boolean);
  for (const segment of segments) {
    if (CITY_HUB_SLUG_ALIASES[segment]) return CITY_HUB_SLUG_ALIASES[segment];
    if (CITY_HUBS.some((hub) => hub.slug === segment)) return segment;
  }
  return segments[segments.length - 1] || raw;
}

export function resolveHubSlug(value: string | null | undefined): string {
  return baseSlug(value);
}

export function findCityHub(value: string | null | undefined): HubEntry | null {
  const slug = resolveHubSlug(value);
  return CITY_HUBS.find((hub) => hub.slug === slug) || null;
}

export function isCityHub(value: string | null | undefined): boolean {
  return findCityHub(value) !== null;
}

export function isCityHubAffiche(value: string | null | undefined): boolean {
  return findCityHub(value)?.affiche === true;
}

export function isStrongCityHub(value: string | null | undefined): boolean {
  return findCityHub(value)?.strong === true;
}

export function hasCityHubContentPack(value: string | null | undefined): boolean {
  return findCityHub(value)?.hasPack === true;
}

export function listCityHubSlugs(): string[] {
  return CITY_HUBS.map((hub) => hub.slug);
}