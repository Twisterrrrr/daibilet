import type { PublicSessionDto } from '@daibilet/contracts/public';

type EventRouteSource = Pick<PublicSessionDto, 'id' | 'slug' | 'sourceSlug' | 'title'>;
type CityRouteSource = { slug?: string | null; sourceSlug?: string | null; name: string };
type VenueRouteSource = { id: string; slug?: string | null; name: string; type?: string | null };

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function eventHref(event: EventRouteSource): string {
  return `/events/${eventSlug(event)}`;
}

export function eventSlug(event: EventRouteSource): string {
  const explicitSlug = normalizeSlug(event.slug);
  if (explicitSlug && !isOpaqueId(explicitSlug)) return explicitSlug;
  const sourceSlug = normalizeSlug(event.sourceSlug);
  if (sourceSlug && !isOpaqueId(sourceSlug)) return sourceSlug;
  const titleSlug = normalizeSlug(event.title) || 'event';
  return `${titleSlug}-${normalizeSlug(event.id) || event.id}`;
}

export function cityHref(city: CityRouteSource): string {
  return `/cities/${citySlug(city)}`;
}

export function citySlug(city: CityRouteSource): string {
  for (const candidate of [city.slug, city.sourceSlug]) {
    const normalized = normalizeSlug(candidate);
    if (normalized && !isOpaqueId(normalized)) return normalized;
  }
  return normalizeSlug(city.name) || 'city';
}

/** Афиша города — расписание событий на странице CityPage. */
export function cityEventsHref(city: CityRouteSource): string {
  return `${cityHref(city)}#city-schedule`;
}

export function venueHref(venue: VenueRouteSource): string {
  const base = venuePageTemplate(venue.type) === 'location' ? '/locations' : '/venues';
  return `${base}/${venueSlug(venue)}`;
}

export function venueSlug(venue: VenueRouteSource): string {
  const rawSlug = String(venue.slug || '').trim();
  if (rawSlug) {
    const normalized = normalizeSlug(rawSlug);
    if (normalized && !isOpaqueId(normalized)) return normalized;
  }
  const fromName = normalizeSlug(venue.name);
  const idPart = String(venue.id || '').replace(/^venue_/, '');
  if (fromName) return `${fromName}-${normalizeSlug(idPart) || idPart}`;
  return normalizeSlug(idPart) || idPart;
}

export function venuePageTemplate(type?: string | null): 'institution' | 'location' {
  const value = String(type || '').toLowerCase();
  if (value.includes('location') || value.includes('причал') || value.includes('теплоход')) return 'location';
  return 'institution';
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
