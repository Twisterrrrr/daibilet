import Link from 'next/link';

import { buildPageHref } from '@/lib/admin-ui';

type Props = {
  basePath: string;
  page: number;
  pages: number;
  total: number;
  current: Record<string, string | undefined>;
};

export function AdminPagination({ basePath, page, pages, total, current }: Props) {
  if (pages <= 1) {
    return <p className="text-xs text-slate-500">Всего: {total}</p>;
  }

  const prev = page > 1 ? buildPageHref(basePath, current, { page: String(page - 1) }) : null;
  const next = page < pages ? buildPageHref(basePath, current, { page: String(page + 1) }) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-xs text-slate-500">
        Страница {page} из {pages} · всего {total}
      </p>
      <div className="flex gap-2">
        {prev ? (
          <Link href={prev} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50">
            Назад
          </Link>
        ) : (
          <span className="rounded-md border border-slate-100 px-3 py-1.5 text-xs text-slate-300">Назад</span>
        )}
        {next ? (
          <Link href={next} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50">
            Далее
          </Link>
        ) : (
          <span className="rounded-md border border-slate-100 px-3 py-1.5 text-xs text-slate-300">Далее</span>
        )}
      </div>
    </div>
  );
}
