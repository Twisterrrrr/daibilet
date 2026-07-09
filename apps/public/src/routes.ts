import type { PublicEvent, PublicSession } from '@/types';
import { venuePageTemplate } from '@/lib/venue-meta';

type EventRouteSource = Pick<PublicSession, 'id' | 'slug' | 'sourceSlug' | 'title'> | Pick<PublicEvent, 'id' | 'slug' | 'sourceSlug' | 'title'>;
type CityRouteSource = { slug?: string | null; sourceSlug?: string | null; name: string };
type VenueRouteSource = { id: string; slug?: string | null; name: string; type?: string | null };

const CITY_SLUG_ALIASES: Record<string, string> = {
  moskva: 'moscow',
  msk: 'moscow',
  spb: 'saint-petersburg',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-na-donu': 'rostov-on-don',
  rostov: 'rostov-on-don',
};

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function eventHref(event: EventRouteSource): string {
  return `/events/${eventSlug(event)}`;
}

export function citySlug(city: CityRouteSource): string {
  for (const candidate of [city.slug, city.sourceSlug]) {
    const normalized = normalizeSlug(candidate);
    if (normalized && !isOpaqueId(normalized)) return normalized;
  }

  const fromName = normalizeSlug(city.name);
  if (!fromName) return 'city';
  return CITY_SLUG_ALIASES[fromName] || fromName;
}

export function cityHref(city: CityRouteSource): string {
  return `/cities/${citySlug(city)}`;
}

/** Афиша города — расписание событий на странице CityPage. */
export function cityEventsHref(city: CityRouteSource): string {
  return `${cityHref(city)}#city-schedule`;
}

function stripOpaqueVenueIdSuffix(slug: string): string {
  const match = String(slug || '').match(/(?:^|[-_])([a-f0-9]{20,})$/i);
  if (!match) return slug;
  const suffix = match[1].toLowerCase();
  const trimmed = String(slug || '').replace(new RegExp(`[-_]${suffix}$`, 'i'), '');
  return trimmed || slug;
}

function dedupeVenueSlugSuffix(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length < 2) return slug;
  if (parts[parts.length - 1] === parts[parts.length - 2]) {
    return parts.slice(0, -1).join('-');
  }
  return slug;
}

export function venueSlug(venue: VenueRouteSource): string {
  const rawSlug = String(venue.slug || '').trim();
  if (rawSlug) {
    const normalized = dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(normalizeSlug(rawSlug)));
    if (normalized && !isOpaqueId(normalized)) return normalized;
  }

  const fromName = normalizeSlug(venue.name);
  const idPart = String(venue.id || '').replace(/^venue_/, '');
  const idSlug = normalizeSlug(idPart) || idPart;
  if (fromName) {
    if (fromName.endsWith(`-${idSlug}`)) return dedupeVenueSlugSuffix(fromName);
    return dedupeVenueSlugSuffix(`${fromName}-${idSlug}`);
  }

  return dedupeVenueSlugSuffix(idSlug);
}

export function venueHref(venue: VenueRouteSource): string {
  const basePath = venuePageTemplate(venue.type) === 'location' ? '/locations' : '/venues';
  return `${basePath}/${venueSlug(venue)}`;
}

export function sessionVenueHref(
  session: Pick<PublicSession, 'venueId' | 'venueSlug' | 'venue' | 'venueKind'>,
): string | null {
  if (!session.venueSlug && !session.venueId) return null;
  return venueHref({
    id: session.venueId || session.venueSlug || '',
    slug: session.venueSlug,
    name: session.venue,
    type: session.venueKind,
  });
}

export function venueCatalogHref(template: 'institution' | 'location' = 'institution'): string {
  return template === 'location' ? '/locations' : '/venues';
}

export function eventSlug(event: EventRouteSource): string {
  const explicitSlug = normalizeSlug(event.slug);
  if (explicitSlug && !isOpaqueId(explicitSlug)) return explicitSlug;

  const sourceSlug = normalizeSlug(event.sourceSlug);
  if (sourceSlug && !isOpaqueId(sourceSlug)) return sourceSlug;

  return buildPublicEventSlug(event.title, event.id);
}

export function buildPublicEventSlug(title: string, id: string): string {
  const titleSlug = normalizeSlug(title) || 'event';
  return `${titleSlug}-${normalizeSlug(id) || id}`;
}

function normalizeSlug(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function isOpaqueId(value: string): boolean {
  return /^[a-f0-9]{20,}$/i.test(value) || /^c[a-z0-9]{20,}$/i.test(value);
}
