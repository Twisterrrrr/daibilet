export const PLACE_TYPE_OPTIONS = [
  ['ARCHITECTURE', 'Архитектура'],
  ['MONUMENT', 'Памятники и мемориалы'],
  ['MUSEUM', 'Музеи'],
  ['RELIGION', 'Религиозные места'],
  ['NATURE', 'Природа'],
  ['URBAN', 'Городские пространства'],
  ['THEATRE', 'Театры'],
  ['ENTERTAINMENT', 'Развлечения'],
  ['FOOD', 'Еда и гастрономия'],
  ['VENUE', 'Площадки'],
  ['TRANSPORT', 'Транспорт и отправления'],
  ['OTHER', 'Другое — требуется проверка'],
] as const;

export type PlaceType = (typeof PLACE_TYPE_OPTIONS)[number][0];
export type PlacePdpVariant =
  | 'museum'
  | 'theater'
  | 'concert_hall'
  | 'club'
  | 'pier'
  | 'landmark'
  | 'nature'
  | 'urban_area'
  | 'food'
  | 'attraction'
  | 'transport'
  | 'park'
  | 'space'
  | 'religion'
  | 'sport'
  | 'venue';

/** Default editorial block profile. Editors may override the suggestion per Place. */
export const PLACE_PDP_VARIANT_BY_TYPE: Record<PlaceType, PlacePdpVariant> = {
  ARCHITECTURE: 'landmark',
  MONUMENT: 'landmark',
  MUSEUM: 'museum',
  RELIGION: 'religion',
  NATURE: 'nature',
  URBAN: 'urban_area',
  THEATRE: 'theater',
  ENTERTAINMENT: 'attraction',
  FOOD: 'food',
  VENUE: 'venue',
  TRANSPORT: 'transport',
  OTHER: 'venue',
};

const PIER_SUBTYPES = new Set(['pier', 'river_terminal', 'sea_terminal', 'marina']);

export function suggestedPlacePdpVariant(
  placeType?: string | null,
  placeSubtype?: string | null,
): PlacePdpVariant {
  const type = String(placeType || '').trim().toUpperCase() as PlaceType;
  const subtype = String(placeSubtype || '').trim().toLowerCase();
  if (type === 'TRANSPORT' && PIER_SUBTYPES.has(subtype)) return 'pier';
  return PLACE_PDP_VARIANT_BY_TYPE[type] || 'venue';
}

export function isPlaceType(value: unknown): value is PlaceType {
  return typeof value === 'string' && PLACE_TYPE_OPTIONS.some(([type]) => type === value);
}
