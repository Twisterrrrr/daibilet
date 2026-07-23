import { ArrowRight } from 'lucide-react';

import { navigateBlogHref } from '@/lib/blog-navigate';

type BlogArticleCtaProps = {
  title: string;
  text: string;
  button: string;
  href: string;
  secondaryButton?: string;
  secondaryHref?: string;
};

export function BlogArticleCta({ title, text, button, href, secondaryButton, secondaryHref }: BlogArticleCtaProps) {
  return (
    <aside className="relative z-10 my-12 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-white to-sky-50 p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">Дайбилет</p>
      <h3 className="mt-2 font-display text-xl font-bold text-slate-900 sm:text-2xl">{title}</h3>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{text}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigateBlogHref(href)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          {button}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {secondaryButton && secondaryHref ? (
          <button
            type="button"
            onClick={() => navigateBlogHref(secondaryHref)}
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary-700"
          >
            {secondaryButton}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export type ParsedCta = BlogArticleCtaProps;

/** Как у NOTE: `]` внутри quoted attrs (напр. text с markdown-ссылкой) не должен обрывать блок. */
const CTA_REGEX = /^\[CTA\s+((?:[^\]"]|"[^"]*")+)\]$/;

export function parseCtaBlock(block: string): ParsedCta | null {
  const trimmed = block.trim();
  const match = trimmed.match(CTA_REGEX);
  if (!match) return null;

  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(match[1])) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }

  if (!attrs.title || !attrs.button || !attrs.href) return null;

  return {
    title: attrs.title,
    text: attrs.text || '',
    button: attrs.button,
    href: attrs.href,
    secondaryButton: attrs.secondaryButton,
    secondaryHref: attrs.secondaryHref,
  };
}
