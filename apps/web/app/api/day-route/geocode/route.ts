import '@/lib/env';
import { lookupCityMapCoords } from '@/lib/city-map-coords';
import { buildSoftGeocodeQuery } from '@/lib/soft-geocode';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NOMINATIM_UA = 'DaibiletMyDay/1.0 (https://daibilet.ru; hello@daibilet.ru)';

type NominatimHit = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

/**
 * GET /api/day-route/geocode?q=&city=&citySlug=
 * Soft Nominatim forward geocode for «Своё место» → OSM map.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get('q') || '').trim();
  const city = String(url.searchParams.get('city') || '').trim();
  const citySlug = String(url.searchParams.get('citySlug') || '').trim();

  if (address.length < 3 || address.length > 180) {
    return publicJsonResponse(
      { error: 'empty_query', message: 'Address too short' },
      { status: 400 },
    );
  }
  if (/https?:\/\//i.test(address)) {
    return publicJsonResponse({ error: 'invalid_query' }, { status: 400 });
  }

  const q = buildSoftGeocodeQuery(address, city || null);
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
    addressdetails: '0',
    countrycodes: 'ru',
  });

  const center = lookupCityMapCoords(citySlug) || lookupCityMapCoords(city);
  if (center) {
    // Prefer hits near the selected city (~±0.6° ≈ city+near suburbs).
    const d = 0.6;
    const left = center.longitude - d;
    const right = center.longitude + d;
    const top = center.latitude + d;
    const bottom = center.latitude - d;
    params.set('viewbox', `${left},${top},${right},${bottom}`);
    params.set('bounded', '0');
  }

  try {
    const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return publicJsonResponse(
        { error: 'upstream_error', message: `Nominatim ${upstream.status}` },
        { status: 502 },
      );
    }
    const rows = (await upstream.json()) as NominatimHit[];
    const hit = Array.isArray(rows) ? rows[0] : null;
    const latitude = Number(hit?.lat);
    const longitude = Number(hit?.lon);
    if (!hit || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return publicJsonResponse(
        { error: 'not_found', message: 'No geocode hit' },
        { status: 404 },
      );
    }
    return publicJsonResponse({
      latitude,
      longitude,
      displayName: String(hit.display_name || '').trim() || q,
    });
  } catch (error) {
    return publicJsonResponse(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Geocode failed',
      },
      { status: 500 },
    );
  }
}
