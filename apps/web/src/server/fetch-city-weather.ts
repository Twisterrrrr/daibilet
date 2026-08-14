import { parseOpenMeteoForecast, type OpenMeteoForecast } from '@/lib/city-weather';
import type { CityWeatherFlavor } from '@/lib/city-hub-local-flavor';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 4000;

export async function fetchOpenMeteoSnapshot(weather: CityWeatherFlavor) {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', String(weather.latitude));
  url.searchParams.set('longitude', String(weather.longitude));
  url.searchParams.set('timezone', weather.timezone);
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('current', 'temperature_2m,weather_code,precipitation,cloud_cover');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');

  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DaibiletCityHub/1.0 (https://daibilet.ru)',
    },
    next: { revalidate: 1200 },
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as OpenMeteoForecast;
  return parseOpenMeteoForecast(payload);
}
