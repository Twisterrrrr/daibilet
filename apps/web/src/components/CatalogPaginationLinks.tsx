import Link from 'next/link';

import { pluralEvents } from '@/lib/format';

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

  return (
    <nav aria-label="Пагинация каталога" className="mt-10 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        Страница {page} из {totalPages} · {pluralEvents(total)}
      </p>
      <div className="flex items-center gap-2">
        {prevPage ? (
          <Link href={buildHref(prevPage)} rel="prev" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            ← Назад
          </Link>
        ) : null}
        {nextPage ? (
          <Link href={buildHref(nextPage)} rel="next" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Дальше →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
