import { stripSessionDateLines } from './event-description-session-lines.ts';

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

const HTML_ALLOWED_TAGS = new Set([
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'strong',
  'em',
  'b',
  'i',
  'a',
  'blockquote',
]);

const HTML_VOID_TAGS = new Set(['br']);

const HTML_DANGEROUS_BLOCKS =
  /<(script|style|iframe|object|embed|form|link|meta|base|svg|math|noscript|template|video|audio|source|track)(\s[^>]*)?>[\s\S]*?<\/\1>/gi;

function escapeHtmlAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeHtmlHref(raw: string): string | null {
  const href = String(raw || '').trim();
  if (!href) return null;
  const lower = href.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }
  if (
    href.startsWith('/') ||
    href.startsWith('#') ||
    href.startsWith('https://') ||
    href.startsWith('http://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return href;
  }
  return null;
}

function extractHtmlAttr(attrs: string, name: string): string | null {
  const match = String(attrs || '').match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Allowlisted markup for partner HTML descriptions.
 * Strips script/iframe/svg, event handlers, and javascript: URLs.
 * Unquoted onerror= and similar must not survive.
 */
export function sanitizeEventHtml(html: string): string {
  let out = String(html || '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(HTML_DANGEROUS_BLOCKS, '');
  out = out.replace(/<(script|iframe|object|embed|form|link|meta|base|svg)\b[^>]*>/gi, '');
  out = out.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    const closing = full.startsWith('</');
    if (!HTML_ALLOWED_TAGS.has(name)) return '';
    if (closing) return HTML_VOID_TAGS.has(name) ? '' : `</${name}>`;
    if (HTML_VOID_TAGS.has(name)) return `<${name}>`;
    if (name === 'a') {
      const href = safeHtmlHref(extractHtmlAttr(attrs, 'href') || '');
      if (!href) return '<a>';
      return `<a href="${escapeHtmlAttr(href)}" rel="nofollow noopener noreferrer">`;
    }
    return `<${name}>`;
  });
  return out;
}

export function escapeEventHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Whole-line markdown headings: `**Организационные условия**` or `## Организационные условия`. */
const WHOLE_LINE_MARKDOWN_HEADING_RE = /^(?:\*\*(.+?)\*\*|#{1,6}\s+(.+?))$/u;

/**
 * If the line is only a bold-wrapped short title, return the inner text.
 * Used by AI rewrite output (`**Внимание**`, `**На борту**`, …).
 */
export function unwrapMarkdownHeadingLine(line: string): string | null {
  const text = String(line || '').trim();
  const match = text.match(WHOLE_LINE_MARKDOWN_HEADING_RE);
  if (!match) return null;
  const inner = cleanDisplayText(match[1] ?? match[2])
    .replace(/\s+#+$/u, '')
    .replace(/:$/u, '')
    .trim();
  if (!inner || inner.length > 72) return null;
  if (/[.!?…]$/u.test(inner)) return null;
  return inner;
}

export function isDescriptionSectionHeading(line: string): boolean {
  const text = cleanDisplayText(line);
  if (!text || text.length > 72) return false;
  if (/[.!?…]$/u.test(text)) return false;
  if (
    /^(?:о маршруте|о событии|программа|включено|в стоимость входит|важно|маршрут|что вас ждёт|что вас ждет|условия|описание|подробнее|внимание|для кого|как добраться|расписание|основные достопримечательности|достопримечательности|организационные детали|организационные условия|что включено|что входит|программа тура|в стоимость тура входит|оплачивается дополнительно|при посадке гиду|по желанию|дополнительно|продолжительность|продолжительность прогулки|особенности|правила на борту|на борту|в программе|формат|тайминг|памятка|посадка и отправление|что видно с воды|что видно по маршруту|что видно с борта)$/iu.test(
      text,
    )
  ) {
    return true;
  }
  const letters = text.replace(/[^a-zA-Zа-яА-ЯёЁ]/gu, '');
  if (letters.length >= 3 && letters === letters.toUpperCase() && text.length <= 60) return true;
  return false;
}

/**
 * Escape + light inline markdown for AI/plain descriptions.
 * Order: escape first, then **bold** / *italic* (safe tags only).
 */
export function formatInlineEventMarkdown(text: string): string {
  const escaped = escapeEventHtml(normalizeUserFacingCopy(text));
  return escaped
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
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

/** `07:00 - …` / `08:50 - 09:10 - …` schedule rows from bus and boat tours. */
const SCHEDULE_LINE_RE = /^\d{1,2}:\d{2}\s*[-–—]\s*/u;

export function isScheduleLine(line: string): boolean {
  return SCHEDULE_LINE_RE.test(String(line || '').trim());
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

/** Generic labels that are section headings even on the first line. */
const GENERIC_SECTION_LABEL_RE =
  /^(?:программа|внимание|важно|в стоимость|что |как |место|адрес|билет|возраст|продолжительность|организационные|оплачивается|по желанию|дополнительно|контакты|телефон)/iu;

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
  // A dash inside the label means it is a phrase, not a section label
  // ("Концерт на корабле - это: …"), so it must not become an <h3>.
  if (/\s[-–—]\s/u.test(label)) return null;
  // Only short field labels ("Место:", "Маршрут:", "Продолжительность прогулки:")
  // are headings; "Входной билет в горный парк Рускеала: 750 руб.…" is a fact
  // line that belongs in a list, not a section title.
  if (label.split(/\s+/u).length > 4 || label.length > 32) return null;
  return { label, value };
}

export function parseAttentionLine(line: string): { body: string } | null {
  const text = String(line || '').trim();
  const match = text.match(ATTENTION_LINE_RE);
  if (!match) return null;
  const body = cleanDisplayText(match[1]);
  return body ? { body } : null;
}

export function normalizeUserFacingCopy(text: string): string {
  return String(text || '')
    .replace(/[\u2013\u2014\u2212–—]/g, '-')
    // Only horizontal whitespace: a newline before a list dash is structure.
    .replace(/[ \t]+-[ \t]+/g, ' - ');
}

/** Lowercase, punctuation-free comparison key for lead/title matching. */
function normalizeLeadKey(value: string): string {
  return normalizeUserFacingCopy(String(value || ''))
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[«»"'`]/g, ' ')
    .replace(/[.,!;:…()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Drop a lead paragraph that merely repeats the H1 title
 * ("В Рускеалу… в Санкт-Петербурге." under H1 "В Рускеалу…"). Only a short
 * place tail ("в Санкт-Петербурге", "в Москве") counts as part of the
 * duplicate; a real lead with its own content ("…на примерах из мультфильмов")
 * is kept. `place` is the event city: it guards against dropping a lead whose
 * tail merely starts with a preposition.
 */
export function stripTitleDuplicateLead(text: string, title: string, place?: string): string {
  const full = String(text || '').replace(/\r\n?/g, '\n');
  const normalizedTitle = normalizeLeadKey(title);
  if (!normalizedTitle) return full;

  const paragraphs = full.split(/\n\s*\n/);
  const first = normalizeLeadKey(paragraphs[0] || '');
  if (!first || !first.startsWith(normalizedTitle)) return full;

  const tail = first.slice(normalizedTitle.length).trim();
  if (!tail) return paragraphs.slice(1).join('\n\n').trim();

  const placeTail = tail.match(/^(?:в|во|на|г)\s+(\S+)(?:\s+(\S+))?$/u);
  if (!placeTail) return full;

  const placeKey = normalizeLeadKey(place || '');
  if (placeKey) {
    const firstPlaceWord = placeKey.split(' ')[0];
    const stem = firstPlaceWord.length > 3 ? firstPlaceWord.slice(0, firstPlaceWord.length - 2) : firstPlaceWord;
    if (!placeTail[1].startsWith(stem)) return full;
    // A second tail word ("в нижнем новгороде") needs a multi-word place.
    if (placeTail[2] && !placeKey.includes(' ')) return full;
  } else if (placeTail[2]) {
    return full;
  }

  return paragraphs.slice(1).join('\n\n').trim();
}

/**
 * Provider feeds often glue several bullets into one line
 * ("…группы) Трассовая экскурсия…", "…600 руб. Полет…"). Split at a closing
 * parenthesis, a ruble price or a known fact-starter followed by a capital
 * word. The boundary itself stays with the left part.
 */
const GLUED_AFTER_BOUNDARY_RE = /(\)|руб\.(?:\/[а-яё]+)?)\s+([А-ЯЁ][а-яё-]*)/gu;
const GLUED_BEFORE_STARTER_RE =
  /([а-яё]{2,})\s+((?:Осмотр|Посещение|Прогулка|Экскурсия|Трансфер|Услуги|Вход|Проход|Обед|Ужин|Завтрак|Катание|Дегустация|Мастер-класс|Билеты|Трассовая|Подъём|Подъем|Спуск)(?![а-яё]))/gu;

/** Capitalized words that continue a bullet instead of starting a new one. */
const GLUED_KEEP_TOGETHER = new Set([
  'и', 'или', 'а', 'но', 'не', 'ни',
  'в', 'во', 'на', 'с', 'со', 'к', 'ко', 'о', 'об', 'из', 'за', 'по', 'для', 'при',
  'от', 'до', 'у', 'без', 'после', 'через', 'между', 'под', 'над', 'про',
  'включает', 'включают', 'включая', 'можно', 'посетить', 'увидеть', 'услышать',
]);

function startsNewBullet(word: string): boolean {
  return !GLUED_KEEP_TOGETHER.has(word.toLocaleLowerCase('ru-RU'));
}

export function splitGluedListItem(item: string): string[] {
  const marked = String(item || '')
    .replace(GLUED_AFTER_BOUNDARY_RE, (match, boundary: string, next: string) =>
      startsNewBullet(next) ? `${boundary}\u0001${next}` : match,
    )
    .replace(GLUED_BEFORE_STARTER_RE, (match, prev: string, starter: string) =>
      startsNewBullet(prev) ? `${prev}\u0001${starter}` : match,
    );
  return marked
    .split('\u0001')
    .map((part) => part.trim())
    .filter(Boolean);
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

/** Sections whose body is a list even when the provider omitted bullet markers. */
const FACT_LIST_HEADING_RE =
  /^(?:в стоимость|что включено|что входит|включено в стоимость|по желанию|оплачивается дополнительно|дополнительно)/iu;

function applyFactListSections(blocks: EventDescriptionBlock[]): EventDescriptionBlock[] {
  const out: EventDescriptionBlock[] = [];
  let listMode = false;

  for (const block of blocks) {
    if (block.type === 'heading') {
      out.push(block);
      listMode = FACT_LIST_HEADING_RE.test(block.text);
      continue;
    }
    if (!listMode) {
      out.push(block);
      continue;
    }
    const items = (block.type === 'list' ? block.items : [block.text]).flatMap(splitGluedListItem);
    const last = out[out.length - 1];
    if (last && last.type === 'list') last.items.push(...items);
    else out.push({ type: 'list', items: [...items] });
  }

  return out;
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
  const normalized = joinSoftWrappedLines(String(text || '').replace(/\r\n?/g, '\n'))
    .replace(/[\u2800\u00A0]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // `## 18:45 - 22:43 - …` is a schedule row, not a section heading: drop the
    // markdown marker so the row joins the surrounding time list.
    .replace(/^#{1,6}\s+(?=\d{1,2}:\d{2}\s*[-–—])/gmu, '')
    // Mid-paragraph timeline rows ("…на автобусе. 22:43 - Прибытие…") become
    // their own lines so they render as schedule items, not one wall of text.
    .replace(/([.)])\s+(?=\d{1,2}:\d{2}\s*[-–—])/gu, '$1\n')
    // `Оплачивается дополнительно` + `## При посадке гиду` is one section.
    .replace(
      /^(Оплачивается дополнительно|Дополнительно)\s*\n+(?:##\s*)?При\s+([^\n]+)$/gimu,
      '## $1 при $2',
    )
    // Inline `ВАЖНО!` starts its own bold paragraph instead of ending a wall of text.
    .replace(/(?:^|\s+)(ВАЖНО!|Важно!|ВАЖНО:)\s+/gu, '\n\n**$1** ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

    if (isScheduleLine(line)) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length) {
        const current = lines[j].trim();
        if (!current) {
          j += 1;
          continue;
        }
        if (!isScheduleLine(current)) break;
        items.push(current);
        j += 1;
      }
      if (items.length) {
        blocks.push({ type: 'list', items });
        i = j;
        continue;
      }
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
      // Only real section labels ("Место:", "Маршрут:") become headings; a long
      // phrase label ("Входной билет в горный парк Рускеала: 750 руб…") stays a
      // single line and joins the surrounding fact list.
      const labelIsSection =
        GENERIC_SECTION_LABEL_RE.test(labelValue.label) ||
        isDescriptionSectionHeading(labelValue.label);
      if (labelIsSection) {
        blocks.push({ type: 'heading', text: labelValue.label });
        blocks.push({ type: 'paragraph', text: labelValue.value });
      } else {
        blocks.push({ type: 'paragraph', text: line });
      }
      i += 1;
      continue;
    }

    const mdHeading = unwrapMarkdownHeadingLine(line);
    if (mdHeading) {
      blocks.push({ type: 'heading', text: mdHeading });
      i += 1;
      continue;
    }

    pushParagraphOrHeading(blocks, line);
    i += 1;
  }

  return expandGluedItems(applyFactListSections(blocks));
}

/** Split bullets the provider glued into one line; schedule rows keep shape. */
function expandGluedItems(blocks: EventDescriptionBlock[]): EventDescriptionBlock[] {
  return blocks.map((block) => {
    if (block.type !== 'list') return block;
    return {
      ...block,
      items: block.items.flatMap((item) =>
        isScheduleLine(item) ? [item] : splitGluedListItem(item),
      ),
    };
  });
}

function renderBlocksToHtml(blocks: EventDescriptionBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'heading') {
        return `<h3>${formatInlineEventMarkdown(block.text)}</h3>`;
      }
      if (block.type === 'list') {
        const items = block.items
          .map((item) => `<li>${formatInlineEventMarkdown(item)}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${formatInlineEventMarkdown(block.text)}</p>`;
    })
    .join('');
}

/**
 * Safe HTML for event description.
 * - Existing HTML (tags): sanitize, then structure paragraphs/lists like plain text.
 * - Plain text: paragraphs + headings + `<ul>/<li>` for detected bullets.
 * - Session date/time lines are removed: the purchase block owns the schedule.
 */
export function formatEventDescriptionHtml(raw: string): string {
  const text = stripSessionDateLines(String(raw || '')).trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    const structuredText = htmlToStructuredText(sanitizeEventHtml(text));
    return sanitizeEventHtml(renderBlocksToHtml(parseEventDescriptionBlocks(structuredText)));
  }
  return sanitizeEventHtml(renderBlocksToHtml(parseEventDescriptionBlocks(text)));
}

/**
 * Provider HTML is first allowlist-sanitized, then reduced to the same
 * paragraph/heading/list input used by plain descriptions. Rendering that text
 * through renderBlocksToHtml escapes content and prevents provider markup from
 * bypassing our layout or introducing executable HTML.
 */
function htmlToStructuredText(html: string): string {
  return decodeDescriptionEntities(
    String(html || '')
      .replace(/<br\s*\/?\s*>/giu, '\n')
      .replace(/<h([2-4])>/giu, '\n\n## ')
      .replace(/<\/h[2-4]>/giu, '\n\n')
      .replace(/<li>/giu, '\n- ')
      .replace(/<\/li>/giu, '')
      .replace(/<a\s+href="([^"]*)">([\s\S]*?)<\/a>/giu, '$2 ($1)')
      .replace(/<a>([\s\S]*?)<\/a>/giu, '$1')
      .replace(/<(?:p|div|blockquote)>/giu, '\n\n')
      .replace(/<\/(?:p|div|blockquote)>/giu, '\n\n')
      .replace(/<(?:strong|b)>/giu, '**')
      .replace(/<\/(?:strong|b)>/giu, '**')
      .replace(/<(?:em|i)>/giu, '*')
      .replace(/<\/(?:em|i)>/giu, '*')
      .replace(/<[^>]*>/gu, '')
      .replace(/[\t\v\f ]+/gu, ' ')
      .replace(/ *\n */gu, '\n')
      .replace(/\n{3,}/gu, '\n\n'),
  ).trim();
}

function decodeDescriptionEntities(value: string): string {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/giu, (full, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
    })
    .replace(/&#(\d+);/gu, (full, decimal: string) => {
      const code = Number.parseInt(decimal, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
    })
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&laquo;/giu, '«')
    .replace(/&raquo;/giu, '»')
    .replace(/&ndash;|&mdash;|&minus;/giu, '-');
}
