/**
 * Reformat raw provider descriptions (Ticketscloud plain-with-<br>, Teplohod HTML)
 * into a structured markdown-like plain text stored in EventOverride.description.
 *
 * Goals (owner request 2026-10-11):
 * - visual section titles become `## Title` (rendered as H3 by formatEventDescriptionHtml);
 * - walls of text get paragraph / list structure;
 * - long/medium dashes replaced with plain hyphen (project copy rule);
 * - section blocks kept where provider text already has them (Программа, Что вас
 *   ждет, Организационные детали, Кому подойдёт, Преимущества, …).
 *
 * The function never invents facts and never rewrites sentences: it only
 * re-punctuates structure (line breaks, markdown markers) and normalizes dashes.
 *
 * Output contract (must stay in sync with parseEventDescriptionBlocks):
 * - `## X` - heading, X <= 72 chars, no trailing .!?…
 * - `- item` - list item lines, consecutive
 * - paragraphs separated by a single blank line; no single \n inside paragraphs
 *   unless it is a soft wrap the renderer joins itself.
 */

const DASH_RE = /[\u2013\u2014\u2212]/g;
const SOFT_SPACE_RE = /[\u00a0\u202f\u2009\u2007\u2008]/g;
const HTML_TAG_RE = /<[a-z][\s\S]*>/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  ndash: '-',
  mdash: '-',
  minus: '-',
  hellip: '…',
  bull: '•',
  middot: '·',
  deg: '°',
  rub: '₽',
  copy: '©',
  reg: '®',
  trade: '™',
  eacute: 'é',
  times: '×',
};

export function decodeHtmlEntities(text: string): string {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (full, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
    })
    .replace(/&#(\d+);/g, (full, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
    })
    .replace(/&([a-z][a-z0-9]*);/gi, (full, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? full);
}

/** Convert provider HTML into raw lines (no trimming yet). */
export function htmlToPlainLines(html: string): string[] {
  let out = String(html || '');
  out = out.replace(/<!--[\s\S]*?-->/g, ' ');
  out = out.replace(
    /<(script|style|iframe|object|embed|form|svg|math|noscript|template|video|audio|source|track|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi,
    ' ',
  );
  out = out.replace(
    /<(script|style|iframe|object|embed|form|svg|math|noscript|template|video|audio|source|track|link|meta|base)\b[^>]*\/?>/gi,
    ' ',
  );
  out = out.replace(/<br\s*\/?>/gi, '\n');
  // List items: "<li>" starts a new "- " line, "</li>" adds nothing (avoid double break).
  out = out.replace(/<li\b[^>]*>/gi, '\n- ');
  out = out.replace(/<\/li\s*>/gi, '\n');
  // Block boundaries -> paragraph breaks.
  out = out.replace(/<\/(p|div|h[1-6]|ul|ol|blockquote|section|article|tr|table)\s*>/gi, '\n');
  out = out.replace(/<(p|div|h[1-6]|ul|ol|blockquote|section|article|tr|table)\b[^>]*>/gi, '\n');
  // Bold / italic markers survive as markdown.
  out = out.replace(/<\/?(b|strong)\b[^>]*>/gi, '**');
  out = out.replace(/<\/?(i|em)\b[^>]*>/gi, '*');
  // Links keep their text only.
  out = out.replace(/<\/?a\b[^>]*>/gi, '');
  out = out.replace(/<[^>]+>/g, ' ');
  out = decodeHtmlEntities(out);
  return out.replace(/\r\n?/g, '\n').split('\n');
}


export function normalizeReformatLine(line: string): string {
  return String(line || '')
    .replace(SOFT_SPACE_RE, ' ')
    .replace(DASH_RE, '-')
    .replace(/[\t\v\f\u200b\u2060\ufeff]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    // Typography: glue fixes only ("словоСлово" style misses), no word changes.
    .replace(/([а-яёa-z])\.(?=[А-ЯЁA-Z])/gu, '$1. ')
    .replace(/\s+\.\s*(?=[А-ЯЁA-Z])/gu, '. ')
    .replace(/([а-яёa-z0-9»")\]])\s+\.(?=\s|$)/gu, '$1.')
    .replace(/([а-яёa-z])([:;])(?=[А-ЯЁA-Z])/gu, '$1$2 ')
    .trim();
}

const DECOR_CHAR_RE = /[=\-~_*·•]/g;

/** "= = =", "***", "======" - decorative separators, no information. */
export function isDecorationLine(line: string): boolean {
  const t = String(line || '').trim();
  if (!t) return false;
  if (t.replace(/[\s=\-~_*·•]/g, '').length > 0) return false;
  return (t.match(DECOR_CHAR_RE) || []).length >= 3;
}

/**
 * Normalize bullet markers to "- ". Handles "-знакомство" (no space),
 * em/en dash, •, ✅ and "* item" (with space only, so *italic* survives).
 */
export function normalizeBulletLine(line: string): string | null {
  const t = String(line || '').trim();
  const match = t.match(/^([-–—•✅])\s*(?=\S)/u);
  if (match) return `- ${t.slice(match[0].length).trim()}`;
  const star = t.match(/^\*\s+(?=\S)/u);
  if (star) return `- ${t.slice(star[0].length).trim()}`;
  return null;
}

/**
 * Canonical section titles: single-line labels used by current provider feeds
 * and by the editorial canon (event-rewrite-seo-plan.md) plus the owner-requested
 * blocks (Преимущества, Кому рекомендуется, Зачем стоит посетить, …).
 * Match is exact (case-insensitive, trailing punctuation stripped).
 */
export const REFORMAT_SECTION_TITLES: ReadonlySet<string> = new Set(
  [
    'о событии',
    'о маршруте',
    'описание',
    'подробнее',
    'программа',
    'в программе',
    'что вас ждёт',
    'что вас ждет',
    'что включено',
    'включено',
    'в стоимость входит',
    'что входит',
    'важно',
    'внимание',
    'условия',
    'организационные детали',
    'организационные условия',
    'маршрут',
    'расписание',
    'тайминг',
    'продолжительность',
    'продолжительность прогулки',
    'формат',
    'памятка',
    'посадка и отправление',
    'для кого',
    'как добраться',
    'основные достопримечательности',
    'достопримечательности',
    'правила на борту',
    'на борту',
    'меню',
    'меню на теплоходе',
    'что видно с воды',
    'что видно по маршруту',
    'что видно с борта',
    'что видно',
    'остановки',
    'впечатления',
    'особенности',
    'что особенного',
    'примечание',
    'дополнительно',
    'стоимость',
    'оплата',
    'возврат',
    'отмена',
    'преимущества',
    'кому подойдёт',
    'кому подойдет',
    'кому рекомендуется',
    'кому будет интересно',
    'кому интересно',
    'зачем стоит посетить',
    'зачем идти',
    'почему стоит посетить',
    'почему стоит пойти',
    'что понравится',
  ].map((t) => t.toLowerCase()),
);

/**
 * Decide whether a normalized line is a visual section title.
 * Returns the clean title text (without "## ") or null.
 * Guards keep the output contract of parseEventDescriptionBlocks:
 * <= 72 chars, no trailing .!?…, no markdown prefix leak.
 */
export function headingTitleFromLine(line: string): string | null {
  const raw = String(line || '').trim();
  if (!raw) return null;
  if (/^#{1,6}\s+/.test(raw)) return null;
  if (/^https?:\/\//iu.test(raw)) return null;
  if (/^[-–—•✅*]\s/.test(raw)) return null;

  let candidate: string | null = null;

  // 1) Whole-line bold: **Организационные условия**
  const bold = raw.match(/^\*\*(.+?)\*\*$/u);
  if (bold) candidate = bold[1].trim();

  // 2) Canonical section title exact match (trailing punctuation tolerated).
  if (!candidate) {
    const bare = raw.replace(/[:;.]+$/u, '').trim();
    if (REFORMAT_SECTION_TITLES.has(bare.toLowerCase())) candidate = bare;
  }

  // 3) Label line ending with ":" (same rule as the renderer for <=72 chars).
  if (!candidate && /:$/u.test(raw) && !/^[a-zа-яё]/u.test(raw)) candidate = raw.replace(/:$/u, '').trim();

  // 4) ALL CAPS line (>= 3 letters). Trailing . or ; allowed when there is no
  //    other sentence punctuation inside.
  if (!candidate) {
    const letters = raw.replace(/[^a-zA-Zа-яА-ЯёЁ]/gu, '');
    if (letters.length >= 3 && letters === letters.toUpperCase() && /[A-ZА-ЯЁ]/u.test(letters)) {
      if (!/[.!?…]$/u.test(raw)) {
        candidate = raw.replace(/[:;]+$/u, '').trim();
      } else if (/\.$/u.test(raw) && !/[.!?…]/u.test(raw.slice(0, -1))) {
        candidate = raw.slice(0, -1).trim();
      }
    }
  }

  if (!candidate) return null;
  const title = candidate.replace(/ {2,}/g, ' ').trim();
  if (!title || title.length > 72) return null;
  if (/[.!?…]$/u.test(title)) return null;
  if (/^[#\-*]/u.test(title)) return null;
  return title;
}

/** Collapse runs of blank lines into one; strip leading/trailing blanks. */
export function collapseBlankLines(lines: string[]): string[] {
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

/**
 * Blank lines inside a bullet run ("- a", "", "- b") are dropped: the renderer
 * needs consecutive "- " lines to build a single <ul>.
 */
export function collapseListGaps(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === '') {
      const prev = out[out.length - 1];
      let k = i;
      while (k < lines.length && lines[k] === '') k += 1;
      const next = lines[k];
      if (prev && prev.startsWith('- ') && next && next.startsWith('- ')) {
        i = k - 1;
        continue;
      }
    }
    out.push(line);
  }
  return out;
}

/** Common Russian abbreviations: "т. е." must not look like a sentence end. */
const ABBREV_BEFORE_DOT_RE = /(?:^|\s)(?:т|е|п|г|д|им|др|ст|ул|пр|см|рис|стр|об|к|н|ред|пер|тыс|млн|руб|коп)$/iu;

/**
 * Split a run-on paragraph into smaller ones without changing a single
 * character: groups of sentences (~2 per paragraph, target <= 500 chars).
 * Only applied to long multi-sentence blocks; short clean paragraphs stay as-is.
 */
export function splitRunOnParagraph(paragraph: string): string[] {
  const text = String(paragraph || '').trim();
  if (text.length < 700) return [text];

  // Break candidates: ". ", "! ", "? ", "… " followed by an uppercase letter / quote / digit.
  const sentences: string[] = [];
  let start = 0;
  for (let i = 1; i < text.length; i += 1) {
    const ch = text[i - 1];
    const next = text[i];
    if (!/[.!?…]/.test(ch) || next !== ' ') continue;
    const before = text.slice(Math.max(0, i - 13), i - 1);
    if (ABBREV_BEFORE_DOT_RE.test(before.trimEnd())) continue;
    const after = text.slice(i + 1);
    const fw = after.search(/\S/);
    if (fw < 0) break;
    const first = after[fw];
    if (!/[A-ZА-ЯЁ«"“(\d]/.test(first)) continue;
    sentences.push(text.slice(start, i).trim());
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  if (sentences.length < 4) return [text];

  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && candidate.length > 500 && parts.length + 1 < sentences.length) {
      parts.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts.length > 1 ? parts : [text];
}

/** Consecutive "+ item" runs (>=2) are provider bullet lists -> "- item". */
export function promotePlusLineRuns(blocks: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (/^\+ /.test(blocks[i])) {
      let j = i;
      while (j < blocks.length && /^\+ /.test(blocks[j])) j += 1;
      if (j - i >= 2) {
        for (let k = i; k < j; k += 1) out.push(`- ${blocks[k].slice(2).trim()}`);
      } else {
        out.push(blocks[i]);
      }
      i = j;
      continue;
    }
    out.push(blocks[i]);
    i += 1;
  }
  return out;
}

/**
 * Short provider line that can be a markerless list item: short, without sentence
 * punctuation, starting with a capital/digit/quote. Runs of 2+ such lines stay as
 * separate lines so the renderer builds a <ul> instead of one glued paragraph.
 * Lowercase continuations are soft wraps and merge instead.
 */
function isEnumerationRunLine(text: string): boolean {
  const t = String(text || '').trim();
  if (!t || t.length > 45) return false;
  if (/^[a-zа-яё]/u.test(t)) return false;
  // "+ item" runs are provider bullet lists handled by promotePlusLineRuns().
  if (/^\+\s/u.test(t)) return false;
  return !/[.!?…:;]$/u.test(t);
}

export type ReformatEntry = {
  type: 'text' | 'heading' | 'bullet' | 'blank';
  text: string;
  /** Internal marker: line belongs to a markerless enumeration run. */
  fromRun?: boolean;
};

/**
 * Merge soft-wrapped lines before block classification (same idea as the renderer
 * joinSoftWrappedLines, extended for provider texts broken mid-sentence).
 * Two rules:
 *   1. next line starts lowercase (classic soft wrap);
 *   2. previous line is long and not finished by sentence punctuation, next line is
 *      long and starts a new word/quote/bracket (hard <br> in the middle of a sentence).
 * Headings / bullets / blanks and markerless enumeration runs (2+ short lines)
 * never merge, so visual titles and landmark lists survive.
 */
export function mergeSoftWrappedEntries(entries: ReformatEntry[]): ReformatEntry[] {
  // Mark markerless enumeration runs.
  const inRun = new Array<boolean>(entries.length).fill(false);
  let i = 0;
  while (i < entries.length) {
    if (entries[i].type === 'text' && isEnumerationRunLine(entries[i].text)) {
      let j = i;
      while (j < entries.length && entries[j].type === 'text' && isEnumerationRunLine(entries[j].text)) j += 1;
      if (j - i >= 2) {
        for (let k = i; k < j; k += 1) inRun[k] = true;
      }
      i = j;
    } else {
      i += 1;
    }
  }

  const merged: ReformatEntry[] = [];
  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    const prev = merged[merged.length - 1];
    if (entry.type === 'text' && prev && prev.type === 'text' && !inRun[idx] && !prev.fromRun) {
      const endsSentence = /[.!?…:;]$/u.test(prev.text);
      const startsLower = /^[a-zа-яё]/u.test(entry.text);
      const brokenMidSentence =
        !endsSentence &&
        prev.text.length >= 60 &&
        entry.text.length >= 30 &&
        !/^[A-ZА-ЯЁ][^:]{1,24}:/u.test(entry.text) &&
        /^[A-ZА-ЯЁ0-9«"(\[]/u.test(entry.text);
      if ((!endsSentence && startsLower) || brokenMidSentence) {
        prev.text = `${prev.text} ${entry.text}`;
        continue;
      }
    }
    merged.push(inRun[idx] ? { ...entry, fromRun: true } : { ...entry });
  }
  return merged;
}

/** Number of sentence-ending punctuation marks (a rough sentence counter). */
export function countSentenceEnds(text: string): number {
  const m = String(text || '').match(/[.!?…]+(?=\s|$)/gu);
  return m ? m.length : 0;
}

/**
 * Line that can join a sentence-based paragraph: ends with sentence punctuation
 * and is not a short "Label: value" fact line (those read better as their own lines).
 */
export function isParagraphSentenceLine(text: string): boolean {
  const t = String(text || '').trim();
  if (!t || !/[.!?…]$/u.test(t)) return false;
  if (t.length <= 60 && /^[^:]{1,40}:/u.test(t)) return false;
  return true;
}

const PARAGRAPH_SENTENCE_TARGET = 3;
const PARAGRAPH_SENTENCE_MAX = 5;
const PARAGRAPH_MAX_LENGTH = 600;

/**
 * Group consecutive one-sentence lines into readable paragraphs of 3-5 sentences.
 * Provider feeds (TC `<br>` per sentence, Teplohod `<p>` per sentence) would otherwise
 * render as a wall of one-sentence paragraphs. Blank lines between sentences are
 * transparent; headings / bullets / markerless enumeration runs break the group.
 */
export function groupParagraphs(entries: ReformatEntry[]): ReformatEntry[] {
  const out: ReformatEntry[] = [];
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    if (entry.type !== 'text' || entry.fromRun || !isParagraphSentenceLine(entry.text)) {
      out.push(entry);
      i += 1;
      continue;
    }

    const parts: string[] = [];
    let sentences = 0;
    let length = 0;
    while (i < entries.length) {
      const cur = entries[i];
      if (cur.type === 'blank') {
        let k = i;
        while (k < entries.length && entries[k].type === 'blank') k += 1;
        const next = entries[k];
        const continues =
          parts.length > 0 && next && next.type === 'text' && !next.fromRun && isParagraphSentenceLine(next.text);
        if (!continues) break;
        i = k;
        continue;
      }
      if (cur.type !== 'text' || cur.fromRun || !isParagraphSentenceLine(cur.text)) break;
      const curSentences = countSentenceEnds(cur.text) || 1;
      if (parts.length && (sentences + curSentences > PARAGRAPH_SENTENCE_MAX || length + cur.text.length + 1 > PARAGRAPH_MAX_LENGTH)) {
        break;
      }
      parts.push(cur.text);
      sentences += curSentences;
      length += cur.text.length + 1;
      i += 1;
      if (sentences >= PARAGRAPH_SENTENCE_TARGET) break;
    }
    out.push({ type: 'text', text: parts.join(' ') });
  }
  return out;
}

/** "Имя Фамилия - Вокал" style line: a person with a role/instrument. */
const LINEUP_ROLE_RE =
  / - (?:вокал|гитар|бас-|бас |барабан|ударн|скрипк|саксофон|роял|пиан|клавиш|ансамбл|оркестр|ведущ|сопровожд|дириж|солист|артист|танц|хореограф|режисс|автор|дуэт|трио|квартет|вокальн|бэк-?вокал)/iu;

/** A run of markerless lines that looks like a concert line-up (2+ roles). */
export function looksLikeLineup(lines: string[]): boolean {
  return lines.filter((l) => LINEUP_ROLE_RE.test(l)).length >= 2;
}

/**
 * Reformat a raw provider description (plain-with-<br> or HTML) into structured
 * markdown-like text for EventOverride.description.
 * Deterministic and idempotent: reformat(reformat(x)) === reformat(x).
 */
export function reformatEventDescription(raw: string): string {
  const source = String(raw || '').trim();
  if (!source) return '';

  const rawLines = HTML_TAG_RE.test(source)
    ? htmlToPlainLines(source)
    : source.replace(/\r\n?/g, '\n').split('\n');

  // Phase 1: normalize + classify each line.
  const entries: ReformatEntry[] = [];
  for (const rawLine of rawLines) {
    const line = normalizeReformatLine(rawLine);
    if (!line) {
      entries.push({ type: 'blank', text: '' });
      continue;
    }
    if (isDecorationLine(line)) continue;

    const bullet = normalizeBulletLine(line);
    if (bullet) {
      entries.push({ type: 'bullet', text: bullet });
      continue;
    }

    const title = headingTitleFromLine(line);
    if (title) {
      entries.push({ type: 'heading', text: title });
      continue;
    }

    entries.push({ type: 'text', text: line });
  }

  // Phase 2: merge soft-wrapped text lines (provider <br> within a sentence).
  const merged = mergeSoftWrappedEntries(entries);

  // Phase 3: group one-sentence lines into readable paragraphs (3-5 sentences).
  const grouped = groupParagraphs(merged);

  // Phase 4: render blocks (blank line between blocks, "- " lists stay together).
  const blocks: string[] = [];
  for (let i = 0; i < grouped.length; i += 1) {
    const entry = grouped[i];
    if (entry.type === 'blank') {
      if (blocks.length && blocks[blocks.length - 1] !== '') blocks.push('');
      continue;
    }
    if (entry.type === 'bullet') {
      // Consecutive bullet lines form one list; blank lines inside a run are
      // transparent (provider emits "<p>- a</p><p>- b</p>"). A concert line-up
      // additionally gets a "В программе" title.
      const run: string[] = [];
      let j = i;
      while (j < grouped.length) {
        const cur = grouped[j];
        if (cur.type === 'bullet') {
          run.push(cur.text);
          j += 1;
          continue;
        }
        if (cur.type === 'blank') {
          let k = j;
          while (k < grouped.length && grouped[k].type === 'blank') k += 1;
          if (k < grouped.length && grouped[k].type === 'bullet') {
            j = k;
            continue;
          }
        }
        break;
      }
      if (looksLikeLineup(run.map((x) => x.replace(/^-\s*/u, '')))) {
        if (blocks.length && blocks[blocks.length - 1] !== '') blocks.push('');
        blocks.push('## В программе');
        blocks.push('');
      }
      for (const item of run) blocks.push(item);
      i = j - 1;
      continue;
    }
    if (entry.type === 'heading') {
      if (blocks.length && blocks[blocks.length - 1] !== '') blocks.push('');
      blocks.push(`## ${entry.text}`);
      blocks.push('');
      continue;
    }
    if (entry.fromRun) {
      // Markerless enumeration run -> plain lines (renderer builds the <ul>);
      // a concert line-up additionally gets a "В программе" title.
      const run: string[] = [];
      let j = i;
      while (j < grouped.length && grouped[j].type === 'text' && grouped[j].fromRun) {
        run.push(grouped[j].text);
        j += 1;
      }
      if (looksLikeLineup(run)) {
        if (blocks.length && blocks[blocks.length - 1] !== '') blocks.push('');
        blocks.push('## В программе');
        blocks.push('');
      }
      for (const item of run) blocks.push(item);
      i = j - 1;
      continue;
    }
    blocks.push(entry.text);
  }

  // Split run-on paragraphs (walls without any line breaks at all).
  const expanded: string[] = [];
  for (const block of collapseBlankLines(promotePlusLineRuns(blocks))) {
    if (!block || block.startsWith('## ') || block.startsWith('- ')) {
      expanded.push(block);
      continue;
    }
    const parts = splitRunOnParagraph(block);
    if (parts.length > 1) {
      for (const part of parts) {
        if (expanded.length && expanded[expanded.length - 1] !== '') expanded.push('');
        expanded.push(part);
      }
      expanded.push('');
    } else {
      expanded.push(block);
    }
  }

  return collapseListGaps(collapseBlankLines(expanded)).join('\n').trim();
}

