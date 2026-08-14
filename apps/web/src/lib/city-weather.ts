/**
 * Open-Meteo WMO mapping + sun vs indoor mood for city-hub smart CTAs.
 * Pure helpers - fetch lives in the weather route.
 */

import type { CityWeatherFlavor } from './city-hub-local-flavor.ts';

export type CityWeatherDay = {
  date: string;
  weatherCode: number;
  label: string;
  temperatureC: number | null;
  tempMaxC: number | null;
  tempMinC: number | null;
  mood: CityWeatherMood;
};

export type CityWeatherMood = 'sunny' | 'indoor';

export type CityWeatherSnapshot = {
  today: CityWeatherDay;
  tomorrow: CityWeatherDay | null;
  dayAfter: CityWeatherDay | null;
};

export type OpenMeteoForecast = {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    precipitation?: number;
    cloud_cover?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

const SUNNY_CODES = new Set([0, 1, 2]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FOG_CODES = new Set([45, 48]);
const THUNDER_CODES = new Set([95, 96, 99]);

export function isSunnyWeatherCode(code: number): boolean {
  return SUNNY_CODES.has(code);
}

export function isRainyWeatherCode(code: number): boolean {
  return RAIN_CODES.has(code);
}

export function isSnowyWeatherCode(code: number): boolean {
  return SNOW_CODES.has(code);
}

export function isFogWeatherCode(code: number): boolean {
  return FOG_CODES.has(code);
}

export function weatherMoodFromCode(code: number): CityWeatherMood {
  return isSunnyWeatherCode(code) ? 'sunny' : 'indoor';
}

export function weatherConditionLine(code: number): string {
  const label = weatherLabelRu(code);
  if (isRainyWeatherCode(code) || isSnowyWeatherCode(code) || THUNDER_CODES.has(code)) {
    return label;
  }
  return `${label}, без осадков`;
}

export function weatherLabelRu(code: number): string {
  if (code === 0) return 'Ясно';
  if (code === 1) return 'Преимущественно ясно';
  if (code === 2) return 'Переменная облачность';
  if (code === 3) return 'Пасмурно';
  if (FOG_CODES.has(code)) return 'Туман';
  if (code === 51 || code === 53 || code === 56) return 'Морось';
  if (code === 55 || code === 57) return 'Сильная морось';
  if (code === 61 || code === 80) return 'Небольшой дождь';
  if (code === 63 || code === 81) return 'Дождь';
  if (code === 65 || code === 66 || code === 67 || code === 82) return 'Сильный дождь';
  if (code === 71 || code === 85) return 'Небольшой снег';
  if (code === 73) return 'Снег';
  if (code === 75 || code === 77 || code === 86) return 'Сильный снег';
  if (THUNDER_CODES.has(code)) return 'Гроза';
  return 'Пасмурно';
}

export function indoorCtaForCode(code: number, flavor: CityWeatherFlavor): string {
  if (isSnowyWeatherCode(code)) return flavor.indoorCtaSnow;
  if (isRainyWeatherCode(code) || THUNDER_CODES.has(code)) return flavor.indoorCtaRain;
  return flavor.indoorCtaOvercast;
}

function roundTemp(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function asCode(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function buildDay(params: {
  date: string;
  weatherCode: number;
  temperatureC?: number | null;
  tempMaxC?: number | null;
  tempMinC?: number | null;
}): CityWeatherDay {
  return {
    date: params.date,
    weatherCode: params.weatherCode,
    label: weatherLabelRu(params.weatherCode),
    temperatureC: params.temperatureC ?? null,
    tempMaxC: params.tempMaxC ?? null,
    tempMinC: params.tempMinC ?? null,
    mood: weatherMoodFromCode(params.weatherCode),
  };
}

export function parseOpenMeteoForecast(payload: OpenMeteoForecast | null | undefined): CityWeatherSnapshot | null {
  const daily = payload?.daily;
  const times = Array.isArray(daily?.time) ? daily.time : [];
  const codes = Array.isArray(daily?.weather_code) ? daily.weather_code : [];
  const maxes = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
  const mins = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];
  if (!times[0] || asCode(codes[0]) == null) return null;

  const currentCode = asCode(payload?.current?.weather_code);
  const todayCode = currentCode ?? asCode(codes[0]);
  if (todayCode == null) return null;

  const today = buildDay({
    date: times[0],
    weatherCode: todayCode,
    temperatureC: roundTemp(payload?.current?.temperature_2m) ?? roundTemp(maxes[0]),
    tempMaxC: roundTemp(maxes[0]),
    tempMinC: roundTemp(mins[0]),
  });

  const tomorrowCode = asCode(codes[1]);
  const tomorrow =
    times[1] && tomorrowCode != null
      ? buildDay({
          date: times[1],
          weatherCode: tomorrowCode,
          temperatureC: roundTemp(maxes[1]),
          tempMaxC: roundTemp(maxes[1]),
          tempMinC: roundTemp(mins[1]),
        })
      : null;

  const dayAfterCode = asCode(codes[2]);
  const dayAfter =
    times[2] && dayAfterCode != null
      ? buildDay({
          date: times[2],
          weatherCode: dayAfterCode,
          temperatureC: roundTemp(maxes[2]),
          tempMaxC: roundTemp(maxes[2]),
          tempMinC: roundTemp(mins[2]),
        })
      : null;

  return { today, tomorrow, dayAfter };
}

export function formatTempC(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}°`;
}

export function formatTempCFull(value: number | null | undefined): string | null {
  const compact = formatTempC(value);
  return compact ? `${compact.replace(/°$/, '')} °C` : null;
}
