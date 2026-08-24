'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { pluralEvents } from '@/lib/format';

/** Ticketland-style window: 1 … neighborhood … last */
export function buildPaginationItems(
  current: number,
  totalPages: number,
  siblingCount = 1,
): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = current - siblingCount; i <= current + siblingCount; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i]!;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const gap = page - prev;
      if (gap === 2) items.push(prev + 1);
      else if (gap > 2) items.push('ellipsis');
    }
    items.push(page);
  }
  return items;
}

function PaginationNavLink({
  href,
  className,
  rel,
  'aria-label': ariaLabel,
  children,
  targetPage,
  onPageChange,
}: {
  href: string;
  className: string;
  rel?: string;
  'aria-label'?: string;
  children: ReactNode;
  targetPage: number;
  onPageChange?: (page: number) => void;
}) {
  if (!onPageChange) {
    return (
      <Link href={href} rel={rel} scroll className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  // App Router listens for same-origin <a> clicks (often capture). A bubble-only
  // preventDefault still starts soft-nav + (catalog)/loading.tsx wipe. Use a button
  // for client paging; keep href on data attribute for copy/debug.
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      data-pagination-href={href}
      data-pagination-rel={rel}
      onClick={() => onPageChange(targetPage)}
    >
      {children}
    </button>
  );
}

export function CatalogPaginationLinks({
  page,
  total,
  limit,
  searchParams,
  basePath = '/events',
  summarySuffix,
  onPageChange,
  onLoadMore,
  loadingMore = false,
  shownCount,
}: {
  page: number;
  total: number;
  limit: number;
  searchParams: Record<string, string | string[] | undefined>;
  /** Catalog index path (`/events`, `/venues`, `/locations`). */
  basePath?: string;
  /** Extra label after «Показано X из Y», e.g. pluralEvents(total). */
  summarySuffix?: string;
  /**
   * Client page switch: replace list with the target page (desktop page strip).
   */
  onPageChange?: (page: number) => void;
  /** Append the next page below current items (mobile «Показать ещё»). */
  onLoadMore?: () => void;
  loadingMore?: boolean;
  /** Items actually rendered (accumulated load-more count). */
  shownCount?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const shown = shownCount ?? Math.min(page * limit, total);
  const remaining = Math.max(total - shown, 0);
  const suffix =
    summarySuffix ??
    (basePath === '/events' ? pluralEvents(total) : undefined);

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page' || value == null) continue;
      if (typeof value === 'string') params.set(key, value);
      else if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    }
    if (targetPage > 1) params.set('page', String(targetPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const desktopItems = buildPaginationItems(page, totalPages, 1);

  const pageBtn =
    'inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition';
  const pageBtnIdle = `${pageBtn} border-slate-200 text-slate-700 hover:bg-slate-50`;
  const pageBtnActive = `${pageBtn} border-slate-900 bg-slate-900 text-white`;
  const navBtn =
    'inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Пагинация каталога" className="mt-10 flex flex-col gap-4">
      <p className="text-center text-sm text-slate-500 sm:text-left">
        Показано {shown} из {total}
        {suffix ? ` · ${suffix}` : ''}
      </p>

      {/* Mobile: append next batch */}
      <div className="flex flex-col items-center gap-3 sm:hidden">
        {nextPage && remaining > 0 ? (
          onLoadMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={onLoadMore}
              className="inline-flex min-h-11 w-full max-w-sm items-center justify-center rounded-full bg-primary-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
            >
              {loadingMore
                ? 'Загрузка…'
                : `Показать ещё ${Math.min(limit, remaining)}`}
            </button>
          ) : (
            <PaginationNavLink
              href={buildHref(nextPage)}
              rel="next"
              targetPage={nextPage}
              onPageChange={onPageChange}
              className="inline-flex min-h-11 w-full max-w-sm items-center justify-center rounded-full bg-primary-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              {`Показать ещё ${Math.min(limit, remaining)}`}
            </PaginationNavLink>
          )
        ) : null}
      </div>

      {/* Desktop: classic page strip */}
      <div className="hidden flex-wrap items-center justify-between gap-2 sm:flex">
        {prevPage ? (
          <PaginationNavLink
            href={buildHref(prevPage)}
            rel="prev"
            targetPage={prevPage}
            onPageChange={onPageChange}
            className={navBtn}
            aria-label="Предыдущая страница"
          >
            ← Назад
          </PaginationNavLink>
        ) : (
          <span className={navBtn} aria-disabled="true">
            ← Назад
          </span>
        )}

        <ol className="flex flex-wrap items-center gap-1.5">
          {desktopItems.map((item, index) =>
            item === 'ellipsis' ? (
              <li
                key={`ellipsis-${index}`}
                className="inline-flex min-h-10 min-w-8 items-center justify-center text-sm text-slate-400"
                aria-hidden
              >
                …
              </li>
            ) : (
              <li key={item}>
                {item === page ? (
                  <span className={pageBtnActive} aria-current="page">
                    {item}
                  </span>
                ) : (
                  <PaginationNavLink
                    href={buildHref(item)}
                    targetPage={item}
                    onPageChange={onPageChange}
                    className={pageBtnIdle}
                    aria-label={`Страница ${item}`}
                  >
                    {item}
                  </PaginationNavLink>
                )}
              </li>
            ),
          )}
        </ol>

        {nextPage && remaining > 0 ? (
          onLoadMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={onLoadMore}
              className={`${navBtn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70`}
              aria-label="Показать ещё"
            >
              {loadingMore
                ? 'Загрузка…'
                : `Показать ещё ${Math.min(limit, remaining)}`}
            </button>
          ) : (
            <PaginationNavLink
              href={buildHref(nextPage)}
              rel="next"
              targetPage={nextPage}
              onPageChange={onPageChange}
              className={`${navBtn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`}
              aria-label="Показать ещё"
            >
              {`Показать ещё ${Math.min(limit, remaining)}`}
            </PaginationNavLink>
          )
        ) : (
          <span className={navBtn} aria-disabled="true">
            Дальше →
          </span>
        )}
      </div>
    </nav>
  );
}
