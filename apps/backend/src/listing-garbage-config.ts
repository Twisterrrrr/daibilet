/**
 * SEO.20 - словарь мусора в title/description партнёрских листингов.
 *
 * Choices documented for owner:
 * - `/скидк[аиоу]/i` **не** включаем: легитимные «скидка студентам/детям» шумят daily alert.
 * - CAPS `[А-ЯЁ]{5,}` **не** в лоб: у TEP/TC почти все title в капсе («ЗОЛОТОЙ МАРШРУТ»).
 *   Вместо этого: доля заглавных кириллических ≥70% при ≥10 буквах + прогон ≥5 (spam-shout).
 * - HTML-теги (`<p>`, `<br>`) в description часто приходят из partner CMS - ловим только в **title**;
 *   в description - лишь entities-паразиты (`&nbsp;` и т.п.) и broken encoding / CTA.
 */

export type ListingGarbageReason =
  | 'cta_offsite'
  | 'html_parasite'
  | 'caps_lock'
  | 'broken_encoding';

export type ListingGarbageField = 'title' | 'description' | 'any';

export interface ListingGarbageRule {
  id: string;
  reason: ListingGarbageReason;
  /** Human label for logs / Telegram */
  label: string;
  pattern: RegExp;
  /** Which fields this rule applies to */
  fields: readonly ListingGarbageField[];
}

const TITLE_ONLY = ['title'] as const;
const ANY_FIELD = ['any'] as const;
const DESC_OR_TITLE = ['title', 'description'] as const;

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
    fields: ANY_FIELD,
  },
  {
    id: 'cta_click_here',
    reason: 'cta_offsite',
    label: 'CTA offsite: нажмите сюда',
    pattern: /нажмите сюда/i,
    fields: ANY_FIELD,
  },
  {
    id: 'cta_partner_site',
    reason: 'cta_offsite',
    label: 'CTA offsite: сайте партнера/партнёра',
    pattern: /сайте партн[её]ра/i,
    fields: ANY_FIELD,
  },
  {
    id: 'html_entity',
    reason: 'html_parasite',
    label: 'HTML entity parasite',
    pattern: /(&nbsp;|&amp;|&quot;|&lt;|&gt;|&#\d+;)/i,
    fields: DESC_OR_TITLE,
  },
  {
    id: 'html_tag_in_title',
    reason: 'html_parasite',
    label: 'HTML tag in title',
    pattern: /<\/?[a-z][^>]*>/i,
    fields: TITLE_ONLY,
  },
  {
    id: 'replacement_char',
    reason: 'broken_encoding',
    label: 'Replacement char U+FFFD',
    // Owner plan had empty `/[]/` - use real mojibake / replacement patterns.
    pattern: /\uFFFD/,
    fields: ANY_FIELD,
  },
  {
    id: 'utf8_as_latin1',
    reason: 'broken_encoding',
    label: 'UTF-8-as-Latin1 mojibake (Ð/Ñ…)',
    pattern: /[ÐÑ][\u0080-\u00FF]/,
    fields: ANY_FIELD,
  },
  {
    id: 'null_byte',
    reason: 'broken_encoding',
    label: 'NUL byte in text',
    pattern: /\u0000/,
    fields: ANY_FIELD,
  },
]);

/** Flat list matching owner plan name `STOP_WORDS_REGEXP` (pattern-only). */
export const STOP_WORDS_REGEXP: readonly RegExp[] = Object.freeze(
  LISTING_GARBAGE_RULES.map((rule) => rule.pattern),
);

export interface ListingGarbageHit {
  ruleId: string;
  reason: ListingGarbageReason;
  label: string;
  field: 'title' | 'description';
  /** First match snippet (truncated) */
  match: string;
}

function truncateMatch(value: string, max = 48): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function ruleAppliesToField(rule: ListingGarbageRule, field: 'title' | 'description'): boolean {
  return rule.fields.includes('any') || rule.fields.includes(field);
}

/**
 * Soft CAPS: partner titles often shout a few words; flag only shouty titles
 * (high uppercase Cyrillic ratio + at least one 5+ run).
 */
export function hasCapsLockSpam(text: string): boolean {
  if (!text || !/[А-ЯЁ]{5,}/.test(text)) return false;
  const letters = text.match(/[А-Яа-яЁё]/g) || [];
  if (letters.length < 10) return false;
  const upper = text.match(/[А-ЯЁ]/g) || [];
  return upper.length / letters.length >= 0.7;
}

/** Scan title + description; returns unique rule hits (first match per rule+field). */
export function findListingGarbageHits(input: {
  title?: string | null;
  description?: string | null;
}): ListingGarbageHit[] {
  const title = String(input.title || '');
  const description = String(input.description || '');
  const hits: ListingGarbageHit[] = [];
  const seen = new Set<string>();

  const pushHit = (hit: ListingGarbageHit) => {
    const key = `${hit.ruleId}:${hit.field}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(hit);
  };

  for (const field of ['title', 'description'] as const) {
    const text = field === 'title' ? title : description;
    if (!text) continue;
    for (const rule of LISTING_GARBAGE_RULES) {
      if (!ruleAppliesToField(rule, field)) continue;
      const re = new RegExp(rule.pattern.source, rule.pattern.flags);
      const found = re.exec(text);
      if (!found) continue;
      pushHit({
        ruleId: rule.id,
        reason: rule.reason,
        label: rule.label,
        field,
        match: truncateMatch(found[0] || ''),
      });
    }
  }

  if (hasCapsLockSpam(title)) {
    pushHit({
      ruleId: 'caps_shout_title',
      reason: 'caps_lock',
      label: 'CAPS shout title (≥70% upper Cyrillic)',
      field: 'title',
      match: truncateMatch(title),
    });
  }

  return hits;
}

/** Back-compat helper for single-string scans (tests / ad-hoc). */
export function findListingGarbageHitsInText(text: string): ListingGarbageHit[] {
  return findListingGarbageHits({ title: text, description: '' });
}

export function textHasListingGarbage(text: string): boolean {
  return findListingGarbageHitsInText(text).length > 0;
}

export {
  sanitizePartnerVenueDisplayTitle,
  isFortressComplexName,
} from './venue-normalize.js';
