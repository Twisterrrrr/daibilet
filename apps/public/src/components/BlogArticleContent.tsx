import * as React from 'react';

import { BlogArticleCta, parseCtaBlock } from '@/components/BlogArticleCta';
import { handleBlogLinkClick } from '@/lib/blog-navigate';

const IMAGE_BLOCK_REGEX = /^\[image\s+side=(left|right)\s+src="([^"]+)"(?:\s+alt="([^"]*)")?\]$/i;

export type ParsedImageBlock = {
  side: 'left' | 'right';
  src: string;
  alt: string;
};

export function parseImageBlock(block: string): ParsedImageBlock | null {
  const match = block.trim().match(IMAGE_BLOCK_REGEX);
  if (!match) return null;
  return {
    side: match[1].toLowerCase() as 'left' | 'right',
    src: match[2],
    alt: match[3] || '',
  };
}

type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; lines: string[] }
  | { type: 'image'; image: ParsedImageBlock }
  | { type: 'cta'; data: ReturnType<typeof parseCtaBlock> & object };

function renderInline(text: string, keyPrefix = ''): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      const linkHref = match[2];
      nodes.push(
        <a
          key={`${keyPrefix}lnk-${key++}`}
          href={linkHref}
          onClick={(event) => handleBlogLinkClick(event, linkHref)}
          className="font-medium text-primary-600 underline decoration-primary/30 underline-offset-[3px] transition hover:text-primary-700 hover:decoration-primary/60"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      nodes.push(
        <strong key={`${keyPrefix}strong-${key++}`} className="font-semibold text-slate-900">
          {match[3]}
        </strong>,
      );
    }
    last = regex.lastIndex;
  }

  if (last < text.length) nodes.push(text.slice(last));
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

function isStandaloneBoldHeading(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes('[');
}

function isOrderedListLine(line: string): boolean {
  return /^\d+\.\s/.test(line.trim());
}

function isUnorderedListLine(line: string): boolean {
  return line.trim().startsWith('- ');
}

function isSpecialLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (parseCtaBlock(trimmed)) return true;
  if (parseImageBlock(trimmed)) return true;
  if (isTableLine(trimmed)) return true;
  if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) return true;
  if (isStandaloneBoldHeading(trimmed)) return true;
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

    const image = parseImageBlock(line);
    if (image) {
      flushParagraph();
      blocks.push({ type: 'image', image });
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      index += 1;
      continue;
    }

    if (isStandaloneBoldHeading(line)) {
      flushParagraph();
      blocks.push({ type: 'h2', text: line.replace(/^\*\*|\*\*$/g, '') });
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
      <table className="w-full min-w-[28rem] border-collapse text-sm">
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

function BlogFigure({
  image,
  className = 'w-full max-w-md',
}: {
  image: ParsedImageBlock;
  className?: string;
}) {
  return (
    <figure className={className}>
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        className="aspect-[4/3] w-full rounded-xl border border-slate-200/80 object-cover shadow-md"
      />
      {image.alt ? (
        <figcaption className="mt-2.5 text-center text-xs leading-snug text-slate-500 sm:text-sm">
          {image.alt}
        </figcaption>
      ) : null}
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
      <BlogFigure image={image} className={`mb-4 w-full max-w-md ${floatClass}`} />
      <div className="min-w-0">{children}</div>
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
          : paragraphIndex === 0
            ? PARAGRAPH_CLASS
            : `${PARAGRAPH_CLASS} mt-4`
      }
    >
      {renderInline(text, `${keyPrefix}-${paragraphIndex}-`)}
    </p>
  ));
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
  const contentNode = <div className="min-w-0 flex-1">{children}</div>;

  return (
    <div className="my-8 flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:flex-row sm:items-start sm:gap-8 sm:p-6">
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

const PARAGRAPH_CLASS =
  'text-[1.0625rem] leading-[1.8] text-slate-700 [overflow-wrap:anywhere] [&+&]:mt-4';
const LEAD_PARAGRAPH_CLASS =
  'text-lg leading-[1.75] text-slate-600 [overflow-wrap:anywhere]';

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
      isLeadParagraph = false;
      continue;
    }

    // Абзацы перед картинкой рендерим отдельно: иначе float ставит img первым в DOM
    // (mobile: hero → inline подряд). Картинка подхватывается веткой `image` ниже.

    if (block.type === 'image') {
      const { paragraphs, endIndex } = collectParagraphBlocks(blocks, index + 1);
      if (paragraphs.length > 0) {
        nodes.push(
          <BlogFloatedSection key={`img-p-${index}`} image={block.image}>
            {renderParagraphNodes(paragraphs, `img-p-${index}`, isLeadParagraph)}
          </BlogFloatedSection>,
        );
        index = endIndex;
        isLeadParagraph = false;
        continue;
      }
    }

    switch (block.type) {
      case 'cta':
        nodes.push(<BlogArticleCta key={`cta-${index}`} {...block.data} />);
        isLeadParagraph = false;
        break;
      case 'image':
        nodes.push(
          <div key={`img-${index}`} className="my-8">
            <BlogFigure image={block.image} className="mx-auto w-full max-w-2xl" />
          </div>,
        );
        isLeadParagraph = false;
        break;
      case 'h2':
        nodes.push(
          <h2
            key={`h2-${index}`}
            className="scroll-mt-24 mb-4 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem] lg:text-3xl [&:not(:first-child)]:mt-12 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-slate-200/80 [&:not(:first-child)]:pt-10"
          >
            {block.text}
          </h2>,
        );
        isLeadParagraph = false;
        break;
      case 'h3':
        nodes.push(
          <h3
            key={`h3-${index}`}
            className="scroll-mt-24 mb-4 border-l-4 border-primary-500 pl-4 font-display text-xl font-bold tracking-tight text-slate-950 sm:pl-5 sm:text-2xl [&:not(:first-child)]:mt-10"
          >
            {block.text}
          </h3>,
        );
        isLeadParagraph = false;
        break;
      case 'ol':
        nodes.push(
          <ol
            key={`ol-${index}`}
            className="my-5 list-decimal space-y-2.5 pl-6 text-[1.0625rem] leading-relaxed text-slate-700 marker:font-semibold marker:text-primary-600"
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1">
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
            className="my-5 list-disc space-y-2.5 pl-6 text-[1.0625rem] leading-relaxed text-slate-700 marker:text-primary-500"
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1">
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
          <p key={`p-${index}`} className={isLeadParagraph ? `${LEAD_PARAGRAPH_CLASS} mb-1` : `${PARAGRAPH_CLASS} mt-4`}>
            {renderInline(block.text, `p-${index}-`)}
          </p>,
        );
        isLeadParagraph = false;
        break;
      default:
        break;
    }
  }

  return <div className="blog-article-prose">{nodes}</div>;
}
