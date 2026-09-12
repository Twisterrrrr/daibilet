const UTILITY_CATALOG_TAG_RE =
  /^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|кафе-бар|парковка|гардероб|кондиционирование)$/i;
const DURATION_CATALOG_TAG_RE = /^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i;
const VESSEL_CATALOG_TAG_RE = /^(теплоход|катер|яхт|судно|лодк)\s*:/i;
const VENUE_PLACE_CATALOG_TAG_RE = /^площадка\s*:/i;
const VENUE_POLICY_CATALOG_TAG_RE = /^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i;
const TECHNICAL_ID_TAG_RE = /^[a-f0-9-]{16,}$/i;

/** Служебные теги импорта — не показываем в «популярных запросах». */
export function isTechnicalCatalogTag(tag: string): boolean {
  const value = String(tag || '').trim();
  if (!value || value.length < 3) return true;
  const lower = value.toLowerCase();

  if (UTILITY_CATALOG_TAG_RE.test(lower)) return true;
  if (DURATION_CATALOG_TAG_RE.test(lower)) return true;
  if (VESSEL_CATALOG_TAG_RE.test(lower)) return true;
  if (VENUE_PLACE_CATALOG_TAG_RE.test(lower)) return true;
  if (VENUE_POLICY_CATALOG_TAG_RE.test(lower)) return true;
  if (/^причал\b/i.test(lower)) return true;
  if (TECHNICAL_ID_TAG_RE.test(value)) return true;
  if (/^\d+$/.test(value)) return true;
  if (value.length > 42) return true;

  if (/отдельн/i.test(lower) && /столик/i.test(lower)) return true;
  if (/коляск/i.test(lower)) return true;
  if (/велосипед/i.test(lower)) return true;
  if (/животн/i.test(lower)) return true;
  if (/сво[ейё]м?\s+алкогол/i.test(lower)) return true;
  if (/сво[ейё]й?\s+ед/i.test(lower)) return true;
  if (/^(ресторан[-\s]?бар|отопление|экскурсовод|аудиогид)$/i.test(lower)) return true;
  if (/тё?плые?\s+плед/i.test(lower)) return true;
  if (/^панорамн/i.test(lower)) return true;
  if (/детск(ие|ая)\s+стуль/i.test(lower)) return true;
  if (/^с\s+(обедом|ужином|питанием)/i.test(lower)) return true;
  if (/^ледовый\s+класс/i.test(lower)) return true;

  return false;
}

export function collectPopularTags(
  sessions: Array<{ tags?: string[] | null }>,
  limit: number,
): Array<{ name: string; events: number }> {
  const counts = new Map<string, number>();

  for (const session of sessions) {
    for (const tag of session.tags || []) {
      const clean = String(tag || '').trim();
      if (isTechnicalCatalogTag(clean)) continue;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, events]) => ({ name, events }));
}
