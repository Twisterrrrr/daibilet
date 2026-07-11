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
  return VENUE_TYPE_LABELS[key] || VENUE_TYPE_LABELS.other;
}

export function venuePageTemplate(type?: string | null): VenuePageTemplate {
  const key = normalizeVenueKind(type);
  if (INSTITUTION_KINDS.has(key)) return 'institution';
  return 'location';
}
