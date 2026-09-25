/**
 * Auto-register hub suburb cards from CITY_INFO that are not in the manual registry.
 * Covers P3 bulk migration (nature day-trips, hub modules, Perm inline cards).
 */

import cityRouting from '../../../../data/geo/city-routing.ru.json';

import type { CityInfoEntry, CitySuburbItem } from './cityInfo.ts';
import type { DestinationKind, DestinationRegistryEntry } from './city-destination-registry.ts';

function normalizeSuburbName(name: string): string {
  return String(name || '').trim().toLowerCase();
}

function suburbRegistryKey(hubSlug: string, name: string): string {
  return `${hubSlug}::${normalizeSuburbName(name)}`;
}

function slugifyToken(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, '-')
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function deriveSuburbSlug(hubSlug: string, suburb: CitySuburbItem): string {
  const locationSlug = String(suburb.locationSlug || '').trim().toLowerCase();
  if (locationSlug) {
    const hubPrefix = `${hubSlug}-`;
    if (locationSlug.startsWith(hubPrefix)) {
      return locationSlug.slice(hubPrefix.length);
    }
    const parts = locationSlug.split('-').filter(Boolean);
    if (parts[0] === hubSlug && parts.length > 1) {
      return parts.slice(1).join('-');
    }
    return locationSlug;
  }
  return slugifyToken(suburb.name) || 'suburb';
}

function deriveCatalogCitySlug(hubSlug: string, suburb: CitySuburbItem, slug: string): string | undefined {
  const locationSlug = String(suburb.locationSlug || '').trim().toLowerCase();
  if (locationSlug) return locationSlug;
  return slug ? `${hubSlug}-${slug}` : undefined;
}

function buildWhyGo(desc?: string): string | undefined {
  const trimmed = String(desc || '').trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137).trimEnd()}...`;
}

function regionSlugFromName(regionName: string): string | null {
  const normalized = String(regionName || '').trim().toLowerCase();
  if (!normalized) return null;
  return slugifyToken(normalized);
}

function resolveSatelliteRegion(suburbName: string): string | null {
  const map = cityRouting.cityToRegion || {};
  for (const [cityName, regionName] of Object.entries(map)) {
    if (normalizeSuburbName(cityName) === normalizeSuburbName(suburbName)) {
      return regionSlugFromName(regionName);
    }
    const baseName = cityName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (baseName && normalizeSuburbName(baseName) === normalizeSuburbName(suburbName)) {
      return regionSlugFromName(regionName);
    }
  }
  return null;
}

function inferKind(suburb: CitySuburbItem, regionSlug: string | null): DestinationKind {
  if (regionSlug && suburb.locationSlug) return 'satellite-city';
  return 'suburb';
}

export function buildAutoDestinationRegistryEntries(
  manualEntries: DestinationRegistryEntry[],
  cityInfo: Record<string, CityInfoEntry>,
): DestinationRegistryEntry[] {
  const covered = new Set(
    manualEntries.map((entry) => suburbRegistryKey(entry.parentHubSlug || '', entry.name)),
  );
  const usedIds = new Set(manualEntries.map((entry) => entry.id));
  const auto: DestinationRegistryEntry[] = [];

  for (const [hubSlug, hub] of Object.entries(cityInfo)) {
    for (const suburb of hub.significantSuburbs || []) {
      const key = suburbRegistryKey(hubSlug, suburb.name);
      if (covered.has(key)) continue;
      covered.add(key);

      const slug = deriveSuburbSlug(hubSlug, suburb);
      let id = `${hubSlug}-${slug}`;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${hubSlug}-${slug}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);

      const regionSlug = resolveSatelliteRegion(suburb.name);
      const kind = inferKind(suburb, regionSlug);
      const catalogCitySlug = deriveCatalogCitySlug(hubSlug, suburb, slug);

      auto.push({
        id,
        slug,
        name: suburb.name,
        kind,
        parentHubSlug: hubSlug,
        regionSlug: regionSlug || undefined,
        catalogCitySlug,
        editorial: {
          brief: suburb.desc || suburb.name,
          whyGo: buildWhyGo(suburb.desc),
          travel: suburb.travelVectorBlurb || suburb.travelVector,
        },
        suburbCard: suburb,
        presentation: {
          showInParentHub: true,
          showStandalonePage: false,
          hubTeaserMaxChars: 200,
        },
        registryStatus: 'migrated',
      });
    }
  }

  return auto;
}

export function hydrateDestinationRegistryFromCityInfo(
  registry: DestinationRegistryEntry[],
  registryById: Map<string, DestinationRegistryEntry>,
  cityInfo: Record<string, CityInfoEntry>,
): number {
  const marker = registry as DestinationRegistryEntry[] & { __hydratedFromCityInfo?: boolean };
  if (marker.__hydratedFromCityInfo) return 0;

  const auto = buildAutoDestinationRegistryEntries(registry, cityInfo);
  registry.push(...auto);
  for (const entry of auto) {
    registryById.set(entry.id, entry);
  }
  marker.__hydratedFromCityInfo = true;
  return auto.length;
}
