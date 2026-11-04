/**
 * Канонические citySlug блога / CMS и алиасы для City.slug в БД.
 * Phase 3: точная привязка Article.citySlug.
 */

const CANONICAL_ALIASES = {
  'saint-petersburg': ['saint-petersburg', 'sankt-peterburg', 'spb', 'petersburg', 'peterburg'],
  moscow: ['moscow', 'moskva', 'msk'],
  kazan: ['kazan'],
  'nizhny-novgorod': ['nizhny-novgorod', 'nizhniy-novgorod'],
  ekaterinburg: ['ekaterinburg', 'yekaterinburg'],
};

const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES)) {
  for (const alias of aliases) ALIAS_TO_CANONICAL.set(alias, canonical);
  ALIAS_TO_CANONICAL.set(canonical, canonical);
}

/** Pseudo-города без строки в City. */
export const BROAD_BLOG_CITY_SLUGS = new Set(['multi', 'regions', 'region', 'russia', 'all']);

export const BLOG_CITY_DISPLAY_NAMES = {
  moscow: 'Москва',
  'saint-petersburg': 'Санкт-Петербург',
  kazan: 'Казань',
  ekaterinburg: 'Екатеринбург',
  kaliningrad: 'Калининград',
  'nizhny-novgorod': 'Нижний Новгород',
  ufa: 'Уфа',
  perm: 'Пермь',
  sochi: 'Сочи',
  chelyabinsk: 'Челябинск',
  yaroslavl: 'Ярославль',
  'rostov-on-don': 'Ростов-на-Дону',
  novosibirsk: 'Новосибирск',
  krasnoyarsk: 'Красноярск',
  samara: 'Самара',
};

const PSEUDO_CITY_NAMES = new Set(['Регионы', 'Несколько городов', 'Без города']);

/** Display name for public article DTO: slug wins over a missing City join. */
export function blogCityDisplayName(citySlug, fallbackName) {
  const slug = canonicalBlogCitySlug(citySlug);
  if (slug && BLOG_CITY_DISPLAY_NAMES[slug]) return BLOG_CITY_DISPLAY_NAMES[slug];
  const name = String(fallbackName || '').trim();
  if (name && !PSEUDO_CITY_NAMES.has(name)) return name;
  return null;
}

export function canonicalBlogCitySlug(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!raw) return null;
  if (BROAD_BLOG_CITY_SLUGS.has(raw)) return raw === 'region' ? 'regions' : raw;
  return ALIAS_TO_CANONICAL.get(raw) || raw;
}

/** Все slug (канон + DB aliases), по которым ищем совпадение. */
export function blogCitySlugAliases(value) {
  const canonical = canonicalBlogCitySlug(value);
  if (!canonical) return [];
  if (BROAD_BLOG_CITY_SLUGS.has(canonical)) return [canonical];
  return CANONICAL_ALIASES[canonical] || [canonical];
}

export function isBroadBlogCitySlug(value) {
  const canonical = canonicalBlogCitySlug(value);
  return Boolean(canonical && BROAD_BLOG_CITY_SLUGS.has(canonical));
}

export function blogCitySlugsMatch(left, right) {
  const a = canonicalBlogCitySlug(left);
  const b = canonicalBlogCitySlug(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const leftSet = new Set(blogCitySlugAliases(a));
  return blogCitySlugAliases(b).some((slug) => leftSet.has(slug));
}
