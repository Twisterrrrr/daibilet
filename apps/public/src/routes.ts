import type { PublicEvent, PublicSession } from '@/types';

type EventRouteSource = Pick<PublicSession, 'id' | 'slug' | 'sourceSlug' | 'title'> | Pick<PublicEvent, 'id' | 'slug' | 'sourceSlug' | 'title'>;

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
