/**
 * City-center coordinates for `/cities` OSM overview map.
 * Keys: API destination slugs + SEO aliases (`normalizeCitySlug`) + transliterated names.
 * Covers standalone live cities from `data/geo/city-routing.ru.json`.
 */

export type CityMapCoords = { latitude: number; longitude: number };

/** Approximate city centers (WGS84). */
const CITY_CENTER_BY_SLUG: Record<string, CityMapCoords> = {
  // Capitals / major hubs (API + SEO)
  moskva: { latitude: 55.7558, longitude: 37.6173 },
  moscow: { latitude: 55.7558, longitude: 37.6173 },
  'sankt-peterburg': { latitude: 59.9343, longitude: 30.3351 },
  'saint-petersburg': { latitude: 59.9343, longitude: 30.3351 },
  kazan: { latitude: 55.7961, longitude: 49.1064 },
  krasnodar: { latitude: 45.0355, longitude: 38.9753 },
  krasnoyarsk: { latitude: 56.0153, longitude: 92.8932 },
  abakan: { latitude: 53.7211, longitude: 91.4425 },
  ulyanovsk: { latitude: 54.3142, longitude: 48.4031 },
  vladivostok: { latitude: 43.1155, longitude: 131.8855 },
  habarovsk: { latitude: 48.4827, longitude: 135.0838 },
  khabarovsk: { latitude: 48.4827, longitude: 135.0838 },
  samara: { latitude: 53.1959, longitude: 50.1002 },
  chelyabinsk: { latitude: 55.1644, longitude: 61.4368 },
  ufa: { latitude: 54.7388, longitude: 55.9721 },
  barnaul: { latitude: 53.3548, longitude: 83.7698 },
  arhangelsk: { latitude: 64.5393, longitude: 40.5187 },
  arkhangelsk: { latitude: 64.5393, longitude: 40.5187 },
  astrahan: { latitude: 46.3497, longitude: 48.0408 },
  astrakhan: { latitude: 46.3497, longitude: 48.0408 },
  belgorod: { latitude: 50.5951, longitude: 36.5873 },
  'blagoveschensk-amurskaya-oblast': { latitude: 50.2905, longitude: 127.5272 },
  blagoveshchensk: { latitude: 50.2905, longitude: 127.5272 },
  bryansk: { latitude: 53.2434, longitude: 34.3654 },
  'velikiy-novgorod': { latitude: 58.5228, longitude: 31.2698 },
  'veliky-novgorod': { latitude: 58.5228, longitude: 31.2698 },
  vladimir: { latitude: 56.129, longitude: 40.407 },
  volgograd: { latitude: 48.708, longitude: 44.5133 },
  vologda: { latitude: 59.2205, longitude: 39.8915 },
  voronezh: { latitude: 51.672, longitude: 39.1843 },
  ekaterinburg: { latitude: 56.8389, longitude: 60.6057 },
  ivanovo: { latitude: 56.9972, longitude: 40.9714 },
  izhevsk: { latitude: 56.8527, longitude: 53.2115 },
  irkutsk: { latitude: 52.2869, longitude: 104.305 },
  'yoshkar-ola': { latitude: 56.6344, longitude: 47.8999 },
  kaliningrad: { latitude: 54.7104, longitude: 20.4522 },
  kaluga: { latitude: 54.5137, longitude: 36.2613 },
  kemerovo: { latitude: 55.3549, longitude: 86.0884 },
  'kirov-kirovskaya-oblast': { latitude: 58.6035, longitude: 49.668 },
  kirov: { latitude: 58.6035, longitude: 49.668 },
  kostroma: { latitude: 57.7678, longitude: 40.9269 },
  kurgan: { latitude: 55.4444, longitude: 65.3163 },
  kursk: { latitude: 51.7304, longitude: 36.1926 },
  lipeck: { latitude: 52.6088, longitude: 39.5992 },
  lipetsk: { latitude: 52.6088, longitude: 39.5992 },
  murmansk: { latitude: 68.9585, longitude: 33.0827 },
  'nizhniy-novgorod': { latitude: 56.2965, longitude: 43.9361 },
  'nizhny-novgorod': { latitude: 56.2965, longitude: 43.9361 },
  novosibirsk: { latitude: 55.0084, longitude: 82.9357 },
  omsk: { latitude: 54.9885, longitude: 73.3242 },
  orel: { latitude: 52.9707, longitude: 36.0643 },
  orenburg: { latitude: 51.7682, longitude: 55.097 },
  penza: { latitude: 53.195, longitude: 45.0183 },
  perm: { latitude: 58.0105, longitude: 56.2502 },
  pskov: { latitude: 57.8193, longitude: 28.3318 },
  'rostov-na-donu': { latitude: 47.2357, longitude: 39.7015 },
  'rostov-on-don': { latitude: 47.2357, longitude: 39.7015 },
  ryazan: { latitude: 54.6269, longitude: 39.6916 },
  saransk: { latitude: 54.1838, longitude: 45.1749 },
  saratov: { latitude: 51.5336, longitude: 46.0343 },
  sevastopol: { latitude: 44.6167, longitude: 33.5254 },
  simferopol: { latitude: 44.9521, longitude: 34.1024 },
  smolensk: { latitude: 54.7826, longitude: 32.0453 },
  sochi: { latitude: 43.6028, longitude: 39.7342 },
  stavropol: { latitude: 45.0428, longitude: 41.9734 },
  syktyvkar: { latitude: 61.6688, longitude: 50.8364 },
  tambov: { latitude: 52.7213, longitude: 41.4525 },
  tver: { latitude: 56.8587, longitude: 35.9176 },
  tomsk: { latitude: 56.4846, longitude: 84.9476 },
  tula: { latitude: 54.1931, longitude: 37.6173 },
  tyumen: { latitude: 57.1522, longitude: 65.5272 },
  'ulan-ude': { latitude: 51.8335, longitude: 107.5841 },
  cheboksary: { latitude: 56.1439, longitude: 47.2489 },
  chita: { latitude: 52.0515, longitude: 113.4712 },
  'yuzhno-sahalinsk': { latitude: 46.9641, longitude: 142.738 },
  yaroslavl: { latitude: 57.6261, longitude: 39.8845 },
};

const CITY_CENTER_BY_NAME: Record<string, CityMapCoords> = {
  москва: CITY_CENTER_BY_SLUG.moskva,
  'санкт-петербург': CITY_CENTER_BY_SLUG['sankt-peterburg'],
  казань: CITY_CENTER_BY_SLUG.kazan,
  краснодар: CITY_CENTER_BY_SLUG.krasnodar,
  красноярск: CITY_CENTER_BY_SLUG.krasnoyarsk,
  абакан: CITY_CENTER_BY_SLUG.abakan,
  ульяновск: CITY_CENTER_BY_SLUG.ulyanovsk,
  владивосток: CITY_CENTER_BY_SLUG.vladivostok,
  хабаровск: CITY_CENTER_BY_SLUG.habarovsk,
  самара: CITY_CENTER_BY_SLUG.samara,
  челябинск: CITY_CENTER_BY_SLUG.chelyabinsk,
  уфа: CITY_CENTER_BY_SLUG.ufa,
  барнаул: CITY_CENTER_BY_SLUG.barnaul,
  архангельск: CITY_CENTER_BY_SLUG.arhangelsk,
  астрахань: CITY_CENTER_BY_SLUG.astrahan,
  белгород: CITY_CENTER_BY_SLUG.belgorod,
  'благовещенск (амурская область)': CITY_CENTER_BY_SLUG['blagoveschensk-amurskaya-oblast'],
  благовещенск: CITY_CENTER_BY_SLUG['blagoveschensk-amurskaya-oblast'],
  брянск: CITY_CENTER_BY_SLUG.bryansk,
  'великий новгород': CITY_CENTER_BY_SLUG['velikiy-novgorod'],
  владимир: CITY_CENTER_BY_SLUG.vladimir,
  волгоград: CITY_CENTER_BY_SLUG.volgograd,
  вологда: CITY_CENTER_BY_SLUG.vologda,
  воронеж: CITY_CENTER_BY_SLUG.voronezh,
  екатеринбург: CITY_CENTER_BY_SLUG.ekaterinburg,
  иваново: CITY_CENTER_BY_SLUG.ivanovo,
  ижевск: CITY_CENTER_BY_SLUG.izhevsk,
  иркутск: CITY_CENTER_BY_SLUG.irkutsk,
  'йошкар-ола': CITY_CENTER_BY_SLUG['yoshkar-ola'],
  калининград: CITY_CENTER_BY_SLUG.kaliningrad,
  калуга: CITY_CENTER_BY_SLUG.kaluga,
  кемерово: CITY_CENTER_BY_SLUG.kemerovo,
  'киров (кировская область)': CITY_CENTER_BY_SLUG['kirov-kirovskaya-oblast'],
  киров: CITY_CENTER_BY_SLUG['kirov-kirovskaya-oblast'],
  кострома: CITY_CENTER_BY_SLUG.kostroma,
  курган: CITY_CENTER_BY_SLUG.kurgan,
  курск: CITY_CENTER_BY_SLUG.kursk,
  липецк: CITY_CENTER_BY_SLUG.lipeck,
  мурманск: CITY_CENTER_BY_SLUG.murmansk,
  'нижний новгород': CITY_CENTER_BY_SLUG['nizhniy-novgorod'],
  новосибирск: CITY_CENTER_BY_SLUG.novosibirsk,
  омск: CITY_CENTER_BY_SLUG.omsk,
  орёл: CITY_CENTER_BY_SLUG.orel,
  орел: CITY_CENTER_BY_SLUG.orel,
  оренбург: CITY_CENTER_BY_SLUG.orenburg,
  пенза: CITY_CENTER_BY_SLUG.penza,
  пермь: CITY_CENTER_BY_SLUG.perm,
  псков: CITY_CENTER_BY_SLUG.pskov,
  'ростов-на-дону': CITY_CENTER_BY_SLUG['rostov-na-donu'],
  рязань: CITY_CENTER_BY_SLUG.ryazan,
  саранск: CITY_CENTER_BY_SLUG.saransk,
  саратов: CITY_CENTER_BY_SLUG.saratov,
  севастополь: CITY_CENTER_BY_SLUG.sevastopol,
  симферополь: CITY_CENTER_BY_SLUG.simferopol,
  смоленск: CITY_CENTER_BY_SLUG.smolensk,
  сочи: CITY_CENTER_BY_SLUG.sochi,
  ставрополь: CITY_CENTER_BY_SLUG.stavropol,
  сыктывкар: CITY_CENTER_BY_SLUG.syktyvkar,
  тамбов: CITY_CENTER_BY_SLUG.tambov,
  тверь: CITY_CENTER_BY_SLUG.tver,
  томск: CITY_CENTER_BY_SLUG.tomsk,
  тула: CITY_CENTER_BY_SLUG.tula,
  тюмень: CITY_CENTER_BY_SLUG.tyumen,
  'улан-удэ': CITY_CENTER_BY_SLUG['ulan-ude'],
  чебоксары: CITY_CENTER_BY_SLUG.cheboksary,
  чита: CITY_CENTER_BY_SLUG.chita,
  'южно-сахалинск': CITY_CENTER_BY_SLUG['yuzhno-sahalinsk'],
  ярославль: CITY_CENTER_BY_SLUG.yaroslavl,
};

export function lookupCityMapCoords(slugOrName: string | null | undefined): CityMapCoords | null {
  const raw = String(slugOrName || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  return CITY_CENTER_BY_SLUG[raw] || CITY_CENTER_BY_NAME[raw] || null;
}

export function resolveCityMapCoords(city: {
  slug?: string | null;
  sourceSlug?: string | null;
  name: string;
}): CityMapCoords | null {
  for (const key of [city.slug, city.sourceSlug, city.name]) {
    const found = lookupCityMapCoords(key);
    if (found) return found;
  }
  return null;
}
