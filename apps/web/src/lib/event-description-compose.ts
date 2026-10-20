/**
 * Post-sync event description composer (owner rule 2026-10-20).
 *
 * New/changed imported events get a canonical description right after sync:
 * - provider copy is restructured (headings/lists/paragraphs, dash normalization);
 * - stray section labels ("Релиз", "Состав") become `## X` headings (lineups render
 *   under the canonical "В программе" title);
 * - the canonical fact block "## Практическая информация" is rebuilt from catalogue
 *   fields only, followed by the selling line;
 * - generated narrative filler is machine copy: it is stripped from rich cards and
 *   re-added as its own separate paragraph only when the prose is thin (<200 chars).
 *
 * Fact safety: the composer never invents facts. Everything factual comes from the
 * provider source text or catalogue fields (title, city, venue, address, sessions,
 * duration, price, age).
 *
 * Guarantees:
 * - deterministic: same input -> same output (stable narrative variant from seed);
 * - repair(compose) and compose are stable after one pass (idempotent fixed point);
 * - repairEventDescription preserves provider wording and existing fact blocks -
 *   it only fixes structure (used for legacy rows we must not fully recompose).
 */

import { normalizeUserFacingCopy } from './event-description-format.ts';
import {
  buildPracticalInfoBlock,
  cityInPhrase,
  describeFormat,
  type MinimalDescriptionInput,
} from './event-minimal-description.ts';
import {
  buildNarrativeParagraphs,
  stripNarrativeParagraphs,
  type NarrativeInput,
} from './event-narrative-description.ts';
import { reformatEventDescription } from './event-description-reformat.ts';

export const SELL_LINE = 'Билеты продаются онлайн. Оплата на сайте, электронный билет приходит на почту.';
export const SELL_LINE_RE = /Билеты продаются онлайн|Билеты на выбранную дату/iu;

/** Legacy fact blocks - dropped and rebuilt from catalogue fields. */
const DROP_SECTION_RE =
  /^##\s*(?:Практическая информация|Даты и билеты|Место проведения концерта|Где и когда|Когда и где)(?=\s|$)/iu;

/**
 * Stray provider section labels that arrive as plain lines (or glued to the end of
 * a paragraph) instead of headings - real cases: "Релиз" and "Состав" (Lyutova).
 */
const STRAY_SECTION_LABELS = new Set(
  [
    'релиз',
    'состав',
    'участники',
    'исполнители',
    'артисты',
    'line-up',
    'lineup',
    'сет-лист',
    'сет лист',
    'биография',
    'о группе',
    'о певице',
    'о певце',
    'об артисте',
    'о спектакле',
    'о концерте',
    'о выставке',
    'о программе',
    'о команде',
    'организаторы',
    'партнёры',
    'партнеры',
    'возрастные ограничения',
    'важная информация',
    'хронометраж',
  ].map((t) => t.toLowerCase()),
);

/** Lineup labels render under the canonical heading from the 2026-10-11 waves. */
const LINEUP_LABELS = new Set(
  ['состав', 'участники', 'исполнители', 'артисты', 'line-up', 'lineup', 'сет-лист', 'сет лист'].map((t) =>
    t.toLowerCase(),
  ),
);

export type ComposeInput = MinimalDescriptionInput &
  NarrativeInput & {
    /** Raw provider description (Event.description). */
    sourceDescription?: string | null;
    /** Stable seed (event id) so narrative wording does not drift between runs. */
    seed?: string | null;
    /** Explicit variant override (tests); defaults to stableVariant(seed). */
    variant?: number | null;
  };

export type ComposeFlags = {
  reformatted: boolean;
  headingsPromoted: string[];
  legacySectionsDropped: boolean;
  narrativeStripped: boolean;
  narrativeAdded: boolean;
  glueFixed: boolean;
  practicalInfoAdded: boolean;
  sellLineAdded: boolean;
};

export type ComposedDescription = {
  text: string;
  sourceUsed: 'source' | 'minimal';
  flags: ComposeFlags;
};

function emptyFlags(): ComposeFlags {
  return {
    reformatted: false,
    headingsPromoted: [],
    legacySectionsDropped: false,
    narrativeStripped: false,
    narrativeAdded: false,
    glueFixed: false,
    practicalInfoAdded: false,
    sellLineAdded: false,
  };
}

/** Same stable hash as scripts/upgrade-public-event-descriptions.js (wording continuity). */
export function stableVariant(seed: string | number | null | undefined): number {
  const s = String(seed ?? '');
  let h = 7;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}

/** Length of readable prose: paragraph text only (no headings, lists, sell line). */
export function proseLength(text: string): number {
  return String(text || '')
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith('## ') && !block.startsWith('- ') && !SELL_LINE_RE.test(block))
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim().length;
}

/** Typography glue fixes only - no word changes ("журнала«Jazz" -> "журнала «Jazz"). */
export function fixCopyGlue(text: string): string {
  return String(text || '')
    .replace(/([а-яёa-z0-9])([«“])/giu, '$1 $2')
    .replace(/([»”])([а-яёa-z0-9])/giu, '$1 $2');
}

/** "Состав" / "Релиз" (standalone line or glued tail) -> `## X` heading. */
function strayLabelTitle(line: string): string | null {
  const bare = String(line || '')
    .trim()
    .replace(/[:;.]+$/u, '')
    .trim();
  if (!bare || bare.length > 44) return null;
  const key = bare.toLowerCase();
  if (!STRAY_SECTION_LABELS.has(key)) return null;
  return LINEUP_LABELS.has(key) ? 'В программе' : bare;
}

function collapseBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    out.push(line);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

export function promoteStraySectionLabels(text: string): { text: string; promoted: string[] } {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out: string[] = [];
  const promoted: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('## ') || trimmed.startsWith('- ')) {
      out.push(line);
      continue;
    }
    const label = strayLabelTitle(trimmed);
    if (label) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      out.push(`## ${label}`);
      out.push('');
      promoted.push(label);
      continue;
    }
    // Glued tail: "... Кинофестиваля 2020. Состав" -> paragraph + heading.
    const tail = trimmed.match(/^(.*[.!?…])\s+(\S{1,40})$/u);
    if (tail) {
      const tailLabel = strayLabelTitle(tail[2]);
      if (tailLabel) {
        out.push(tail[1].trim());
        out.push('');
        out.push(`## ${tailLabel}`);
        out.push('');
        promoted.push(tailLabel);
        continue;
      }
    }
    out.push(line);
  }
  return { text: collapseBlankLines(out).join('\n'), promoted };
}

/**
 * Canonical block separation: one blank line between blocks (heading / list run /
 * text run), consecutive identical headings collapsed. reformatEventDescription
 * glues `## ` lines into markerless runs, so this pass is the fixed point keeper
 * for compose/repair idempotence.
 */
export function canonicalizeBlockSeparation(text: string): string {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());
  type BlockKind = 'heading' | 'list' | 'text';
  const blocks: { kind: BlockKind; lines: string[] }[] = [];
  let blankSeen = false;
  for (const line of lines) {
    if (!line) {
      blankSeen = true;
      continue;
    }
    const kind: BlockKind = line.startsWith('## ') ? 'heading' : line.startsWith('- ') ? 'list' : 'text';
    const last = blocks[blocks.length - 1];
    if (!blankSeen && last && last.kind === kind && kind !== 'heading') {
      last.lines.push(line);
      continue;
    }
    if (last && last.kind === 'heading' && kind === 'heading' && last.lines[0] === line) {
      continue; // duplicate heading (reformat auto "В программе" vs promoted label)
    }
    blocks.push({ kind, lines: [line] });
    blankSeen = false;
  }
  return blocks.map((block) => block.lines.join('\n')).join('\n\n');
}

/** Drop a `## Section` with its body up to the next `## ` heading. */
function dropSections(text: string, headingRe: RegExp): { text: string; dropped: boolean } {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out: string[] = [];
  let skipping = false;
  let dropped = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+/u.test(trimmed)) {
      if (headingRe.test(trimmed)) {
        skipping = true;
        dropped = true;
        continue;
      }
      skipping = false;
    }
    if (skipping) continue;
    out.push(line);
  }
  return { text: collapseBlankLines(out).join('\n'), dropped };
}

/**
 * Narrative policy: generated filler is stripped from rich cards and re-added as a
 * separate paragraph only for thin copy (<200 chars of prose). Never glued to
 * provider sentences (the 2026-10-11 waves glued it to the lead - see Saphath).
 */
function applyNarrativePolicy(text: string, input: NarrativeInput, variant: number, flags: ComposeFlags): string {
  const stripped = stripNarrativeParagraphs(text);
  if (stripped !== text) flags.narrativeStripped = true;
  if (proseLength(stripped) >= 200) return stripped;
  const [narrative] = buildNarrativeParagraphs(input, variant);
  if (!narrative) return stripped;
  const blocks = stripped
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);
  let insertAt = blocks.findIndex((block) => !block.startsWith('## ') && !block.startsWith('- '));
  insertAt = insertAt === -1 ? blocks.length : insertAt + 1;
  blocks.splice(insertAt, 0, narrative);
  flags.narrativeAdded = true;
  return blocks.join('\n\n');
}

function quote(name: string): string {
  return /[«"']/u.test(name) ? name : `«${name}»`;
}

/** Neutral factual opener for cards with no provider copy (canon: anons). */
function buildLead(input: MinimalDescriptionInput): string {
  const title = normalizeUserFacingCopy(String(input.title || '').trim());
  if (!title) return '';
  const format = describeFormat(input);
  const city = normalizeUserFacingCopy(String(input.city || '').trim());
  const venue = normalizeUserFacingCopy(String(input.venue || '').trim());
  const titleHasCity = city && title.toLowerCase().includes(city.toLowerCase());
  const placeParts: string[] = [];
  if (city && !titleHasCity) placeParts.push(cityInPhrase(city));
  if (venue && venue.toLowerCase() !== city.toLowerCase()) placeParts.push(`на площадке ${quote(venue)}`);
  const place = placeParts.length ? ` ${placeParts.join(', ')}` : '';
  return `${quote(title)} - ${format}${place}.`;
}

/** Structure-only pass shared by compose and repair. */
function normalizeStructure(text: string, flags: ComposeFlags): string {
  let out = fixCopyGlue(text);
  if (out !== text) flags.glueFixed = true;
  const promoted = promoteStraySectionLabels(out);
  out = promoted.text;
  if (promoted.promoted.length) {
    flags.headingsPromoted.push(...promoted.promoted);
  }
  return out;
}

/**
 * Full canonical composition from the provider source description.
 * Deterministic: same input (incl. seed) -> same text.
 */
export function composeEventDescription(input: ComposeInput): ComposedDescription {
  const flags = emptyFlags();
  const variant =
    input.variant != null && Number.isFinite(input.variant) ? Math.trunc(input.variant) : stableVariant(input.seed);
  const source = String(input.sourceDescription || '')
    .replace(/\r\n?/g, '\n')
    .trim();

  if (!source) {
    // No provider copy: lead + narrative + fact block + selling line.
    const lead = buildLead(input);
    const narrative = buildNarrativeParagraphs(input, variant);
    flags.narrativeAdded = narrative.length > 0;
    const factBlock = buildPracticalInfoBlock(input);
    flags.practicalInfoAdded = Boolean(factBlock);
    flags.sellLineAdded = true;
    const parts = [lead, ...narrative, factBlock, SELL_LINE].filter(Boolean);
    return { text: canonicalizeBlockSeparation(parts.join('\n\n')), sourceUsed: 'minimal', flags };
  }

  let text = reformatEventDescription(source);
  if (text !== source) flags.reformatted = true;
  text = normalizeStructure(text, flags);

  const legacy = dropSections(text, DROP_SECTION_RE);
  text = legacy.text;
  flags.legacySectionsDropped = legacy.dropped;

  text = applyNarrativePolicy(text, input, variant, flags);

  const factBlock = buildPracticalInfoBlock(input);
  if (factBlock) {
    text = `${text}\n\n${factBlock}`;
    flags.practicalInfoAdded = true;
  }
  if (!SELL_LINE_RE.test(text)) {
    text = `${text}\n\n${SELL_LINE}`;
    flags.sellLineAdded = true;
  }
  return { text: canonicalizeBlockSeparation(text), sourceUsed: 'source', flags };
}

/**
 * Structure-only repair of an existing description (legacy rows with unknown
 * origin). Keeps provider wording and existing fact blocks; only restructures
 * (headings/lists/paragraphs), fixes glues/dashes and applies the narrative
 * policy. `input` is optional - when absent, thin cards keep no narrative.
 */
export function repairEventDescription(text: string, input?: NarrativeInput, variant = 0): string {
  const source = String(text || '')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (!source) return '';
  const flags = emptyFlags();
  let out = reformatEventDescription(source);
  out = normalizeStructure(out, flags);
  out = applyNarrativePolicy(out, input || { title: '' }, variant, flags);
  return canonicalizeBlockSeparation(out);
}
