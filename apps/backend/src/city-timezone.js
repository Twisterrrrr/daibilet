import { loadCityRoutingConfig } from './city-routing-config.js';

// INC.CITY404.4: do not read via import.meta.url alone - Next CI bakes
// /home/runner/work/... which 500s revalidate on MSK after artifact swap.
const routing = loadCityRoutingConfig(import.meta.url);

export const DEFAULT_CITY_TIME_ZONE = 'Europe/Moscow';

/** Города с часовым поясом, отличным от Europe/Moscow. */
const CITY_TIME_ZONE_OVERRIDES = {
  Абакан: 'Asia/Krasnoyarsk',
  Астрахань: 'Europe/Astrakhan',
  Барнаул: 'Asia/Barnaul',
  'Благовещенск (Амурская область)': 'Asia/Yakutsk',
  Владивосток: 'Asia/Vladivostok',
  Екатеринбург: 'Asia/Yekaterinburg',
  Ижевск: 'Europe/Samara',
  Иркутск: 'Asia/Irkutsk',
  Калининград: 'Europe/Kaliningrad',
  Кемерово: 'Asia/Novokuznetsk',
  'Киров (Кировская область)': 'Europe/Kirov',
  'Комсомольск-на-Амуре': 'Asia/Vladivostok',
  Красноярск: 'Asia/Krasnoyarsk',
  Курган: 'Asia/Yekaterinburg',
  Магадан: 'Asia/Magadan',
  Новосибирск: 'Asia/Novosibirsk',
  Омск: 'Asia/Omsk',
  Оренбург: 'Asia/Yekaterinburg',
  Пермь: 'Asia/Yekaterinburg',
  'Петропавловск-Кamчatsky': 'Asia/Kamchatka',
  Самара: 'Europe/Samara',
  Тольятти: 'Europe/Samara',
  Сургут: 'Asia/Yekaterinburg',
  Новокузнецк: 'Asia/Novokuznetsk',
  Саратов: 'Europe/Saratov',
  Томск: 'Asia/Novosibirsk',
  Тюмень: 'Asia/Yekaterinburg',
  'Улан-Удэ': 'Asia/Irkutsk',
  Ульяновск: 'Europe/Samara',
  Уфа: 'Asia/Yekaterinburg',
  Хабаровск: 'Asia/Vladivostok',
  'Ханты-Мансийск': 'Asia/Yekaterinburg',
  Челябинск: 'Asia/Yekaterinburg',
  Чита: 'Asia/Yakutsk',
  'Южно-Сахалинск': 'Asia/Sakhalin',
  ['\u042f\u043a\u0443\u0442\u0441\u043a']: 'Asia/Yakutsk',
};

const REGION_TIME_ZONES = {
  'Красноярский край': 'Asia/Krasnoyarsk',
  'Ульяновская область': 'Europe/Samara',
  'Хабаровский край': 'Asia/Vladivostok',
  'Республика Хакасия': 'Asia/Krasnoyarsk',
  'Республика Татарстан': 'Europe/Moscow',
  'Республика Башкортостан': 'Asia/Yekaterinburg',
  'Республика Карелия': 'Europe/Moscow',
  'Алтайский край': 'Asia/Barnaul',
  'Приморский край': 'Asia/Vladivostok',
  'Иркутская область': 'Asia/Irkutsk',
  'Забайкальский край': 'Asia/Yakutsk',
  'Сахалинская область': 'Asia/Sakhalin',
  'Камчатский край': 'Asia/Kamchatka',
  'Самарская область': 'Europe/Samara',
  'Челябинская область': 'Asia/Yekaterinburg',
  'Кемеровская область': 'Asia/Novokuznetsk',
  'Свердловская область': 'Asia/Yekaterinburg',
  'Ханты-Мансийский автономный округ': 'Asia/Yekaterinburg',
};

const cityToRegion = routing.cityToRegion || {};

function normalizeCityKey(value) {
  return String(value || '').trim();
}

export function resolveCityTimeZone(cityName, destinationName) {
  const candidates = [cityName, destinationName].map(normalizeCityKey).filter(Boolean);
  for (const name of candidates) {
    if (CITY_TIME_ZONE_OVERRIDES[name]) return CITY_TIME_ZONE_OVERRIDES[name];
    const region = cityToRegion[name];
    if (region && REGION_TIME_ZONES[region]) return REGION_TIME_ZONES[region];
    if (REGION_TIME_ZONES[name]) return REGION_TIME_ZONES[name];
  }
  return DEFAULT_CITY_TIME_ZONE;
}

export function resolveSessionTimeZone(session = {}) {
  return resolveCityTimeZone(session.city, session.destination);
}

export function getLocalDateParts(instant, timeZone = DEFAULT_CITY_TIME_ZONE) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return null;
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);
  return { year, month, day };
}

export function diffLocalDays(instant, reference = new Date(), timeZone = DEFAULT_CITY_TIME_ZONE) {
  const eventParts = getLocalDateParts(instant, timeZone);
  const refParts = getLocalDateParts(reference, timeZone);
  if (!eventParts || !refParts) return null;
  const eventDay = Date.UTC(eventParts.year, eventParts.month - 1, eventParts.day);
  const refDay = Date.UTC(refParts.year, refParts.month - 1, refParts.day);
  return Math.round((eventDay - refDay) / 86400000);
}

export function isLocalWeekend(instant, timeZone = DEFAULT_CITY_TIME_ZONE) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return false;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(date);
  return weekday === 'Sat' || weekday === 'Sun';
}

export function localHourFromInstant(instant, timeZone = DEFAULT_CITY_TIME_ZONE) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return Number.NaN;
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour');
  return Number(hourPart?.value);
}

function getTimeZoneOffsetMs(instant, timeZone) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return 0;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT+0';
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 3600000 + minutes * 60000);
}

/** Локальное wall-clock время в IANA-зоне → UTC ISO. */
export function wallClockInTimeZoneToUtc(localDateTime, timeZone = DEFAULT_CITY_TIME_ZONE) {
  const text = String(localDateTime || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = utcGuess;
  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    guess = utcGuess - offset;
  }
  const result = new Date(guess);
  return Number.isFinite(result.getTime()) ? result.toISOString() : null;
}
