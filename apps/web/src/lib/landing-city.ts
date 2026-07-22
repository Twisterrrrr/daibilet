import type { PublicSessionDto } from '@daibilet/contracts/public';

const LANDING_CITY_SLUGS: Record<string, string> = {
  moscow: 'Москва',
  moskva: 'Москва',
  msk: 'Москва',
  spb: 'Санкт-Петербург',
  'saint-petersburg': 'Санкт-Петербург',
  'sankt-peterburg': 'Санкт-Петербург',
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
  sochi: 'Сочи',
  kaliningrad: 'Калининград',
  ekaterinburg: 'Екатеринбург',
  'rostov-na-donu': 'Ростов-на-Дону',
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

export function filterSessionsByGenre(sessions: PublicSessionDto[], genre?: string | null): PublicSessionDto[] {
  const tag = String(genre || '').trim();
  if (!tag || tag === 'all') return sessions;
  return sessions.filter((session) => session.tags.includes(tag));
}
