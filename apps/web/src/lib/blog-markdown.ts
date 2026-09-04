/**
 * Pure blog markdown helpers (no React) - links, headings, NOTE attrs, prices.
 * Used by BlogArticleContent / BlogArticleNote and unit tests.
 */

/** Attrs allow `]` inside quoted "…" (nested `[link](url)` in NOTE/CTA text=). */
export const SHORTCODE_ATTRS = String.raw`((?:[^\]"]|"[^"]*")+)`;

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'price'; value: string };

/** от 350 ₽ / 1 000 ₽ / 850 рублей / 1000 руб. - без \\b после ₽ (иначе ломается на запятой). */
export const PRICE_RE =
  /(?:от\s+)?\d+(?:[\s\u00a0]\d{3})*(?:[.,]\d+)?\s*(?:₽|рублей|рубля|рубль|руб\.?)/gi;

const INLINE_MD_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export function normalizeBlogHref(href: string | null | undefined): string {
  return String(href || '').trim();
}

export function isUsableBlogHref(href: string | null | undefined): boolean {
  return Boolean(normalizeBlogHref(href));
}

/** Strip inline markdown for heading id / plain text. */
export function stripInlineMarkdown(text: string): string {
  return String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

export function slugifyBlogHeading(text: string): string {
  const plain = stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return plain || 'section';
}

function splitTextWithPrices(value: string): InlineToken[] {
  if (!value) return [];
  const tokens: InlineToken[] = [];
  const re = new RegExp(PRICE_RE.source, PRICE_RE.flags);
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    if (match.index > last) {
      tokens.push({ type: 'text', value: value.slice(last, match.index) });
    }
    tokens.push({ type: 'price', value: match[0] });
    last = re.lastIndex;
  }
  if (last < value.length) tokens.push({ type: 'text', value: value.slice(last) });
  return tokens.length > 0 ? tokens : [{ type: 'text', value }];
}

/**
 * Tokenize one line: `[text](url)`, **bold**, *italic*, then price spans in plain text.
 * Empty / whitespace href → left as literal `[text]( )` (no fake `<a>`).
 */
export function tokenizeInlineMarkdown(text: string): InlineToken[] {
  const input = String(text || '');
  if (!input) return [];

  const tokens: InlineToken[] = [];
  const re = new RegExp(INLINE_MD_RE.source, INLINE_MD_RE.flags);
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      tokens.push(...splitTextWithPrices(input.slice(last, match.index)));
    }

    if (match[1] != null && match[2] != null) {
      const href = normalizeBlogHref(match[2]);
      if (href) {
        tokens.push({ type: 'link', text: match[1], href });
      } else {
        tokens.push(...splitTextWithPrices(match[0]));
      }
    } else if (match[3] != null) {
      tokens.push({ type: 'strong', value: match[3] });
    } else if (match[4] != null) {
      tokens.push({ type: 'em', value: match[4] });
    }

    last = re.lastIndex;
  }

  if (last < input.length) {
    tokens.push(...splitTextWithPrices(input.slice(last)));
  }

  return tokens;
}

export type ParsedHeadingLine =
  | { level: 1 | 2 | 3; text: string }
  | null;

/** `## Title` / `### Title` / `# Title` (body H1 demoted to visual H2 in renderer if needed). */
export function parseHeadingLine(line: string): ParsedHeadingLine {
  const trimmed = line.trim();
  if (trimmed.startsWith('### ')) {
    return { level: 3, text: trimmed.replace(/^###\s+/, '') };
  }
  if (trimmed.startsWith('## ')) {
    return { level: 2, text: trimmed.replace(/^##\s+/, '') };
  }
  if (trimmed.startsWith('# ')) {
    return { level: 1, text: trimmed.replace(/^#\s+/, '') };
  }
  return null;
}

export type ParsedNote = {
  label: string;
  text: string;
};

const NOTE_REGEX = new RegExp(String.raw`^\[NOTE\s+${SHORTCODE_ATTRS}\]$`, 'i');
const NOTE_BARE_REGEX = new RegExp(String.raw`^NOTE\s+${SHORTCODE_ATTRS}$`, 'i');

function parseNoteAttrs(attrsRaw: string): ParsedNote | null {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }

  const text = String(attrs.text || '').trim();
  if (!text) return null;

  return {
    label: String(attrs.label || 'Важно').trim() || 'Важно',
    text,
  };
}

/**
 * Mid-article callout. Nested `[link](url)` inside text="…" must not truncate attrs.
 */
export function parseNoteBlock(block: string): ParsedNote | null {
  const trimmed = block.trim();
  const match = trimmed.match(NOTE_REGEX) || trimmed.match(NOTE_BARE_REGEX);
  if (!match?.[1]) return null;
  return parseNoteAttrs(match[1]);
}

/** Lightweight hierarchy smoke for guides (no CTA/buy/image deps). */
export function parseGuideStructure(content: string): Array<
  | { type: 'h2' | 'h3' | 'paragraph' | 'note'; text?: string; note?: ParsedNote }
> {
  const lines = String(content || '').split('\n');
  const blocks: Array<
    | { type: 'h2' | 'h3' | 'paragraph' | 'note'; text?: string; note?: ParsedNote }
  > = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join('\n').trim();
    paragraphBuffer = [];
    if (text) blocks.push({ type: 'paragraph', text });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const note = parseNoteBlock(line);
    if (note) {
      flushParagraph();
      blocks.push({ type: 'note', note });
      continue;
    }
    const heading = parseHeadingLine(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: heading.level === 3 ? 'h3' : 'h2',
        text: heading.text,
      });
      continue;
    }
    paragraphBuffer.push(rawLine);
  }
  flushParagraph();
  return blocks;
}
