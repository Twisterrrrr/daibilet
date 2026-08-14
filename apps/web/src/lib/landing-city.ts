import type { PublicSessionDto, PublicVenueDto } from '@daibilet/contracts/public';

/**
 * City slug → display name for multi-city landings / hub filters.
 * Must cover all public destination city slugs; a short priority allowlist
 * previously made `/kontserty/krasnodar` look national (no city SEO / soft filter).
 */
export const LANDING_CITY_SLUGS: Record<string, string> = {
  moscow: 'Москва',
  moskva: 'Москва',
  msk: 'Москва',
  spb: 'Санкт-Петербург',
  'saint-petersburg': 'Санкт-Петербург',
  'sankt-peterburg': 'Санкт-Петербург',
  peterburg: 'Санкт-Петербург',
  kazan: 'Казань',
  'nizhny-novgorod': 'Нижний Новгород',
  'nizhniy-novgorod': 'Нижний Новгород',
  samara: 'Самара',
  volgograd: 'Волгоград',
  yaroslavl: 'Ярославль',
  krasnoyarsk: 'Красноярск',
  perm: 'Пермь',
  novosibirsk: 'Новосибирск',
  tver: 'Тверь',
  rostov: 'Ростов-на-Дону',
  'rostov-on-don': 'Ростов-на-Дону',
  'rostov-na-donu': 'Ростов-на-Дону',
  sochi: 'Сочи',
  kaliningrad: 'Калининград',
  ekaterinburg: 'Екатеринбург',
  abakan: 'Абакан',
  arhangelsk: 'Архангельск',
  astrahan: 'Астрахань',
  barnaul: 'Барнаул',
  belgorod: 'Белгород',
  'blagoveschensk-amurskaya-oblast': 'Благовещенск (Амурская область)',
  bryansk: 'Брянск',
  cheboksary: 'Чебоксары',
  chelyabinsk: 'Челябинск',
  chita: 'Чита',
  habarovsk: 'Хабаровск',
  irkutsk: 'Иркутск',
  ivanovo: 'Иваново',
  izhevsk: 'Ижевск',
  kaluga: 'Калуга',
  kemerovo: 'Кемерово',
  'kirov-kirovskaya-oblast': 'Киров (Кировская область)',
  kostroma: 'Кострома',
  krasnodar: 'Краснодар',
  kurgan: 'Курган',
  kursk: 'Курск',
  lipeck: 'Липецк',
  murmansk: 'Мурманск',
  omsk: 'Омск',
  orel: 'Орёл',
  orenburg: 'Оренбург',
  penza: 'Пенза',
  pskov: 'Псков',
  ryazan: 'Рязань',
  saransk: 'Саранск',
  saratov: 'Саратов',
  sevastopol: 'Севастополь',
  simferopol: 'Симферополь',
  smolensk: 'Смоленск',
  stavropol: 'Ставрополь',
  syktyvkar: 'Сыктывкар',
  tambov: 'Тамбов',
  tomsk: 'Томск',
  tula: 'Тула',
  tyumen: 'Тюмень',
  ufa: 'Уфа',
  'ulan-ude': 'Улан-Удэ',
  ulyanovsk: 'Ульяновск',
  'velikiy-novgorod': 'Великий Новгород',
  'veliky-novgorod': 'Великий Новгород',
  vladimir: 'Владимир',
  vladivostok: 'Владивосток',
  vologda: 'Вологда',
  voronezh: 'Воронеж',
  'yoshkar-ola': 'Йошкар-Ола',
  'yuzhno-sahalinsk': 'Южно-Сахалинск',
};

export function resolveLandingCityName(citySlug?: string | null): string | null {
  const key = String(citySlug || '').trim().toLowerCase();
  if (!key) return null;
  return LANDING_CITY_SLUGS[key] || null;
}

function resolveSessionCityName(session: PublicSessionDto): string {
  if (session.city && session.city !== 'Не указан') return session.city;
  if (session.destination && session.destination !== 'Не указан') return session.destination;
  return session.city || 'Не указан';
}

export function filterSessionsByCity(
  sessions: PublicSessionDto[],
  cityName: string | null,
  citySlug?: string | null,
): PublicSessionDto[] {
  const slug = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (slug) {
    const aliases = new Set(
      Object.entries(LANDING_CITY_SLUGS)
        .filter(([, name]) => name === (cityName || LANDING_CITY_SLUGS[slug]))
        .map(([key]) => key),
    );
    aliases.add(slug);
    // moscow ↔ moskva etc. already in LANDING_CITY_SLUGS keys for same name
    return sessions.filter((session) => {
      const sessionSlug = String(session.citySlug || '')
        .trim()
        .toLowerCase();
      if (sessionSlug && aliases.has(sessionSlug)) return true;
      if (cityName && resolveSessionCityName(session) === cityName) return true;
      return false;
    });
  }
  if (!cityName) return sessions;
  return sessions.filter((session) => resolveSessionCityName(session) === cityName);
}

export function filterVenuesByCity(
  venues: PublicVenueDto[],
  cityName: string | null,
  citySlug?: string | null,
): PublicVenueDto[] {
  const slug = String(citySlug || '')
    .trim()
    .toLowerCase();
  const resolvedName = cityName || (slug ? LANDING_CITY_SLUGS[slug] : null);
  if (!resolvedName && !slug) return venues;

  const aliases = new Set<string>();
  if (slug) {
    for (const [key, name] of Object.entries(LANDING_CITY_SLUGS)) {
      if (name === resolvedName) aliases.add(key);
    }
    aliases.add(slug);
  }

  return venues.filter((venue) => {
    const venueCity = String(venue.city || '').trim();
    if (!venueCity || venueCity === 'Не указан') return false;
    if (resolvedName && venueCity === resolvedName) return true;
    if (slug) {
      const venueSlug = venueCity
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
      if (aliases.has(venueSlug)) return true;
    }
    return false;
  });
}

export function resolveCatalogCityLabel(city?: string | null): string | null {
  const raw = String(city || '').trim();
  if (!raw || raw === 'all') return null;
  return resolveLandingCityName(raw) || raw;
}

export function filterSessionsByGenre(sessions: PublicSessionDto[], genre?: string | null): PublicSessionDto[] {
  const tag = String(genre || '').trim();
  if (!tag || tag === 'all') return sessions;
  return sessions.filter((session) => session.tags.includes(tag));
}
