import Link from 'next/link';

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

export function CatalogPaginationLinks({
  page,
  total,
  limit,
  searchParams,
}: {
  page: number;
  total: number;
  limit: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page' || value == null) continue;
      if (typeof value === 'string') params.set(key, value);
      else if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    }
    if (targetPage > 1) params.set('page', String(targetPage));
    const query = params.toString();
    return query ? `/events?${query}` : '/events';
  };

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const items = buildPaginationItems(page, totalPages, 1);

  const pageBtn =
    'inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition';
  const pageBtnIdle = `${pageBtn} border-slate-200 text-slate-700 hover:bg-slate-50`;
  const pageBtnActive = `${pageBtn} border-slate-900 bg-slate-900 text-white`;
  const navBtn =
    'inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Пагинация каталога" className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Страница {page} из {totalPages} · {pluralEvents(total)}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {prevPage ? (
          <Link href={buildHref(prevPage)} rel="prev" className={navBtn} aria-label="Предыдущая страница">
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← Назад</span>
          </Link>
        ) : (
          <span className={navBtn} aria-disabled="true">
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← Назад</span>
          </span>
        )}

        <ol className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {items.map((item, index) =>
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
                  <Link href={buildHref(item)} className={pageBtnIdle} aria-label={`Страница ${item}`}>
                    {item}
                  </Link>
                )}
              </li>
            ),
          )}
        </ol>

        {nextPage ? (
          <Link href={buildHref(nextPage)} rel="next" className={`${navBtn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`} aria-label="Следующая страница">
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">Дальше →</span>
          </Link>
        ) : (
          <span className={navBtn} aria-disabled="true">
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">Дальше →</span>
          </span>
        )}
      </div>
    </nav>
  );
}
