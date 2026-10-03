import Link from 'next/link';

import { SHORTCODE_ATTRS } from '@/lib/blog-markdown';
import {
  buildDayRouteShortPath,
  isValidDayRouteShareCode,
  parseDayRouteReadableSlug,
} from '@/lib/day-route-share-url';

export type ParsedRouteBlock = {
  href: string;
  label: string;
};

const ROUTE_REGEX = new RegExp(String.raw`^\[route\s+${SHORTCODE_ATTRS}\]$`, 'i');

/**
 * Blog widget: `[route code="x7k2m9a"]` or `[route slug="spb-serdtse-pitere-x7k2m9a"]`.
 */
export function parseRouteBlock(block: string): ParsedRouteBlock | null {
  const trimmed = block.trim();
  const match = trimmed.match(ROUTE_REGEX);
  if (!match?.[1]) return null;

  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(match[1])) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }

  const label = String(attrs.label || 'Маршрут на день').trim() || 'Маршрут на день';
  const codeRaw = String(attrs.code || '').trim().toLowerCase();
  const slugRaw = String(attrs.slug || '').trim().toLowerCase();

  if (codeRaw && isValidDayRouteShareCode(codeRaw)) {
    return { href: buildDayRouteShortPath(codeRaw), label };
  }

  if (slugRaw) {
    const parsed = parseDayRouteReadableSlug(slugRaw);
    if (parsed) {
      // Keep full slug as-is (city may contain hyphens like nizhny-novgorod).
      return { href: `/m/${encodeURIComponent(slugRaw)}`, label };
    }
  }

  return null;
}

type BlogArticleRouteProps = ParsedRouteBlock;

/** Compact card linking to public `/m/…` share page. */
export function BlogArticleRoute({ href, label }: BlogArticleRouteProps) {
  return (
    <aside className="my-8 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-sky-50/80 p-4 shadow-sm sm:p-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary-700">Мой день</p>
      <p className="mt-1.5 text-base font-semibold text-slate-900 sm:text-lg">{label}</p>
      <Link
        href={href}
        className="mt-3 inline-flex text-sm font-semibold text-primary-700 underline decoration-primary/35 underline-offset-2 transition hover:text-primary-800"
      >
        Открыть маршрут
      </Link>
    </aside>
  );
}
