import * as React from 'react';

import { handleBlogLinkClick } from '@/lib/blog-navigate';

export type ParsedNote = {
  label: string;
  text: string;
};

/**
 * Внутри text= часто есть markdown-ссылки `[анкор](url)` - нельзя резать по первому `]`.
 * `(?:[^\]"]|"[^"]*")+` допускает `]` только внутри кавычек атрибутов.
 */
const NOTE_ATTRS = String.raw`((?:[^\]"]|"[^"]*")+)`;
const NOTE_REGEX = new RegExp(String.raw`^\[NOTE\s+${NOTE_ATTRS}\]$`, 'i');
const NOTE_BARE_REGEX = new RegExp(String.raw`^NOTE\s+${NOTE_ATTRS}$`, 'i');

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

export function parseNoteBlock(block: string): ParsedNote | null {
  const trimmed = block.trim();
  const match = trimmed.match(NOTE_REGEX) || trimmed.match(NOTE_BARE_REGEX);
  if (!match?.[1]) return null;
  return parseNoteAttrs(match[1]);
}

/** Inline markdown: links, **bold**, *italic* (как в теле статьи). */
function renderNoteInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      const href = match[2];
      nodes.push(
        <a
          key={`note-lnk-${key++}`}
          href={href}
          onClick={(event) => handleBlogLinkClick(event, href)}
          className="font-semibold text-amber-950 underline decoration-amber-700/40 underline-offset-[3px] transition hover:text-amber-900 hover:decoration-amber-800/70"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      nodes.push(
        <strong key={`note-strong-${key++}`} className="font-semibold text-amber-950">
          {match[3]}
        </strong>,
      );
    } else if (match[4]) {
      nodes.push(
        <em key={`note-em-${key++}`} className="italic">
          {match[4]}
        </em>,
      );
    }
    last = regex.lastIndex;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type BlogArticleNoteProps = ParsedNote;

/**
 * Magazine inset «Важно» для путеводителей.
 * Markdown: [NOTE label="Важно" text="… [Ссылка](https://daibilet.ru/…)."]
 */
export function BlogArticleNote({ label, text }: BlogArticleNoteProps) {
  return (
    <aside
      className="my-10 border-l-[3px] border-amber-500 bg-amber-50/70 py-4 pl-4 pr-3 sm:my-12 sm:pl-5 sm:pr-4"
      role="note"
    >
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-amber-900/75">{label}</p>
      <p className="mt-1.5 text-base leading-[1.55] text-amber-950/95 sm:text-[1.05rem] sm:leading-[1.55]">
        {renderNoteInline(text)}
      </p>
    </aside>
  );
}
