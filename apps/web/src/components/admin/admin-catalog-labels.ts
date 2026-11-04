/**
 * Russian display labels for catalog enums. Admin UI never shows raw English
 * enum values. Keys normalize to upper case because the same key arrives in
 * different forms: list DTOs lowercase `pageStatus` ('candidate'), detail DTOs
 * keep the Prisma casing ('CANDIDATE').
 */

const VENUE_KIND_LABELS: Record<string, string> = {
  VENUE: 'Площадка',
  MUSEUM_ART_SPACE: 'Музей / арт-пространство',
  THEATER: 'Театр',
  CONCERT_HALL: 'Концертный зал',
  CLUB_BAR_RESTAURANT: 'Клуб / ресторан',
  PIER: 'Причал',
  MEETING_POINT: 'Точка встречи',
  OUTDOOR_LOCATION: 'Открытая локация',
  SPORT_ACTIVITY_SPACE: 'Спорт / активность',
  ATTRACTION: 'Аттракцион',
  PARK: 'Парк',
  MONUMENT: 'Памятник',
  GASTRO: 'Гастро',
  TEMPLE: 'Храм',
  BUS: 'Автобус / посадка',
  ONLINE: 'Онлайн',
  OTHER: 'Другое',
};

const VENUE_PAGE_STATUS_LABELS: Record<string, string> = {
  NONE: 'Только локация',
  CANDIDATE: 'Кандидат',
  PUBLISHED: 'Опубликована',
  HIDDEN: 'Скрыта',
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  REVIEW: 'На проверке',
  READY: 'Готово',
  PUBLISHED: 'Опубликовано',
  HIDDEN: 'Скрыто',
};

const CITY_TYPE_LABELS: Record<string, string> = {
  CITY: 'Город',
  REGION: 'Регион',
};

function lookupLabel(labels: Record<string, string>, value: string | null | undefined): string {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  // Unknown enum value falls back to the raw code - safer than mislabeling.
  return labels[normalized] || String(value || '—');
}

export function venueKindLabel(kind?: string | null): string {
  return lookupLabel(VENUE_KIND_LABELS, kind);
}

export function venuePageStatusLabel(status?: string | null): string {
  return lookupLabel(VENUE_PAGE_STATUS_LABELS, status);
}

export function eventStatusLabel(status?: string | null): string {
  return lookupLabel(EVENT_STATUS_LABELS, status);
}

export function cityTypeLabel(type?: string | null): string {
  return lookupLabel(CITY_TYPE_LABELS, type);
}
