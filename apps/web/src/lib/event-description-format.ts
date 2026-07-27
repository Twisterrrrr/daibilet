/** Soft-wrap join: "Храм Христа\\nСпасителя" → one line; keep real paragraph breaks. */
function joinSoftWrappedLines(text: string): string {
  return text.replace(/([^\n.!?…:;—–-])\n(?=[a-zа-яё])/gu, '$1 ');
}

export function cleanDisplayText(value?: string | null): string {
  return String(value || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeEventHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

export function escapeEventHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isDescriptionSectionHeading(line: string): boolean {
  const text = cleanDisplayText(line);
  if (!text || text.length > 72) return false;
  if (/[.!?…]$/u.test(text)) return false;
  if (
    /^(?:о маршруте|о событии|программа|включено|в стоимость входит|важно|маршрут|что вас ждёт|что вас ждет|условия|описание|подробнее|внимание|для кого|как добраться|расписание|основные достопримечательности|достопримечательности|организационные детали|что включено|что входит|продолжительность|продолжительность прогулки)$/iu.test(
      text,
    )
  ) {
    return true;
  }
  const letters = text.replace(/[^a-zA-Zа-яА-ЯёЁ]/gu, '');
  if (letters.length >= 3 && letters === letters.toUpperCase() && text.length <= 60) return true;
  return false;
}

export function splitDescriptionParagraphs(text: string): string[] {
  const normalized = joinSoftWrappedLines(String(text || '').replace(/\r\n?/g, '\n')).trim();
  const byBlankLine = normalized
    .split(/\n\s*\n+/)
    .map((part) => cleanDisplayText(part))
    .filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;

  const byLine = normalized
    .split(/\n+/)
    .map((part) => cleanDisplayText(part))
    .filter(Boolean);
  if (byLine.length > 1) return byLine;

  const single = cleanDisplayText(normalized);
  return single ? [single] : [];
}

/** Bullet at line start: ✅ / • / - / – / — followed by whitespace. */
const LIST_ITEM_PREFIX_RE = /^(?:✅|•|[-–—])\s+/u;

/** Split inline bullets after a colon: "детали: - a. - b." or "узнаете: ✅ a ✅ b". */
const INLINE_LIST_AFTER_COLON_RE = /^(.+?:)\s*((?:✅|•|[-–—])\s+\S[\s\S]*)$/u;
const INLINE_BULLET_SPLIT_RE = /\s+(?=(?:✅|•|[-–—])\s+)/u;

export function isListItemLine(line: string): boolean {
  return LIST_ITEM_PREFIX_RE.test(String(line || '').trim());
}

export function stripListItemPrefix(line: string): string {
  return String(line || '').trim().replace(LIST_ITEM_PREFIX_RE, '').trim();
}

/**
 * Partner feeds (esp. Teplohod) often emit landmark/enum lines without `-`/`•` markers.
 * Short lines without sentence punctuation, after soft-wrap join, are enumeration candidates.
 */
export function isPlainEnumerationLine(line: string): boolean {
  const text = String(line || '').trim();
  if (!text) return false;
  if (isListItemLine(text)) return false;
  if (text.length > 80) return false;
  if (/[.!?…]$/u.test(text)) return false;
  if (/:$/u.test(text)) return false;
  if (isDescriptionSectionHeading(text)) return false;
  return true;
}

export function parseInlineListAfterColon(line: string): { intro: string; items: string[] } | null {
  const text = String(line || '').trim();
  const match = text.match(INLINE_LIST_AFTER_COLON_RE);
  if (!match) return null;
  const intro = cleanDisplayText(match[1]);
  const rest = match[2].trim();
  const parts = rest.split(INLINE_BULLET_SPLIT_RE).map((part) => stripListItemPrefix(part)).filter(Boolean);
  if (parts.length < 2) return null;
  return { intro, items: parts };
}

/** TC feeds: "…увидеть X, Y, Z и многие другие…" on one line. */
const COMMA_LIST_INTRO_RE = /^(.+?(?:увидеть|узнаете|посетите|осмотрите|пройдёте|пройдете))\s+(.+)$/iu;
const LABEL_VALUE_LINE_RE = /^([A-ZА-ЯЁ][^:]{1,44}):\s*(.+)$/u;
const ATTENTION_LINE_RE = /^Внимание!\s*(.+)$/iu;

export function parseCommaSeparatedListAfterIntro(line: string): { intro: string; items: string[] } | null {
  const text = String(line || '').trim();
  const match = text.match(COMMA_LIST_INTRO_RE);
  if (!match) return null;
  const intro = cleanDisplayText(match[1]);
  let rest = match[2].trim().replace(/\.\s*$/, '');
  rest = rest.replace(/\s+и\s+(?:многие\s+другие|другие|пр\.?)\s+[^,]*$/iu, '');
  const rawItems = rest.split(/,\s*/).map((part) => part.trim()).filter(Boolean);
  if (rawItems.length < 3) return null;
  const items = [...rawItems];
  const last = items[items.length - 1];
  const andSplit = last.match(/^(.+?)\s+и\s+(.+)$/u);
  if (andSplit) {
    items[items.length - 1] = andSplit[1].trim();
    items.push(andSplit[2].trim());
  }
  return { intro: `${intro}:`, items: items.filter(Boolean) };
}

export function parseLabelValueLine(line: string): { label: string; value: string } | null {
  const text = String(line || '').trim();
  const match = text.match(LABEL_VALUE_LINE_RE);
  if (!match) return null;
  const label = cleanDisplayText(match[1]);
  const value = cleanDisplayText(match[2]);
  if (!label || !value || label.length > 44) return null;
  return { label, value };
}

export function parseAttentionLine(line: string): { body: string } | null {
  const text = String(line || '').trim();
  const match = text.match(ATTENTION_LINE_RE);
  if (!match) return null;
  const body = cleanDisplayText(match[1]);
  return body ? { body } : null;
}

function normalizeUserFacingCopy(text: string): string {
  return String(text || '')
    .replace(/[\u2013\u2014\u2212–—]/g, '-')
    .replace(/\s+-\s+/g, ' - ');
}

export type EventDescriptionBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

function pushParagraphOrHeading(blocks: EventDescriptionBlock[], text: string) {
  const cleaned = cleanDisplayText(text);
  if (!cleaned) return;
  const withoutColon = cleaned.replace(/:$/u, '').trim();
  // Short label lines ending with ":" (often before a bullet list) → heading.
  if (
    isDescriptionSectionHeading(cleaned) ||
    isDescriptionSectionHeading(withoutColon) ||
    (/:$/u.test(cleaned) && cleaned.length <= 72)
  ) {
    blocks.push({ type: 'heading', text: withoutColon || cleaned });
    return;
  }
  blocks.push({ type: 'paragraph', text: cleaned });
}

function pushIntroBeforeList(blocks: EventDescriptionBlock[], intro: string) {
  const cleaned = cleanDisplayText(intro);
  if (!cleaned) return;
  const withoutColon = cleaned.replace(/:$/u, '').trim();
  if (isDescriptionSectionHeading(withoutColon) || /:$/u.test(cleaned)) {
    blocks.push({ type: 'heading', text: withoutColon || cleaned });
    return;
  }
  blocks.push({ type: 'paragraph', text: cleaned });
}

/**
 * Parse plain-text event description into paragraphs, section headings and lists.
 * Recognizes line bullets (✅ / • / - / –), marker-less enumeration runs, and
 * inline "Label: - a - b" forms.
 *
 * Important: after soft-wrap join, remaining newlines are structural. Do NOT
 * merge consecutive lines via cleanDisplayText - that collapses Teplohod-style
 * landmark lists and paragraph breaks into a single wall of text.
 */
export function parseEventDescriptionBlocks(text: string): EventDescriptionBlock[] {
  const normalized = joinSoftWrappedLines(String(text || '').replace(/\r\n?/g, '\n')).trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks: EventDescriptionBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (isListItemLine(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) {
          i += 1;
          break;
        }
        if (!isListItemLine(current)) break;
        items.push(stripListItemPrefix(current));
        i += 1;
      }
      if (items.length) blocks.push({ type: 'list', items });
      continue;
    }

    if (isPlainEnumerationLine(line)) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length) {
        const current = lines[j].trim();
        if (!current) break;
        if (isListItemLine(current)) break;
        if (!isPlainEnumerationLine(current)) break;
        items.push(current);
        j += 1;
      }
      if (items.length >= 2) {
        blocks.push({ type: 'list', items });
        i = j;
        continue;
      }
    }

    const inline = parseInlineListAfterColon(line);
    if (inline) {
      pushIntroBeforeList(blocks, inline.intro);
      blocks.push({ type: 'list', items: inline.items });
      i += 1;
      continue;
    }

    const commaList = parseCommaSeparatedListAfterIntro(line);
    if (commaList) {
      const intro = cleanDisplayText(commaList.intro);
      if (intro) blocks.push({ type: 'paragraph', text: intro });
      blocks.push({ type: 'list', items: commaList.items });
      i += 1;
      continue;
    }

    const attention = parseAttentionLine(line);
    if (attention) {
      blocks.push({ type: 'heading', text: 'Внимание' });
      blocks.push({ type: 'paragraph', text: attention.body });
      i += 1;
      continue;
    }

    const labelValue = parseLabelValueLine(line);
    if (labelValue) {
      blocks.push({ type: 'heading', text: labelValue.label });
      blocks.push({ type: 'paragraph', text: labelValue.value });
      i += 1;
      continue;
    }

    pushParagraphOrHeading(blocks, line);
    i += 1;
  }

  return blocks;
}

function renderBlocksToHtml(blocks: EventDescriptionBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'heading') {
        return `<h3>${escapeEventHtml(normalizeUserFacingCopy(block.text))}</h3>`;
      }
      if (block.type === 'list') {
        const items = block.items
          .map((item) => `<li>${escapeEventHtml(normalizeUserFacingCopy(item))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeEventHtml(normalizeUserFacingCopy(block.text))}</p>`;
    })
    .join('');
}

/**
 * Safe HTML for event description.
 * - Existing HTML (tags): sanitize only, do not re-parse as lists.
 * - Plain text: paragraphs + headings + `<ul>/<li>` for detected bullets.
 */
export function formatEventDescriptionHtml(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return sanitizeEventHtml(text);
  }
  return sanitizeEventHtml(renderBlocksToHtml(parseEventDescriptionBlocks(text)));
}
