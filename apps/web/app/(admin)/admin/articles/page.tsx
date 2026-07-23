import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { formatAdminDateTime, PUBLIC_SITE_BASE } from '@/lib/admin-ui';
import { loadAdminArticlesList } from '@/server/admin-articles-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'published') return 'опубликовано';
  if (normalized === 'review') return 'на проверке';
  if (normalized === 'hidden') return 'архив';
  if (normalized === 'draft') return 'черновик';
  return status || 'черновик';
}

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = (first(raw.q) || '').trim().toLowerCase();
  const status = first(raw.status) || 'all';
  const data = await loadAdminArticlesList();

  const rows = data.rows.filter((row) => {
    if (status !== 'all' && row.status.toLowerCase() !== status.toLowerCase()) return false;
    if (!q) return true;
    return [row.title, row.slug, row.excerpt, row.city, row.authorName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Блог / статьи</h2>
          <p className="mt-1 text-sm text-slate-600">
            Список и CRUD статей в Next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/articles/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Новая статья
          </Link>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <form className="flex flex-wrap gap-2" action="/admin/articles" method="get">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={first(raw.q) || ''}
          placeholder="Поиск по title / slug / автору..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Найти
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Все' },
          { id: 'published', label: 'Опубликовано' },
          { id: 'review', label: 'На проверке' },
          { id: 'draft', label: 'Черновик' },
          { id: 'hidden', label: 'Архив' },
        ].map((filter) => {
          const active = status === filter.id;
          const qValue = first(raw.q) || '';
          const href =
            filter.id === 'all'
              ? qValue
                ? `/admin/articles?q=${encodeURIComponent(qValue)}`
                : '/admin/articles'
              : `/admin/articles?status=${encodeURIComponent(filter.id)}${qValue ? `&q=${encodeURIComponent(qValue)}` : ''}`;
          return (
            <Link
              key={filter.id}
              href={href}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Статья</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Автор</th>
                <th className="px-3 py-2 font-medium">Обновлено</th>
                <th className="px-3 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Нет статей по текущему фильтру.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        /blog/{row.slug}
                        {row.city ? ` · ${row.city}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.authorName || row.authorId || '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatAdminDateTime(row.updatedAt || row.publishedAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1 text-xs">
                        <Link href={`/admin/articles/${encodeURIComponent(row.id)}`} className="text-sky-700 hover:underline">
                          Редактировать
                        </Link>
                        <Link
                          href={`/admin/articles/${encodeURIComponent(row.id)}/preview`}
                          className="text-amber-800 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Превью
                        </Link>
                        {row.status.toLowerCase() === 'published' ? (
                          <a
                            href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/blog/${encodeURIComponent(row.slug)}`}
                            className="text-slate-500 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Public
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
