import { Anchor, Bus, Landmark, MapPin, type LucideIcon } from 'lucide-react';

import { formatNumber } from '@/lib/format';

export type VenuePageTemplate = 'institution' | 'location';

export const INSTITUTION_KINDS = new Set([
  'museum_art_space',
  'theater',
  'concert_hall',
  'bar',
  'club_bar_restaurant',
]);

const VENUE_TYPE_LABELS: Record<string, string> = {
  museum_art_space: 'Музей / галерея',
  theater: 'Театр',
  concert_hall: 'Концертный зал',
  bar: 'Бар',
  club_bar_restaurant: 'Клуб / ресторан',
  pier: 'Причал',
  bus: 'Автобусы',
  venue: 'Площадка',
  outdoor_location: 'Открытая локация',
  sport_activity_space: 'Спорт / активность',
  attraction: 'Достопримечательность',
  other: 'Локация',
};

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

export function isMeetingPointLike(input: {
  type?: string | null;
  name?: string | null;
  title?: string | null;
  address?: string | null;
}): boolean {
  const kind = normalizeVenueKind(input.type);
  if (kind === 'meeting_point') return true;
  const name = `${input.name || input.title || ''} ${input.address || ''}`.toLowerCase();
  return /место сбора|место встречи|точка сбора|точка встречи|площадка:|^метро\b|^м\.(?:\s|«|"|')|\bм\.\s*(?:«|[а-яё])|\bу метро\b|около метро|у памятник|памятник|\bпам\.|у пам\.|\bу пам\b|пл\.\s*у пам/u.test(name);
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

const WEAK_VENUE_LEAD_RE = /^(легенда|описание|текст|n\/a|нет|—|-)$/i;

function isWeakVenueLeadText(value?: string | null): boolean {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return true;
  if (text.length < 24) return true;
  if (WEAK_VENUE_LEAD_RE.test(text)) return true;
  return false;
}

function isTruncatedVenueLeadText(value?: string | null): boolean {
  return /\.\.\.$/.test(String(value || '').replace(/\s+/g, ' ').trim());
}

export function resolveLocationVenueCopy(venue: {
  name?: string | null;
  city?: string | null;
  description?: string | null;
  shortDescription?: string | null;
}) {
  const description = String(venue.description || '').replace(/\s+/g, ' ').trim();
  const shortDescription = String(venue.shortDescription || '').replace(/\s+/g, ' ').trim();
  const fullDescription =
    description || (!isWeakVenueLeadText(shortDescription) ? shortDescription : '');
  const heroLead =
    !isWeakVenueLeadText(shortDescription) && !isTruncatedVenueLeadText(shortDescription)
      ? shortDescription
      : fullDescription;
  const fallback = `Локация «${venue.name || 'точка отправления'}» в ${venue.city || 'городе'}. Адрес и время отправления уточняйте в карточке события перед покупкой.`;

  return {
    fullDescription: fullDescription || fallback,
    heroLead: heroLead || fallback,
    howToFind: fullDescription || fallback,
  };
}

export function institutionTypeEmoji(type?: string | null): string {
  const key = normalizeVenueKind(type);
  const map: Record<string, string> = {
    museum_art_space: '🏛️',
    theater: '🎭',
    concert_hall: '🎼',
    bar: '🍸',
    club_bar_restaurant: '🎧',
  };
  return map[key] || '✨';
}
