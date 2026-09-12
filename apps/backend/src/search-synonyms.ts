/**
 * Thin alias layer for header search before Meilisearch (P2).
 * Keys are lowercase; values expand the query for ILIKE / trgm.
 */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  мариинка: ['мариинский', 'мариинского'],
  мариинский: ['мариинка'],
  эрмитаж: ['hermitage'],
  hermitage: ['эрмитаж'],
  тцк: ['ticketsland', 'ticketscloud'],
  теплоход: ['теплоходик', 'катер', 'круиз'],
  катер: ['теплоход'],
  стендап: ['standup', 'stand-up', 'стенд-ап'],
  standup: ['стендап', 'стенд-ап'],
  'stand-up': ['стендап'],
  мдм: ['московский дворец молодёжи', 'московский дворец молодежи'],
  лужники: ['спорткомплекс лужники'],
  газгольдер: ['gasholder'],
  питер: ['санкт-петербург', 'спб', 'петербург'],
  спб: ['санкт-петербург', 'петербург', 'питер'],
  петербург: ['санкт-петербург', 'спб', 'питер'],
  мск: ['москва'],
  москва: ['мск'],
  екб: ['екатеринбург'],
  екатеринбург: ['екб'],
};

/** Expand query with known aliases (deduped, original first). */
export function expandSearchQuery(raw: string): string[] {
  const q = String(raw || '').trim().toLowerCase();
  if (!q) return [];
  const out = new Set<string>([q]);
  const direct = SEARCH_SYNONYMS[q];
  if (direct) {
    for (const alias of direct) out.add(alias.toLowerCase());
  }
  // Partial key match for multi-word queries containing an alias token.
  for (const [key, aliases] of Object.entries(SEARCH_SYNONYMS)) {
    if (q.includes(key) || key.includes(q)) {
      out.add(key);
      for (const alias of aliases) out.add(alias.toLowerCase());
    }
  }
  return [...out].slice(0, 8);
}
