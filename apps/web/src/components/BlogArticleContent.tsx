'use client';

import * as React from 'react';

import { BlogArticleCta, parseCtaBlock } from '@/components/BlogArticleCta';
import { BlogArticleNote, parseNoteBlock } from '@/components/BlogArticleNote';
import { BlogBuyButton, parseBuyBlock } from '@/components/BlogBuyButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import {
  SHORTCODE_ATTRS,
  isUsableBlogHref,
  parseHeadingLine,
  slugifyBlogHeading,
  tokenizeInlineMarkdown,
  type InlineToken,
} from '@/lib/blog-markdown';
import { handleBlogLinkClick } from '@/lib/blog-navigate';

const IMAGE_BLOCK_REGEX = /^\[image\s+side=(left|right)\s+src="([^"]+)"(?:\s+alt="([^"]*)")?\]$/i;
const MD_IMAGE_LINE_REGEX = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const QUOTE_REGEX = new RegExp(String.raw`^\[QUOTE\s+${SHORTCODE_ATTRS}\]$`, 'i');

const BODY_LINK_CLASS =
  'font-semibold text-primary-700 underline decoration-primary/40 underline-offset-[3px] transition hover:text-primary-800 hover:decoration-primary/70';
const PRICE_CLASS =
  'whitespace-nowrap rounded-sm bg-primary/8 px-1 py-0.5 font-semibold tabular-nums text-primary-800';

export type ParsedQuote = { text: string; cite?: string };

export function parseQuoteBlock(block: string): ParsedQuote | null {
  const trimmed = block.trim();
  const match = trimmed.match(QUOTE_REGEX);
  if (!match?.[1]) return null;
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(match[1])) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }
  const text = String(attrs.text || '').trim();
  if (!text) return null;
  const cite = String(attrs.cite || '').trim();
  return cite ? { text, cite } : { text };
}

export type ParsedImageBlock = {
  side: 'left' | 'right';
  src: string;
  alt: string;
};

export function parseImageBlock(block: string): ParsedImageBlock | null {
  const trimmed = block.trim();
  const match = trimmed.match(IMAGE_BLOCK_REGEX);
  if (match) {
    return {
      side: match[1].toLowerCase() as 'left' | 'right',
      src: match[2],
      alt: match[3] || '',
    };
  }
  const md = trimmed.match(MD_IMAGE_LINE_REGEX);
  if (md) {
    return {
      side: 'left',
      src: md[2],
      alt: md[1] || '',
    };
  }
  return null;
}

type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'tagline'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; lines: string[] }
  | { type: 'image'; image: ParsedImageBlock }
  | { type: 'quote'; data: ParsedQuote }
  | { type: 'callout'; label: string; text: string }
  | { type: 'hr' }
  | { type: 'cta'; data: ReturnType<typeof parseCtaBlock> & object }
  | { type: 'buy'; data: NonNullable<ReturnType<typeof parseBuyBlock>> }
  | { type: 'note'; data: NonNullable<ReturnType<typeof parseNoteBlock>> };

const CALLOUT_LABEL_RE =
  /^\*\*(Атмосферная деталь|Практический совет|Лайфхак|Адрес):\*\*\s*(.+)$/s;

export function parseCalloutText(text: string): { label: string; body: string } | null {
  const match = String(text || '').trim().match(CALLOUT_LABEL_RE);
  if (!match?.[1] || !match[2]) return null;
  return { label: match[1], body: match[2].trim() };
}

function renderInlineToken(token: InlineToken, key: string): React.ReactNode {
  switch (token.type) {
    case 'link':
      if (!isUsableBlogHref(token.href)) return token.text;
      return (
        <a
          key={key}
          href={token.href}
          onClick={(event) => handleBlogLinkClick(event, token.href)}
          className={BODY_LINK_CLASS}
        >
          {token.text}
        </a>
      );
    case 'strong':
      return (
        <strong key={key} className="font-bold text-slate-900">
          {token.value}
        </strong>
      );
    case 'em':
      return (
        <em key={key} className="italic text-slate-700">
          {token.value}
        </em>
      );
    case 'price':
      return (
        <span key={key} className={PRICE_CLASS}>
          {token.value}
        </span>
      );
    default:
      return token.value;
  }
}

/** Inline markdown на одной строке (без \\n). */
function renderInlineLine(text: string, keyPrefix = ''): React.ReactNode[] {
  return tokenizeInlineMarkdown(text).map((token, index) =>
    renderInlineToken(token, `${keyPrefix}t${index}`),
  );
}

/**
 * Как в админском textarea: одиночный Enter → перенос (<br>),
 * пустая строка (\\n\\n) → новый абзац (см. parseContentBlocks).
 */
function renderInline(text: string, keyPrefix = ''): React.ReactNode[] {
  const lines = String(text || '').split('\n');
  if (lines.length <= 1) return renderInlineLine(text, keyPrefix);

  const nodes: React.ReactNode[] = [];
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      nodes.push(<br key={`${keyPrefix}br-${lineIndex}`} />);
    }
    nodes.push(...renderInlineLine(line, `${keyPrefix}l${lineIndex}-`));
  });
  return nodes;
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/i.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function isStandaloneBoldTagline(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes('[');
}

function isHrLine(line: string): boolean {
  return /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

function isOrderedListLine(line: string): boolean {
  return /^\d+\.\s/.test(line.trim());
}

function isUnorderedListLine(line: string): boolean {
  return line.trim().startsWith('- ');
}

function isBlockquoteLine(line: string): boolean {
  return line.trim().startsWith('>');
}

function isSpecialLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (parseCtaBlock(trimmed)) return true;
  if (parseNoteBlock(trimmed)) return true;
  if (parseQuoteBlock(trimmed)) return true;
  if (parseBuyBlock(trimmed)) return true;
  if (parseImageBlock(trimmed)) return true;
  if (isTableLine(trimmed)) return true;
  if (isBlockquoteLine(trimmed)) return true;
  if (trimmed.startsWith('## ') || trimmed.startsWith('### ') || trimmed.startsWith('# ')) return true;
  if (isStandaloneBoldTagline(trimmed)) return true;
  if (isHrLine(trimmed)) return true;
  if (isOrderedListLine(trimmed) || isUnorderedListLine(trimmed)) return true;
  return false;
}

/** Построчный разбор: таблицы не рвутся на \\n\\n, картинка после таблицы — отдельный блок. */
export function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.split('\n');
  const blocks: ContentBlock[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join('\n').trim();
    paragraphBuffer = [];
    if (text) blocks.push({ type: 'paragraph', text });
  };

  let index = 0;
  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    const cta = parseCtaBlock(line);
    if (cta) {
      flushParagraph();
      blocks.push({ type: 'cta', data: cta });
      index += 1;
      continue;
    }

    const note = parseNoteBlock(line);
    if (note) {
      flushParagraph();
      blocks.push({ type: 'note', data: note });
      index += 1;
      continue;
    }

    const quoteShort = parseQuoteBlock(line);
    if (quoteShort) {
      flushParagraph();
      blocks.push({ type: 'quote', data: quoteShort });
      index += 1;
      continue;
    }

    const plainCallout = parseCalloutText(line);
    if (plainCallout) {
      flushParagraph();
      blocks.push({ type: 'callout', label: plainCallout.label, text: plainCallout.body });
      index += 1;
      continue;
    }

    if (isBlockquoteLine(line)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index].trim();
        if (!isBlockquoteLine(quoteLine)) break;
        quoteLines.push(quoteLine.replace(/^>\s?/, ''));
        index += 1;
      }
      const text = quoteLines.join('\n').trim();
      const callout = parseCalloutText(text);
      if (callout) {
        blocks.push({ type: 'callout', label: callout.label, text: callout.body });
      } else if (text) {
        blocks.push({ type: 'paragraph', text });
      }
      continue;
    }

    if (isHrLine(line)) {
      flushParagraph();
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const buy = parseBuyBlock(line);
    if (buy) {
      flushParagraph();
      blocks.push({ type: 'buy', data: buy });
      index += 1;
      continue;
    }

    const image = parseImageBlock(line);
    if (image) {
      flushParagraph();
      blocks.push({ type: 'image', image });
      index += 1;
      continue;
    }

    const heading = parseHeadingLine(line);
    if (heading) {
      flushParagraph();
      // В теле статьи один H1 уже в hero - `#` / `##` → h2, `###` → h3.
      if (heading.level === 3) {
        blocks.push({ type: 'h3', text: heading.text });
      } else {
        blocks.push({ type: 'h2', text: heading.text });
      }
      index += 1;
      continue;
    }

    if (isStandaloneBoldTagline(line)) {
      flushParagraph();
      blocks.push({ type: 'tagline', text: line.replace(/^\*\*|\*\*$/g, '') });
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      flushParagraph();
      const tableLines: string[] = [];
      while (index < lines.length) {
        const tableLine = lines[index].trim();
        if (!tableLine) break;
        if (!isTableLine(tableLine)) break;
        tableLines.push(tableLine);
        index += 1;
      }
      if (tableLines.length > 0) blocks.push({ type: 'table', lines: tableLines });
      continue;
    }

    if (isOrderedListLine(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        if (!listLine) break;
        if (!isOrderedListLine(listLine)) break;
        items.push(listLine.replace(/^\d+\.\s*/, ''));
        index += 1;
      }
      if (items.length > 0) blocks.push({ type: 'ol', items });
      continue;
    }

    if (isUnorderedListLine(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        if (!listLine) break;
        if (!isUnorderedListLine(listLine)) break;
        items.push(listLine.replace(/^- /, ''));
        index += 1;
      }
      if (items.length > 0) blocks.push({ type: 'ul', items });
      continue;
    }

    if (isSpecialLine(line)) {
      flushParagraph();
      index += 1;
      continue;
    }

    paragraphBuffer.push(rawLine);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

function BlogTable({ rows, className = '' }: { rows: string[][]; className?: string }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm ${className}`}>
      <table className="w-full min-w-[28rem] border-collapse text-base">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100/90">
            {header.map((cell, cellIndex) => (
              <th
                key={cellIndex}
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600"
              >
                {renderInline(cell, `th-${cellIndex}-`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-700">
          {body.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-slate-100 last:border-b-0 even:bg-slate-50/70"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top leading-relaxed">
                  {cellIndex === 0 ? (
                    <span className="font-medium text-slate-900">{renderInline(cell, `td-${rowIndex}-${cellIndex}-`)}</span>
                  ) : (
                    renderInline(cell, `td-${rowIndex}-${cellIndex}-`)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isTodoPhotoSrc(src: string): boolean {
  const value = String(src || '').trim().toLowerCase();
  return value === 'todo-photo' || value.startsWith('todo-photo');
}

function BlogFigure({
  image,
  className = 'w-full max-w-md',
}: {
  image: ParsedImageBlock;
  className?: string;
}) {
  if (isTodoPhotoSrc(image.src)) {
    return (
      <figure className={className}>
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
          <p className="text-sm leading-6 text-slate-500">
            <span className="font-semibold text-slate-700">Фото TODO</span>
            {image.alt ? (
              <>
                <br />
                {image.alt}
              </>
            ) : null}
          </p>
        </div>
      </figure>
    );
  }

  return (
    <figure className={className}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-md">
        <SafeImage
          src={image.src}
          alt={image.alt}
          title={image.alt || undefined}
          fill
          sizes={IMAGE_SIZES.blogInline}
          className="object-cover"
        />
      </div>
    </figure>
  );
}

function BlogFloatedSection({
  image,
  children,
}: {
  image: ParsedImageBlock;
  children: React.ReactNode;
}) {
  const floatClass =
    image.side === 'left'
      ? 'sm:float-left sm:mr-6 sm:mb-4'
      : 'sm:float-right sm:ml-6 sm:mb-4';

  return (
    <div className="my-8 clearfix">
      {/* ~md, не magazine-thumb 14.5rem: иначе inline «пропадает» рядом с hero */}
      <BlogFigure image={image} className={`mb-4 w-full max-w-md sm:max-w-[20rem] md:max-w-md ${floatClass}`} />
      <div className="min-w-0 [&>p+p]:mt-[1.275em]">{children}</div>
    </div>
  );
}

function collectParagraphBlocks(blocks: ContentBlock[], startIndex: number): { paragraphs: string[]; endIndex: number } {
  const paragraphs: string[] = [];
  let index = startIndex;

  while (index < blocks.length && blocks[index].type === 'paragraph') {
    paragraphs.push((blocks[index] as Extract<ContentBlock, { type: 'paragraph' }>).text);
    index += 1;
  }

  return { paragraphs, endIndex: index - 1 };
}

function renderParagraphNodes(
  paragraphs: string[],
  keyPrefix: string,
  isLead: boolean,
): React.ReactNode[] {
  return paragraphs.map((text, paragraphIndex) => (
    <p
      key={`${keyPrefix}-p-${paragraphIndex}`}
      className={
        paragraphIndex === 0 && isLead
          ? LEAD_PARAGRAPH_CLASS
          : PARAGRAPH_CLASS
      }
    >
      {renderInline(text, `${keyPrefix}-${paragraphIndex}-`)}
    </p>
  ));
}

function BlogPullQuote({ text, cite }: ParsedQuote) {
  return (
    <blockquote className="my-8 border-l-2 border-slate-300 pl-4 sm:my-10">
      <p className={BODY_TEXT_CLASS}>
        {renderInline(text, 'quote-')}
      </p>
      {cite ? <cite className={`mt-2 block not-italic text-slate-500 ${BODY_TEXT_CLASS}`}>- {cite}</cite> : null}
    </blockquote>
  );
}

/** Left-rail tips only. «Адрес» = plain body line (owner longread canon). */
const TIP_CALLOUT_LABELS = new Set(['Атмосферная деталь', 'Практический совет', 'Лайфхак']);

function BlogCallout({ label, text }: { label: string; text: string }) {
  const isTip = TIP_CALLOUT_LABELS.has(label);
  return (
    <p
      className={
        isTip
          ? `${BODY_TEXT_CLASS} my-4 border-l-2 border-slate-300 py-0.5 pl-4`
          : `${BODY_TEXT_CLASS} my-2`
      }
    >
      <strong className="font-bold text-slate-900">{label}:</strong>{' '}
      {renderInline(text, `callout-${label}-`)}
    </p>
  );
}

function BlogFlexRow({
  image,
  children,
  imageSide,
}: {
  image: ParsedImageBlock;
  children: React.ReactNode;
  imageSide: 'left' | 'right';
}) {
  const imageNode = <BlogFigure image={image} className="w-full shrink-0 sm:w-[42%] md:w-72 lg:w-80" />;
  const contentNode = <div className="min-w-0 flex-1 [&>p+p]:mt-[1.275em]">{children}</div>;

  return (
    <div className="my-8 flex flex-col gap-6 border border-slate-200/70 bg-slate-50/40 p-4 sm:flex-row sm:items-start sm:gap-8 sm:p-5">
      {imageSide === 'left' ? (
        <>
          {imageNode}
          {contentNode}
        </>
      ) : (
        <>
          {contentNode}
          {imageNode}
        </>
      )}
    </div>
  );
}

function tableRowsFromBlock(block: Extract<ContentBlock, { type: 'table' }>): string[][] {
  return block.lines.filter((line) => !isTableSeparator(line)).map(parseTableRow);
}

/**
 * Owner longread canon (Top-100): one body size/weight for prose, catchphrase,
 * tip callouts and address. Bold only on labels / catchphrase / headings.
 * Do not invent smaller taglines or giant pull-quotes for labeled tips.
 */
const BODY_TEXT_CLASS =
  'text-base font-normal leading-[1.65] text-pretty text-slate-800 [overflow-wrap:break-word] sm:text-[1.0625rem] sm:leading-[1.65]';
const PARAGRAPH_CLASS = BODY_TEXT_CLASS;
const LEAD_PARAGRAPH_CLASS = BODY_TEXT_CLASS;
/** Same metrics as body; bold only (do not mix font-normal + font-bold in one className). */
const TAGLINE_CLASS =
  'mb-3 text-base font-bold leading-[1.65] text-pretty text-slate-900 [overflow-wrap:break-word] sm:text-[1.0625rem] sm:leading-[1.65]';
const H2_CLASS =
  'scroll-mt-24 mb-5 text-[1.35rem] font-bold leading-snug tracking-tight text-slate-950 sm:text-[1.5rem] [&:not(:first-child)]:mt-12';
const H3_CLASS =
  'scroll-mt-24 mb-2 text-[1.125rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-[1.25rem] [&:not(:first-child)]:mt-10';
const HR_CLASS = 'my-8 border-0 border-t border-slate-200/90';
const LIST_CLASS = `my-5 space-y-2.5 pl-6 ${BODY_TEXT_CLASS}`;

function normalizeImageSrc(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed, 'http://local').pathname;
  } catch {
    return trimmed.split('?')[0] || trimmed;
  }
}

/** Не дублируем обложку hero и повтор одной картинки внутри статьи. */
export function filterDuplicateImageBlocks(
  blocks: ContentBlock[],
  coverImageUrl?: string | null,
): ContentBlock[] {
  const seen = new Set<string>();
  const coverPath = coverImageUrl ? normalizeImageSrc(coverImageUrl) : null;

  return blocks.filter((block) => {
    if (block.type !== 'image') return true;
    const src = normalizeImageSrc(block.image.src);
    if (!src) return false;
    if (coverPath && src === coverPath) return false;
    if (seen.has(src)) return false;
    seen.add(src);
    return true;
  });
}

/**
 * Первый inline `[image]` слишком близко к hero даёт две картинки подряд (особенно на mobile).
 * Переносим его после N текстовых абзацев; filterDuplicateImageBlocks не трогаем.
 */
export function deferLeadingImageBlock(
  blocks: ContentBlock[],
  minParagraphsBefore = 2,
): ContentBlock[] {
  const imageIndex = blocks.findIndex((block) => block.type === 'image');
  if (imageIndex < 0) return blocks;

  let paragraphsBefore = 0;
  for (let i = 0; i < imageIndex; i += 1) {
    if (blocks[i].type === 'paragraph') paragraphsBefore += 1;
  }
  if (paragraphsBefore >= minParagraphsBefore) return blocks;

  const imageBlock = blocks[imageIndex];
  const withoutImage = [...blocks.slice(0, imageIndex), ...blocks.slice(imageIndex + 1)];

  let seen = 0;
  let insertAt = withoutImage.length;
  for (let i = 0; i < withoutImage.length; i += 1) {
    if (withoutImage[i].type !== 'paragraph') continue;
    seen += 1;
    if (seen >= minParagraphsBefore) {
      insertAt = i + 1;
      break;
    }
  }

  return [...withoutImage.slice(0, insertAt), imageBlock, ...withoutImage.slice(insertAt)];
}

export function renderBlogArticleContent(content: string, coverImageUrl?: string | null) {
  const blocks = deferLeadingImageBlock(
    filterDuplicateImageBlocks(parseContentBlocks(content), coverImageUrl),
  );
  const nodes: React.ReactNode[] = [];
  let isLeadParagraph = true;
  let bodyImagesRendered = 0;
  const totalImageBlocks = blocks.filter((b) => b.type === 'image').length;
  // Dense longreads (≥3 inline): float all. Short articles: first stays full-width break.
  const denseInlineGallery = totalImageBlocks >= 3;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const next = blocks[index + 1];

    if (block.type === 'table' && next?.type === 'image') {
      nodes.push(
        <BlogFlexRow key={`table-img-${index}`} image={next.image} imageSide={next.image.side}>
          <BlogTable rows={tableRowsFromBlock(block)} />
        </BlogFlexRow>,
      );
      index += 1;
      bodyImagesRendered += 1;
      isLeadParagraph = false;
      continue;
    }

    if (block.type === 'image' && next?.type === 'table') {
      nodes.push(
        <BlogFlexRow key={`img-table-${index}`} image={block.image} imageSide={block.image.side}>
          <BlogTable rows={tableRowsFromBlock(next)} />
        </BlogFlexRow>,
      );
      index += 1;
      bodyImagesRendered += 1;
      isLeadParagraph = false;
      continue;
    }

    // Абзацы перед картинкой рендерим отдельно: иначе float ставит img первым в DOM
    // (mobile: hero → inline подряд). Картинка подхватывается веткой `image` ниже.

    if (block.type === 'image') {
      const { paragraphs, endIndex } = collectParagraphBlocks(blocks, index + 1);
      // Первое inline - полноширинный break (удержание внимания); дальше можно float.
      // Dense (≥3): все float, включая первое - иначе Top-100 с 15 фото ломает макет.
      const preferStandalone = bodyImagesRendered === 0 && !denseInlineGallery;
      if (paragraphs.length > 0 && !preferStandalone) {
        nodes.push(
          <BlogFloatedSection key={`img-p-${index}`} image={block.image}>
            {renderParagraphNodes(paragraphs, `img-p-${index}`, isLeadParagraph)}
          </BlogFloatedSection>,
        );
        index = endIndex;
        bodyImagesRendered += 1;
        isLeadParagraph = false;
        continue;
      }
      if (preferStandalone && paragraphs.length > 0) {
        nodes.push(
          <div key={`img-${index}`} className="my-10">
            <BlogFigure image={block.image} className="mx-auto w-full max-w-2xl" />
          </div>,
        );
        nodes.push(...renderParagraphNodes(paragraphs, `img-p-${index}`, isLeadParagraph));
        index = endIndex;
        bodyImagesRendered += 1;
        isLeadParagraph = false;
        continue;
      }
    }

    switch (block.type) {
      case 'cta':
        nodes.push(<BlogArticleCta key={`cta-${index}`} {...block.data} />);
        isLeadParagraph = false;
        break;
      case 'note':
        nodes.push(<BlogArticleNote key={`note-${index}`} {...block.data} />);
        isLeadParagraph = false;
        break;
      case 'quote':
        nodes.push(<BlogPullQuote key={`quote-${index}`} {...block.data} />);
        isLeadParagraph = false;
        break;
      case 'callout':
        nodes.push(<BlogCallout key={`callout-${index}`} label={block.label} text={block.text} />);
        isLeadParagraph = false;
        break;
      case 'hr':
        nodes.push(<hr key={`hr-${index}`} className={HR_CLASS} />);
        isLeadParagraph = false;
        break;
      case 'tagline':
        nodes.push(
          <p key={`tagline-${index}`} className={TAGLINE_CLASS}>
            {renderInline(block.text, `tagline-${index}-`)}
          </p>,
        );
        isLeadParagraph = false;
        break;
      case 'buy':
        nodes.push(<BlogBuyButton key={`buy-${index}`} {...block.data} />);
        isLeadParagraph = false;
        break;
      case 'image':
        nodes.push(
          <div key={`img-${index}`} className="my-10">
            <BlogFigure image={block.image} className="mx-auto w-full max-w-2xl" />
          </div>,
        );
        bodyImagesRendered += 1;
        isLeadParagraph = false;
        break;
      case 'h2':
        nodes.push(
          <h2
            key={`h2-${index}`}
            id={slugifyBlogHeading(block.text)}
            className={H2_CLASS}
          >
            {renderInline(block.text, `h2-${index}-`)}
          </h2>,
        );
        isLeadParagraph = false;
        break;
      case 'h3':
        nodes.push(
          <h3
            key={`h3-${index}`}
            id={slugifyBlogHeading(block.text)}
            className={H3_CLASS}
          >
            {renderInline(block.text, `h3-${index}-`)}
          </h3>,
        );
        isLeadParagraph = false;
        break;
      case 'ol':
        nodes.push(
          <ol
            key={`ol-${index}`}
            className={`${LIST_CLASS} list-decimal marker:font-semibold marker:text-primary-600`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1.5">
                {renderInline(item, `ol-${index}-${itemIndex}-`)}
              </li>
            ))}
          </ol>,
        );
        isLeadParagraph = false;
        break;
      case 'ul':
        nodes.push(
          <ul
            key={`ul-${index}`}
            className={`${LIST_CLASS} list-disc marker:text-primary-500`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1.5">
                {renderInline(item, `ul-${index}-${itemIndex}-`)}
              </li>
            ))}
          </ul>,
        );
        isLeadParagraph = false;
        break;
      case 'table':
        nodes.push(
          <div key={`table-${index}`} className="my-6">
            <BlogTable rows={tableRowsFromBlock(block)} />
          </div>,
        );
        isLeadParagraph = false;
        break;
      case 'paragraph':
        nodes.push(
          <p
            key={`p-${index}`}
            className={isLeadParagraph ? LEAD_PARAGRAPH_CLASS : PARAGRAPH_CLASS}
          >
            {renderInline(block.text, `p-${index}-`)}
          </p>,
        );
        isLeadParagraph = false;
        break;
      default:
        break;
    }
  }

  return <div className="blog-article-prose [&>p+p]:mt-[1.275em]">{nodes}</div>;
}

export function BlogArticleContent({
  content,
  coverImageUrl,
}: {
  content: string;
  coverImageUrl?: string | null;
}) {
  return renderBlogArticleContent(content, coverImageUrl);
}
