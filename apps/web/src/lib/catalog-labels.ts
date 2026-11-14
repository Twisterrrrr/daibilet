import type { PublicSessionDto } from '@daibilet/contracts/public';

/** Display-only aliases: API/slug ключ не трогаем, в UI показываем канон. */
const CATALOG_LABEL_DISPLAY_ALIASES: Record<string, string> = {
  Залы: 'Музеи',
  залы: 'Музеи',
};

export function displayCatalogLabel(label: string): string {
  const value = String(label || '').trim();
  if (!value) return value;
  return CATALOG_LABEL_DISPLAY_ALIASES[value] || value;
}

const WATER_CATALOG_HINT_RE =
  /(водн(?:ые|ая)?\s+экскурси|речн(?:ая|ые)?|реч(?:ной|ная)\s+порт|теплоход|катер|яхт|лодк|причал|речные\s+прогулки)/i;
const BUS_CATALOG_LABEL_RE = /автобус/i;

type CatalogTransportHint = 'water' | 'bus';

function resolveCatalogTransportHint(
  session: Pick<PublicSessionDto, 'subcategories' | 'tags' | 'title' | 'venue'>,
): CatalogTransportHint | null {
  const haystack = [
    session.title,
    session.venue,
    ...(session.subcategories || []),
    ...(session.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (WATER_CATALOG_HINT_RE.test(haystack)) return 'water';
  if (BUS_CATALOG_LABEL_RE.test(haystack)) return 'bus';
  return null;
}

function isConflictingTransportCatalogLabel(label: string, transport: CatalogTransportHint | null): boolean {
  if (!transport) return false;
  const lower = label.toLowerCase();
  if (transport === 'water') return BUS_CATALOG_LABEL_RE.test(lower);
  if (transport === 'bus') return WATER_CATALOG_HINT_RE.test(lower);
  return false;
}

/** Служебные теги поставщиков — не показываем в каталоге. */
const UTILITY_TAG_RE =
  /^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|кафе-бар|парковка|гардероб|кондиционирование)$/i;
const DURATION_TAG_RE = /^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i;
const VESSEL_TAG_RE = /^(теплоход|катер|яхт|судно|лодк)\s*:/i;
const VENUE_LABEL_TAG_RE = /^(площадка|локация|место|venue|причал)\s*:/i;
const VENUE_POLICY_TAG_RE = /^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i;

export function isUtilityCatalogTag(tag: string): boolean {
  const value = String(tag || '').trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  if (UTILITY_TAG_RE.test(lower)) return true;
  if (DURATION_TAG_RE.test(lower)) return true;
  if (VESSEL_TAG_RE.test(lower)) return true;
  if (VENUE_LABEL_TAG_RE.test(lower)) return true;
  if (/^причал\b/i.test(lower)) return true;
  if (value.length > 42) return true;
  return false;
}

/** Правила площадки из Ticketscloud — не подкатегории. */
export function isVenuePolicyCatalogTag(tag: string): boolean {
  const lower = String(tag || '').trim().toLowerCase();
  if (!lower) return true;
  if (VENUE_POLICY_TAG_RE.test(lower)) return true;
  if (/отдельн/i.test(lower) && /столик/i.test(lower)) return true;
  if (/коляск/i.test(lower)) return true;
  if (/велосипед/i.test(lower)) return true;
  if (/животн/i.test(lower)) return true;
  if (/сво[ейё]м?\s+алкогол/i.test(lower)) return true;
  if (/сво[ейё]й?\s+ед/i.test(lower)) return true;
  return false;
}

/** Удобства теплохода / площадки — не подкатегории. */
export function isAmenityCatalogTag(tag: string): boolean {
  const lower = String(tag || '').trim().toLowerCase();
  if (!lower) return false;
  if (/^(ресторан[-\s]?бар|отопление|экскурсовод|аудиогид)$/i.test(lower)) return true;
  if (/тё?плые?\s+плед/i.test(lower)) return true;
  if (/^панорамн/i.test(lower)) return true;
  if (/детск(ие|ая)\s+стуль/i.test(lower)) return true;
  if (/^с\s+(обедом|ужином|питанием)/i.test(lower)) return true;
  if (/^ледовый\s+класс/i.test(lower)) return true;
  return false;
}

export function isCatalogSubcategoryLabel(tag: string, category?: string | null): boolean {
  const value = String(tag || '').trim();
  if (!value || isUtilityCatalogTag(value) || isVenuePolicyCatalogTag(value) || isAmenityCatalogTag(value)) return false;
  if (category && value.toLowerCase() === category.toLowerCase()) return false;
  return true;
}

function looksLikeVenueNameTag(label: string, venue?: string | null): boolean {
  const value = String(label || '').trim();
  if (!value) return true;
  if (VENUE_LABEL_TAG_RE.test(value)) return true;
  const venueName = String(venue || '').trim();
  if (!venueName) return false;
  const labelLower = value.toLowerCase();
  const venueLower = venueName.toLowerCase();
  if (labelLower === venueLower) return true;
  if (labelLower.includes(venueLower) || venueLower.includes(labelLower)) return true;
  // «Дельфин, Москва-29» / vessel board names mixed into tags
  if (/москва-\d+/i.test(value) || /,\s*москва/i.test(value)) return true;
  return false;
}

/** Длительность из тегов поставщика (для meta-ряда карточки). */
export function extractDurationLabel(tags?: string[] | null): string | null {
  for (const tag of tags || []) {
    const value = String(tag || '').trim();
    if (DURATION_TAG_RE.test(value)) return value;
  }
  return null;
}

/** Только подкатегории из taxonomy; если пусто — жанровые теги без правил площадки. */
export function collectCatalogLabels(
  session: Pick<PublicSessionDto, 'subcategories' | 'tags' | 'category' | 'title' | 'venue'>,
  limit = 3,
): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const transport = resolveCatalogTransportHint(session);

  for (const label of session.subcategories || []) {
    const value = String(label || '').trim();
    if (!isCatalogSubcategoryLabel(value, session.category)) continue;
    if (looksLikeVenueNameTag(value, session.venue)) continue;
    if (isConflictingTransportCatalogLabel(value, transport)) continue;
    const shown = displayCatalogLabel(value);
    if (seen.has(shown)) continue;
    seen.add(shown);
    labels.push(shown);
    if (labels.length >= limit) return labels;
  }

  for (const tag of session.tags || []) {
    const value = String(tag || '').trim();
    if (!isCatalogSubcategoryLabel(value, session.category)) continue;
    if (looksLikeVenueNameTag(value, session.venue)) continue;
    if (isConflictingTransportCatalogLabel(value, transport)) continue;
    const shown = displayCatalogLabel(value);
    if (seen.has(shown)) continue;
    seen.add(shown);
    labels.push(shown);
    if (labels.length >= limit) break;
  }

  return labels;
}
