/**
 * Единый источник правды: Prisma VenueKind → family → public chip → PDP template.
 *
 * Канон (Variant A): одна модель Venue; family вычисляется из kind;
 * /venues/* и /locations/* — два URL-семейства одной сущности.
 *
 * TEMPLE / BUS — явные значения enum (шаг 3). Family = location (как у
 * ATTRACTION / MEETING_POINT). Эвристики title→chip для temple/bus удалены:
 * chip берётся из kind. art_space остаётся title-split от MUSEUM_ART_SPACE.
 *
 * Хелперы isTempleLikeVenueName / isBusLikeVenueName — только для reclassify
 * скрипта и legacy тестов, не для resolveChipFromKind.
 */

/** Prisma `enum VenueKind` (packages/db/prisma/schema.prisma). */
export const PRISMA_VENUE_KINDS = [
  'VENUE',
  'MUSEUM_ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'CLUB_BAR_RESTAURANT',
  'PIER',
  'MEETING_POINT',
  'OUTDOOR_LOCATION',
  'SPORT_ACTIVITY_SPACE',
  'ATTRACTION',
  'PARK',
  'MONUMENT',
  'GASTRO',
  'TEMPLE',
  'BUS',
  'ONLINE',
  'OTHER',
] as const;

export type PrismaVenueKind = (typeof PRISMA_VENUE_KINDS)[number];

export type VenueFamily = 'institution' | 'location';
export type VenueTemplate = 'institution' | 'location';

/**
 * Публичный чип /places (?type=) и крошки.
 * Имена совпадают с текущими public kinds (не ломаем URL).
 * «gallery» в продуктовых заметках = chip `art_space`.
 */
export type PublicChip =
  | 'museum'
  | 'art_space'
  | 'theater'
  | 'concert_hall'
  | 'bar'
  | 'club_bar_restaurant'
  | 'gastro'
  | 'park'
  | 'attraction'
  | 'temple'
  | 'monument'
  | 'pier'
  | 'bus'
  | 'venue'
  | 'sport_activity_space'
  | 'outdoor_location'
  | 'meeting_point'
  | 'online'
  | 'other';

export interface VenueKindMapping {
  family: VenueFamily;
  template: VenueTemplate;
  /** Default chip when no title heuristic applies. */
  chip: PublicChip;
  label: string;
}

/**
 * Institution kinds (owner lock): museum/art, theater, concert hall, club/bar/restaurant.
 * Everything else → location. Family changes for live rows = отдельный шаг 4.
 */
export const VENUE_KIND_MAP: Record<PrismaVenueKind, VenueKindMapping> = {
  MUSEUM_ART_SPACE: {
    family: 'institution',
    template: 'institution',
    chip: 'museum',
    label: 'Музей',
  },
  THEATER: {
    family: 'institution',
    template: 'institution',
    chip: 'theater',
    label: 'Театр',
  },
  CONCERT_HALL: {
    family: 'institution',
    template: 'institution',
    chip: 'concert_hall',
    label: 'Концертный зал',
  },
  CLUB_BAR_RESTAURANT: {
    family: 'institution',
    template: 'institution',
    chip: 'club_bar_restaurant',
    label: 'Клуб / ресторан',
  },
  VENUE: {
    family: 'location',
    template: 'location',
    chip: 'venue',
    label: 'Площадка',
  },
  PIER: {
    family: 'location',
    template: 'location',
    chip: 'pier',
    label: 'Причал',
  },
  MEETING_POINT: {
    family: 'location',
    template: 'location',
    chip: 'meeting_point',
    label: 'Точка сбора',
  },
  OUTDOOR_LOCATION: {
    family: 'location',
    template: 'location',
    chip: 'outdoor_location',
    label: 'Открытая локация',
  },
  SPORT_ACTIVITY_SPACE: {
    family: 'location',
    template: 'location',
    chip: 'sport_activity_space',
    label: 'Спорт / активность',
  },
  ATTRACTION: {
    family: 'location',
    template: 'location',
    chip: 'attraction',
    label: 'Достопримечательность',
  },
  PARK: {
    family: 'location',
    template: 'location',
    chip: 'park',
    label: 'Парк',
  },
  MONUMENT: {
    family: 'location',
    template: 'location',
    chip: 'monument',
    label: 'Памятник',
  },
  GASTRO: {
    family: 'location',
    template: 'location',
    chip: 'gastro',
    label: 'Гастроточка',
  },
  TEMPLE: {
    family: 'location',
    template: 'location',
    chip: 'temple',
    label: 'Храм',
  },
  BUS: {
    family: 'location',
    template: 'location',
    chip: 'bus',
    label: 'Автобусы',
  },
  ONLINE: {
    family: 'location',
    template: 'location',
    chip: 'online',
    label: 'Онлайн',
  },
  OTHER: {
    family: 'location',
    template: 'location',
    chip: 'other',
    label: 'Локация',
  },
};

/** Chips allowed under family=institution (invariant 4). */
export const INSTITUTION_PUBLIC_CHIPS = new Set<PublicChip>([
  'museum',
  'art_space',
  'theater',
  'concert_hall',
  'bar',
  'club_bar_restaurant',
]);

/** Chips allowed under family=location (invariant 4). */
export const LOCATION_PUBLIC_CHIPS = new Set<PublicChip>([
  'gastro',
  'park',
  'attraction',
  'temple',
  'monument',
  'pier',
  'bus',
  'venue',
  'sport_activity_space',
  'outdoor_location',
  'meeting_point',
  'online',
  'other',
]);

/** Labels for public-only chips (не Prisma enum). */
const PUBLIC_CHIP_LABELS: Partial<Record<PublicChip, string>> = {
  museum: 'Музей',
  art_space: 'Галерея',
  theater: 'Театр',
  concert_hall: 'Концертный зал',
  bar: 'Бар',
  club_bar_restaurant: 'Клуб / ресторан',
  pier: 'Причал',
  bus: 'Автобусы',
  venue: 'Площадка',
  outdoor_location: 'Открытая локация',
  park: 'Парк',
  monument: 'Памятник',
  sport_activity_space: 'Спорт / активность',
  attraction: 'Достопримечательность',
  temple: 'Храм',
  gastro: 'Гастроточка',
  meeting_point: 'Точка сбора',
  online: 'Онлайн',
  other: 'Локация',
};

/** Public / legacy aliases → Prisma kind for family lookup. */
const PUBLIC_TO_PRISMA: Record<string, PrismaVenueKind> = {
  museum: 'MUSEUM_ART_SPACE',
  art_space: 'MUSEUM_ART_SPACE',
  museum_art_space: 'MUSEUM_ART_SPACE',
  theater: 'THEATER',
  concert_hall: 'CONCERT_HALL',
  bar: 'CLUB_BAR_RESTAURANT',
  club_bar_restaurant: 'CLUB_BAR_RESTAURANT',
  pier: 'PIER',
  pier_water: 'PIER',
  meeting_point: 'MEETING_POINT',
  outdoor_location: 'OUTDOOR_LOCATION',
  sport_activity_space: 'SPORT_ACTIVITY_SPACE',
  attraction: 'ATTRACTION',
  park: 'PARK',
  monument: 'MONUMENT',
  gastro: 'GASTRO',
  venue: 'VENUE',
  online: 'ONLINE',
  other: 'OTHER',
  temple: 'TEMPLE',
  bus: 'BUS',
};

export function normalizeVenueKindKey(type?: string | null): string {
  return String(type || 'other')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function resolvePrismaVenueKind(type?: string | null): PrismaVenueKind | null {
  const key = normalizeVenueKindKey(type);
  if (!key) return null;
  const upper = key.toUpperCase();
  if ((PRISMA_VENUE_KINDS as readonly string[]).includes(upper)) {
    return upper as PrismaVenueKind;
  }
  return PUBLIC_TO_PRISMA[key] ?? null;
}

/**
 * Эвристика: MUSEUM_ART_SPACE → museum | art_space по названию.
 * DB enum пока один; отдельный ART_SPACE kind - не в этом шаге.
 */
export function classifyMuseumOrArtSpace(
  name?: string | null,
  extraText?: string | null,
): 'museum' | 'art_space' {
  const text = `${name || ''} ${extraText || ''}`.toLowerCase();
  if (/эрарта|\berarta\b|ven_spbboats_erarta/i.test(text)) return 'art_space';
  if (
    /петербургск(?:ий|ого)\s+художник|muzeino-vystavochnyi-centr-peterburgskii-hudozhnik/i.test(
      text,
    )
  ) {
    return 'art_space';
  }
  if (/музей\s+современного\s+искусств/i.test(text)) return 'art_space';
  if (/арт[-\s]?пространств|art[-\s]?space|иммерсив|люмьер|глазунов/i.test(text)) {
    return 'art_space';
  }
  if (
    /галере/i.test(text) &&
    !/музей|третьяков|эрмитаж|пушкинск|русск(?:ий|ого)\s+музей/i.test(text)
  ) {
    return 'art_space';
  }
  return 'museum';
}

/**
 * Title matcher for reclassify → TEMPLE (не для resolveChipFromKind).
 * Совпадает с правилами scripts/reclassify-venue-kinds.mjs.
 */
export function isTempleLikeVenueName(name?: string | null): boolean {
  return /(?:собор|церков|храм|монастыр|мечет|синагог|кирх|часовн|костел|обител|\bлавр[аы]\b)/iu.test(
    String(name || ''),
  );
}

/**
 * Title matcher for reclassify → BUS (не для resolveChipFromKind).
 * Совпадает с правилами scripts/reclassify-venue-kinds.mjs.
 */
export function isBusLikeVenueName(name?: string | null): boolean {
  return /(?:автобус|\bbus\b|автовокзал|место посадки|посадка\s+на\s+автобус|экскурсия\s+на\s+автобус|hop[-\s]?on|якарели|yakareli)/iu.test(
    String(name || ''),
  );
}

/**
 * Public chip для UI / ?type= / крошек.
 * art_space — единственная оставшаяся title-эвристика (enum ещё один).
 * temple / bus — только из kind TEMPLE / BUS (или явного public alias).
 */
export function resolveChipFromKind(
  kind?: string | null,
  title?: string | null,
): PublicChip {
  const key = normalizeVenueKindKey(kind);

  if (key === 'temple') return 'temple';
  if (key === 'bus') return 'bus';
  if (key === 'art_space') return 'art_space';
  if (key === 'bar') return 'bar';
  if (key === 'pier_water') return 'pier';

  // Эвристика art_space ← MUSEUM_ART_SPACE / museum
  if (key === 'museum' || key === 'museum_art_space') {
    return classifyMuseumOrArtSpace(title);
  }

  const prismaKind = resolvePrismaVenueKind(key);
  if (prismaKind) {
    if (prismaKind === 'MUSEUM_ART_SPACE') return classifyMuseumOrArtSpace(title);
    return VENUE_KIND_MAP[prismaKind].chip;
  }

  if ((INSTITUTION_PUBLIC_CHIPS as Set<string>).has(key)) return key as PublicChip;
  if ((LOCATION_PUBLIC_CHIPS as Set<string>).has(key)) return key as PublicChip;
  return 'other';
}

/** @deprecated alias — use resolveChipFromKind */
export function venueChip(kind?: string | null, title?: string | null): PublicChip {
  return resolveChipFromKind(kind, title);
}

export function venueFamily(kind?: string | null): VenueFamily {
  return venueTemplate(kind);
}

export function venueTemplate(kind?: string | null): VenueTemplate {
  const key = normalizeVenueKindKey(kind);
  if (key === 'institution') return 'institution';
  if (key === 'location') return 'location';
  // Legacy free-text from old imports
  if (key.includes('причал') || key.includes('теплоход')) return 'location';

  if ((INSTITUTION_PUBLIC_CHIPS as Set<string>).has(key)) return 'institution';

  const prismaKind = resolvePrismaVenueKind(key);
  if (prismaKind) return VENUE_KIND_MAP[prismaKind].template;

  return 'location';
}

export function venueKindLabel(kind?: string | null, title?: string | null): string {
  const chip = resolveChipFromKind(kind, title);
  if (PUBLIC_CHIP_LABELS[chip]) return PUBLIC_CHIP_LABELS[chip]!;
  const prismaKind = resolvePrismaVenueKind(kind);
  if (prismaKind) return VENUE_KIND_MAP[prismaKind].label;
  return PUBLIC_CHIP_LABELS.other || 'Локация';
}

/** Institution kind keys (lowercase) for catalog stats / filters. */
export const INSTITUTION_KIND_KEYS = new Set<string>([
  'museum',
  'art_space',
  'museum_art_space',
  'theater',
  'concert_hall',
  'bar',
  'club_bar_restaurant',
  'MUSEUM_ART_SPACE'.toLowerCase(),
  'THEATER'.toLowerCase(),
  'CONCERT_HALL'.toLowerCase(),
  'CLUB_BAR_RESTAURANT'.toLowerCase(),
]);

export function isInstitutionKind(type?: string | null): boolean {
  return venueTemplate(type) === 'institution';
}
