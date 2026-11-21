import * as React from 'react';

import { handleBlogLinkClick } from '@/lib/blog-navigate';
import {
  isUsableBlogHref,
  parseNoteBlock,
  tokenizeInlineMarkdown,
  type InlineToken,
  type ParsedNote,
} from '@/lib/blog-markdown';

export type { ParsedNote };
export { parseNoteBlock };

const NOTE_LINK_CLASS =
  'font-semibold text-amber-950 underline decoration-amber-700/45 underline-offset-[3px] transition hover:text-amber-900 hover:decoration-amber-800/80';

function renderNoteToken(token: InlineToken, key: string): React.ReactNode {
  switch (token.type) {
    case 'link':
      if (!isUsableBlogHref(token.href)) return token.text;
      return (
        <a
          key={key}
          href={token.href}
          onClick={(event) => handleBlogLinkClick(event, token.href)}
          className={NOTE_LINK_CLASS}
        >
          {token.text}
        </a>
      );
    case 'strong':
      return (
        <strong key={key} className="font-semibold text-amber-950">
          {token.value}
        </strong>
      );
    case 'em':
      return (
        <em key={key} className="italic">
          {token.value}
        </em>
      );
    case 'price':
      return (
        <span
          key={key}
          className="whitespace-nowrap font-semibold tabular-nums text-amber-950"
        >
          {token.value}
        </span>
      );
    default:
      return token.value;
  }
}

function renderNoteInline(text: string): React.ReactNode[] {
  return tokenizeInlineMarkdown(text).map((token, index) =>
    renderNoteToken(token, `note-${index}`),
  );
}

type BlogArticleNoteProps = ParsedNote;

/**
 * Magazine inset «Важно» для путеводителей.
 * Markdown: [NOTE label="Важно" text="… [Ссылка](https://daibilet.ru/…)."]
 */
export function BlogArticleNote({ label, text }: BlogArticleNoteProps) {
  return (
    <aside
      className="my-10 rounded-r-md border-l-[4px] border-amber-500 bg-gradient-to-r from-amber-50 to-amber-50/40 py-4 pl-4 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:my-12 sm:pl-5 sm:pr-4"
      role="note"
    >
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-amber-900/80">{label}</p>
      <p className="mt-1.5 text-base leading-[1.55] text-amber-950/95 sm:text-[1.05rem] sm:leading-[1.55]">
        {renderNoteInline(text)}
      </p>
    </aside>
  );
}
