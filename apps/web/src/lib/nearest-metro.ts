import { METRO_STATIONS_MSK, METRO_STATIONS_SPB, type MetroCityKey, type MetroStationPin } from '../data/metro-stations-msk-spb';
import { haversineMeters } from './day-route-score';

/** Skip nearest resolve when farther than this (avoid wrong suburb matches). */
export const NEAREST_METRO_MAX_METERS = 2500;

export type ResolveNearestMetroInput = {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  citySlug?: string | null;
  /** Existing DB / editorial metro - preferred when present. */
  metroStation?: string | null;
};

function normalizeCityToken(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

/** Map venue city / citySlug to MSK or SPB metro network (null = no metro catalog). */
export function resolveMetroCityKey(
  city?: string | null,
  citySlug?: string | null,
): MetroCityKey | null {
  const slug = normalizeCityToken(citySlug);
  const name = normalizeCityToken(city);
  if (
    slug === 'moscow' ||
    slug === 'moskva' ||
    name === 'москва' ||
    name.startsWith('москва ')
  ) {
    return 'msk';
  }
  if (
    slug === 'saint-petersburg' ||
    slug === 'spb' ||
    slug === 'petersburg' ||
    name === 'санкт-петербург' ||
    name === 'петербург' ||
    name === 'спб'
  ) {
    return 'spb';
  }
  return null;
}

function stationListForCity(key: MetroCityKey): readonly MetroStationPin[] {
  return key === 'msk' ? METRO_STATIONS_MSK : METRO_STATIONS_SPB;
}

function cleanExistingMetro(raw: string | null | undefined): string | null {
  const text = String(raw || '').trim();
  if (!text || text === '-' || text === '—' || text === '–') return null;
  return text.replace(/^м[\.\s]+/i, '').trim() || null;
}

/**
 * Prefer existing metroStation; else nearest MSK/SPB station by haversine within max meters.
 * Returns bare station name (no «м.» prefix) or null.
 */
export function resolveNearestMetroStationName(
  input: ResolveNearestMetroInput,
  options?: { maxMeters?: number },
): string | null {
  const existing = cleanExistingMetro(input.metroStation);
  if (existing) return existing;

  const cityKey = resolveMetroCityKey(input.city, input.citySlug);
  if (!cityKey) return null;

  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const maxMeters = options?.maxMeters ?? NEAREST_METRO_MAX_METERS;
  let best: { name: string; dist: number } | null = null;
  for (const station of stationListForCity(cityKey)) {
    const dist = haversineMeters(lat, lng, station.lat, station.lng);
    if (!Number.isFinite(dist) || dist > maxMeters) continue;
    if (!best || dist < best.dist) best = { name: station.name, dist };
  }
  return best?.name ?? null;
}
