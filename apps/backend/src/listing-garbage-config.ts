/**
 * SEO.20 - словарь мусора в title/description партнёрских листингов.
 *
 * Choice: `/скидк[аиоу]/i` **не** включаем. Легитимные описания часто содержат
 * «скидка студентам / детям / по карте» - правило слишком шумное для daily alert.
 * Если понадобится ловить запрещённые промо-тексты - отдельный soft-rule с allowlist.
 */

export type ListingGarbageReason =
  | 'cta_offsite'
  | 'html_parasite'
  | 'caps_lock'
  | 'broken_encoding';

export interface ListingGarbageRule {
  id: string;
  reason: ListingGarbageReason;
  /** Human label for logs / Telegram */
  label: string;
  pattern: RegExp;
}

/**
 * Named rules (preferred). Patterns are rebuilt without sticky `lastIndex`
 * when testing - callers should treat them as immutable.
 */
export const LISTING_GARBAGE_RULES: readonly ListingGarbageRule[] = Object.freeze([
  {
    id: 'cta_buy_ticket',
    reason: 'cta_offsite',
    label: 'CTA offsite: купите билет',
    pattern: /купите билет/i,
  },
  {
    id: 'cta_click_here',
    reason: 'cta_offsite',
    label: 'CTA offsite: нажмите сюда',
    pattern: /нажмите сюда/i,
  },
  {
    id: 'cta_partner_site',
    reason: 'cta_offsite',
    label: 'CTA offsite: сайте партнера/партнёра',
    pattern: /сайте партн[её]ра/i,
  },
  {
    id: 'html_parasite',
    reason: 'html_parasite',
    label: 'HTML entity/tag parasite',
    pattern: /(&nbsp;|&amp;|&quot;|&lt;|&gt;|&#\d+;|<\/?[a-z][^>]*>)/i,
  },
  {
    id: 'caps_cyrillic',
    reason: 'caps_lock',
    label: 'CAPS lock 5+ Cyrillic',
    pattern: /[А-ЯЁ]{5,}/,
  },
  {
    id: 'replacement_char',
    reason: 'broken_encoding',
    label: 'Replacement char U+FFFD',
    // Owner plan had empty `/[]/` - use real mojibake / replacement patterns.
    pattern: /\uFFFD/,
  },
  {
    id: 'utf8_as_latin1',
    reason: 'broken_encoding',
    label: 'UTF-8-as-Latin1 mojibake (Ð/Ñ…)',
    pattern: /[ÐÑ][\u0080-\u00FF]/,
  },
  {
    id: 'null_byte',
    reason: 'broken_encoding',
    label: 'NUL byte in text',
    pattern: /\u0000/,
  },
]);

/** Flat list matching owner plan name `STOP_WORDS_REGEXP`. */
export const STOP_WORDS_REGEXP: readonly RegExp[] = Object.freeze(
  LISTING_GARBAGE_RULES.map((rule) => rule.pattern),
);

export interface ListingGarbageHit {
  ruleId: string;
  reason: ListingGarbageReason;
  label: string;
  /** First match snippet (truncated) */
  match: string;
}

function truncateMatch(value: string, max = 48): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/** Scan text against stop-word rules; returns unique rule hits (first match per rule). */
export function findListingGarbageHits(text: string): ListingGarbageHit[] {
  if (!text) return [];
  const hits: ListingGarbageHit[] = [];
  for (const rule of LISTING_GARBAGE_RULES) {
    // Clone flags so global/sticky patterns (if added later) do not leak lastIndex.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    const found = re.exec(text);
    if (!found) continue;
    hits.push({
      ruleId: rule.id,
      reason: rule.reason,
      label: rule.label,
      match: truncateMatch(found[0] || ''),
    });
  }
  return hits;
}

export function textHasListingGarbage(text: string): boolean {
  return findListingGarbageHits(text).length > 0;
}
