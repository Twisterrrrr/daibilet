import { Anchor, Bus, Landmark, MapPin, type LucideIcon } from 'lucide-react';

import { formatNumber } from '@/data';

/** Шаблон страницы: учреждение (legacy Venue) или локация (legacy Location). */
export type VenuePageTemplate = 'institution' | 'location';

/** Типы учреждений — один шаблон страницы (музеи, театры, дворцы). */
export const INSTITUTION_KINDS = new Set([
  'museum_art_space',
  'theater',
  'concert_hall',
  'bar',
  'club_bar_restaurant',
]);

/** Типы локаций — другой шаблон (причалы, площадки, открытые точки). MEETING_POINT — только на карточке события. */
export const LOCATION_KINDS = new Set(['pier', 'bus', 'venue', 'outdoor_location', 'sport_activity_space', 'attraction', 'other']);

export const CATALOG_EXCLUDED_KINDS = new Set(['meeting_point', 'online']);

const VENUE_TYPE_LABELS: Record<string, string> = {
  museum_art_space: 'Музей / галерея',
  theater: 'Театр',
  concert_hall: 'Концертный зал',
  bar: 'Бар',
  club_bar_restaurant: 'Клуб / ресторан',
  pier: 'Причал',
  bus: 'Автобус',
  venue: 'Площадка',
  outdoor_location: 'Открытая локация',
  sport_activity_space: 'Спорт / активность',
  attraction: 'Достопримечательность',
  meeting_point: 'Точка сбора',
  online: 'Онлайн',
  other: 'Локация',
};

export const CATALOG_TYPE_OPTIONS: Array<{ value: string; label: string; template: VenuePageTemplate }> = [
  { value: 'museum_art_space', label: 'Музей / галерея', template: 'institution' },
  { value: 'theater', label: 'Театр', template: 'institution' },
  { value: 'concert_hall', label: 'Концертный зал', template: 'institution' },
  { value: 'bar', label: 'Бар', template: 'institution' },
  { value: 'club_bar_restaurant', label: 'Клуб / ресторан', template: 'institution' },
  { value: 'pier', label: 'Причал', template: 'location' },
  { value: 'bus', label: 'Автобус', template: 'location' },
  { value: 'venue', label: 'Площадка', template: 'location' },
  { value: 'outdoor_location', label: 'Открытая локация', template: 'location' },
  { value: 'sport_activity_space', label: 'Спорт / активность', template: 'location' },
  { value: 'attraction', label: 'Достопримечательность', template: 'location' },
  { value: 'other', label: 'Другое', template: 'location' },
];

export function normalizeVenueKind(type?: string | null): string {
  return String(type || 'other')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function formatPublicVenueTitle(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
    .trim();
}

export function venueTypeLabel(type?: string | null): string {
  const key = normalizeVenueKind(type);
  if (key === 'pier_water') return VENUE_TYPE_LABELS.pier;
  return VENUE_TYPE_LABELS[key] || VENUE_TYPE_LABELS.other;
}

export function venueTypeIcon(type?: string | null): LucideIcon {
  const key = normalizeVenueKind(type);
  if (key === 'pier' || key === 'pier_water') return Anchor;
  if (key === 'bus') return Bus;
  if (INSTITUTION_KINDS.has(key)) return Landmark;
  return MapPin;
}

export function venuePageTemplate(type?: string | null): VenuePageTemplate {
  const key = normalizeVenueKind(type);
  if (INSTITUTION_KINDS.has(key)) return 'institution';
  return 'location';
}

export function isMeetingPointLike(input: {
  type?: string | null;
  name?: string | null;
  title?: string | null;
  address?: string | null;
}): boolean {
  const kind = normalizeVenueKind(input.type);
  if (kind === 'meeting_point') return true;
  const name = `${input.name || input.title || ''} ${input.address || ''}`.toLowerCase();
  return /место сбора|место встречи|точка сбора|точка встречи|площадка:|^метро | у метро |у метро |около метро|у памятник|памятник|\bпам\.|у пам\.|\bу пам\b|пл\.\s*у пам/u.test(name);
}

export function isCatalogVenueType(type?: string | null): boolean {
  const key = normalizeVenueKind(type);
  return !CATALOG_EXCLUDED_KINDS.has(key);
}

export function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(n)} событий`;
  if (mod10 === 1) return `${formatNumber(n)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(n)} события`;
  return `${formatNumber(n)} событий`;
}

export function venueCardDescription(venue: { shortDescription?: string | null; type?: string | null; city?: string | null; address?: string | null }): string {
  const parts = [venue.shortDescription, venueTypeLabel(venue.type), venue.city].filter(Boolean);
  if (venue.address && venuePageTemplate(venue.type) === 'location') {
    parts.push(venue.address.split(',')[0]?.trim() || '');
  }
  return parts.filter(Boolean).join(' · ');
}

export function institutionFamilyLabel(): string {
  return 'Музеи и арт';
}

export function locationFamilyLabel(): string {
  return 'Локации';
}

export const LOCATION_TYPE_EMOJI: Record<string, string> = {
  pier: '⚓',
  pier_water: '⚓',
  bus: '🚌',
  venue: '📍',
  outdoor_location: '🌳',
  sport_activity_space: '⚡',
  attraction: '🏛',
  other: '📍',
};

export function locationTypeEmoji(type?: string | null): string {
  return LOCATION_TYPE_EMOJI[normalizeVenueKind(type)] || '📍';
}

export const INSTITUTION_TYPE_EMOJI: Record<string, string> = {
  museum_art_space: '🏛️',
  theater: '🎭',
  concert_hall: '🎼',
  bar: '🍸',
  club_bar_restaurant: '🎧',
};

export function institutionTypeEmoji(type?: string | null): string {
  return INSTITUTION_TYPE_EMOJI[normalizeVenueKind(type)] || '✨';
}

export const INSTITUTION_CATALOG_TYPE_OPTIONS = CATALOG_TYPE_OPTIONS.filter((option) => option.template === 'institution').map((option) => ({
  ...option,
  emoji: institutionTypeEmoji(option.value),
}));

export const LOCATION_CATALOG_TYPE_OPTIONS = CATALOG_TYPE_OPTIONS.filter((option) => option.template === 'location').map((option) => ({
  ...option,
  emoji: locationTypeEmoji(option.value),
}));
