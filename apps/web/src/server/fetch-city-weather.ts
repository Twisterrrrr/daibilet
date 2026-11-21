import { buildOpenMeteoForecastUrl, parseOpenMeteoForecast, type OpenMeteoForecast } from '@/lib/city-weather';
import type { CityWeatherFlavor } from '@/lib/city-hub-local-flavor';

const FETCH_TIMEOUT_MS = 8000;
const FETCH_ATTEMPTS = 2;

export async function fetchOpenMeteoSnapshot(weather: CityWeatherFlavor) {
  const url = buildOpenMeteoForecastUrl(weather);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DaibiletCityHub/1.0 (https://daibilet.ru)',
        },
      });
      if (!response.ok) {
        lastError = new Error(`open-meteo ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as OpenMeteoForecast;
      const snapshot = parseOpenMeteoForecast(payload);
      if (snapshot) return snapshot;
      lastError = new Error('open-meteo_bad_payload');
    } catch (error) {
      lastError = error;
    }
  }

  void lastError;
  return null;
}
