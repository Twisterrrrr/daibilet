import type { PublicSessionDto } from '@daibilet/contracts/public';

import { resolveCityImage } from '@/lib/city-images';
import { resolveEventCardPrimaryImage } from '@/lib/event-card-image';

export function normalizeRegionCityKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/\s+/g, ' ');
}

/** First usable event cover per city name / slug from region sessions. */
export function buildCitySessionCoverIndex(sessions: PublicSessionDto[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const session of sessions) {
    const url = resolveEventCardPrimaryImage(session);
    if (!url) continue;
    const keys = [session.city, session.citySlug, session.destination, session.sourceCitySlug];
    for (const key of keys) {
      const normalized = normalizeRegionCityKey(key);
      if (!normalized || index.has(normalized)) continue;
      index.set(normalized, url);
    }
  }
  return index;
}

export function resolveCityRailPreview(args: {
  slug?: string | null;
  name: string;
  coverIndex: Map<string, string>;
}): string | null {
  const cityAsset = resolveCityImage({ slug: args.slug, name: args.name });
  if (cityAsset) return cityAsset;

  for (const key of [args.name, args.slug]) {
    const normalized = normalizeRegionCityKey(key);
    if (!normalized) continue;
    const fromSession = args.coverIndex.get(normalized);
    if (fromSession) return fromSession;
  }
  return null;
}

export function resolveTopPlacePreview(args: {
  imageUrl?: string | null;
  cityNames?: string[] | null;
  childCities: Array<{ slug: string; name: string }>;
  coverIndex: Map<string, string>;
}): string | null {
  const editorial = String(args.imageUrl || '').trim();
  if (editorial) return editorial;

  const names = (args.cityNames || []).map((n) => n.trim()).filter(Boolean);
  for (const name of names) {
    const child = args.childCities.find(
      (c) =>
        normalizeRegionCityKey(c.name) === normalizeRegionCityKey(name) ||
        normalizeRegionCityKey(c.slug) === normalizeRegionCityKey(name),
    );
    const cityAsset = resolveCityImage({
      slug: child?.slug,
      name: child?.name || name,
    });
    if (cityAsset) return cityAsset;
  }

  for (const name of names) {
    const fromSession = args.coverIndex.get(normalizeRegionCityKey(name));
    if (fromSession) return fromSession;
  }

  return null;
}
