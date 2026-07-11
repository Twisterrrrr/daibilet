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

function normalizeVenueKind(type?: string | null): string {
  return String(type || 'other')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function venueTypeLabel(type?: string | null): string {
  const key = normalizeVenueKind(type);
  return VENUE_TYPE_LABELS[key] || VENUE_TYPE_LABELS.other;
}

export function venuePageTemplate(type?: string | null): VenuePageTemplate {
  const key = normalizeVenueKind(type);
  if (INSTITUTION_KINDS.has(key)) return 'institution';
  return 'location';
}
