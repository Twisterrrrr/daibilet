/**
 * Soft forward-geocode for «Своё место» (address → lat/lng for OSM map).
 * Client calls /api/day-route/geocode (Nominatim proxy). Never blocks add without coords.
 */

export type SoftGeocodeHit = {
  latitude: number;
  longitude: number;
  displayName: string;
};

export type SoftGeocodeResult =
  | { ok: true; hit: SoftGeocodeHit }
  | { ok: false; reason: 'empty' | 'not_found' | 'network' | 'invalid' };

export function buildSoftGeocodeQuery(address: string, cityName?: string | null): string {
  const addr = String(address || '').trim();
  const city = String(cityName || '').trim();
  if (!addr) return '';
  if (!city) return addr;
  const lower = addr.toLowerCase();
  if (lower.includes(city.toLowerCase())) return addr;
  return `${addr}, ${city}`;
}

/**
 * Request soft geocode. Returns list-only friendly failure - never throws.
 */
export async function softGeocodeAddress(input: {
  address: string;
  cityName?: string | null;
  citySlug?: string | null;
  signal?: AbortSignal;
}): Promise<SoftGeocodeResult> {
  const address = String(input.address || '').trim();
  if (address.length < 3) return { ok: false, reason: 'empty' };

  const params = new URLSearchParams();
  params.set('q', address);
  if (input.cityName) params.set('city', String(input.cityName).trim());
  if (input.citySlug) params.set('citySlug', String(input.citySlug).trim());

  try {
    const response = await fetch(`/api/day-route/geocode?${params.toString()}`, {
      signal: input.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (response.status === 404) return { ok: false, reason: 'not_found' };
      return { ok: false, reason: 'network' };
    }
    const data = (await response.json()) as {
      latitude?: number;
      longitude?: number;
      displayName?: string;
    };
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, reason: 'invalid' };
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return { ok: false, reason: 'invalid' };
    }
    return {
      ok: true,
      hit: {
        latitude,
        longitude,
        displayName: String(data.displayName || '').trim() || address,
      },
    };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export function softGeocodeFailureMessage(reason: SoftGeocodeResult extends { ok: false; reason: infer R } ? R : never): string {
  switch (reason) {
    case 'empty':
      return 'Укажите адрес - минимум несколько символов';
    case 'not_found':
      return 'Адрес не найден. Место можно добавить без карты - только в списке';
    case 'invalid':
      return 'Ответ геокодера некорректен. Добавьте место без карты или укажите lat, lng';
    case 'network':
    default:
      return 'Не удалось найти адрес. Место можно добавить без карты - только в списке';
  }
}
