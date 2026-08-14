import type { PublicSession } from '@/types';

/** Служебные теги поставщиков — не показываем в каталоге. */
const UTILITY_TAG_RE =
  /^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|кафе-бар|парковка|гардероб|кондиционирование)$/i;
const DURATION_TAG_RE = /^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i;
const VESSEL_TAG_RE = /^(теплоход|катер|яхт|судно|лодк)\s*:/i;
const VENUE_POLICY_TAG_RE = /^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i;

export function isUtilityCatalogTag(tag: string): boolean {
  const value = String(tag || '').trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  if (UTILITY_TAG_RE.test(lower)) return true;
  if (DURATION_TAG_RE.test(lower)) return true;
  if (VESSEL_TAG_RE.test(lower)) return true;
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

/** Только подкатегории из taxonomy; если пусто — жанровые теги без правил площадки. */
export function collectCatalogLabels(
  session: Pick<PublicSession, 'subcategories' | 'tags' | 'category'>,
  limit = 3,
): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const label of session.subcategories || []) {
    const value = String(label || '').trim();
    if (!isCatalogSubcategoryLabel(value, session.category) || seen.has(value)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) return labels;
  }

  for (const tag of session.tags || []) {
    const value = String(tag || '').trim();
    if (!isCatalogSubcategoryLabel(value, session.category) || seen.has(value)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) break;
  }

  return labels;
}
