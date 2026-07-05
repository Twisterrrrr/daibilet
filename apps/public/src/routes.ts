import type { PublicEvent, PublicSession } from '@/types';

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

export function venueSlug(venue: VenueRouteSource): string {
  const rawSlug = String(venue.slug || '').trim();
  if (rawSlug) return rawSlug;

  const fromName = normalizeSlug(venue.name);
  if (fromName && !isOpaqueId(fromName)) return `${fromName}-${normalizeSlug(venue.id) || venue.id}`;

  return normalizeSlug(venue.id) || venue.id;
}

import { venuePageTemplate } from '@/lib/venue-meta';

export function venueHref(venue: VenueRouteSource): string {
  const basePath = venuePageTemplate(venue.type) === 'location' ? '/locations' : '/venues';
  return `${basePath}/${encodeURIComponent(venueSlug(venue))}`;
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
