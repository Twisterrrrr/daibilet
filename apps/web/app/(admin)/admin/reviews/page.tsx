import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { formatAdminDateTime, viteAdminHref } from '@/lib/admin-ui';
import { moderateAdminReviewAction } from '@/server/admin-review-actions';
import { loadAdminReviewsList } from '@/server/admin-reviews-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS = [
  { id: 'PENDING_MODERATION', label: 'На модерации' },
  { id: 'APPROVED', label: 'Одобренные' },
  { id: 'REJECTED', label: 'Отклонённые' },
  { id: 'PENDING_EMAIL', label: 'Ждут email' },
  { id: 'HIDDEN', label: 'Скрытые' },
  { id: 'all', label: 'Все' },
];

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const status = first(raw.status) || 'PENDING_MODERATION';
  const page = first(raw.page) || '1';
  const data = await loadAdminReviewsList({ status, page });
  const done = first(raw.done);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Отзывы</h2>
          <p className="mt-1 text-sm text-slate-600">
            Модерация: approve / reject / hide. Очередь:{' '}
            {data.pendingCount}
          </p>
        </div>
        <a
          href={viteAdminHref('/reviews')}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Vite
        </a>
      </header>

      {done ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Действие выполнено: {done}.
        </div>
      ) : null}

      <AdminApiErrorBanner errors={data.errors} />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.id;
          const href =
            filter.id === 'PENDING_MODERATION'
              ? '/admin/reviews'
              : `/admin/reviews?status=${encodeURIComponent(filter.id)}`;
          return (
            <Link
              key={filter.id}
              href={href}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
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
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Отзыв</th>
              <th className="px-3 py-2 font-medium">Событие</th>
              <th className="px-3 py-2 font-medium">Автор</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  Очередь пуста.
                </td>
              </tr>
            ) : (
              data.items.map((review) => (
                <tr key={review.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3">
                    <div className="text-amber-600">{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</div>
                    {review.title ? (
                      <div className="mt-1 font-medium text-slate-900">{review.title}</div>
                    ) : null}
                    <p className="mt-1 max-w-xl text-slate-600">{review.text}</p>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {formatAdminDateTime(review.createdAt)}
                      {review.purchaseRef ? ` · ref ${review.purchaseRef}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {review.eventId ? (
                      <Link
                        href={`/admin/events/${encodeURIComponent(review.eventId)}`}
                        className="text-sky-700 hover:underline"
                      >
                        {review.eventTitle || review.eventId}
                      </Link>
                    ) : (
                      review.eventTitle || '—'
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div>{review.authorName}</div>
                    <div className="text-xs text-slate-500">{review.authorEmail}</div>
                    {review.isVerified ? (
                      <div className="mt-1 text-[11px] text-emerald-700">verified</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs">{review.status}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <form action={moderateAdminReviewAction}>
                        <input type="hidden" name="id" value={review.id} />
                        <input type="hidden" name="action" value="approve" />
                        <input type="hidden" name="statusFilter" value={status} />
                        <button
                          type="submit"
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100"
                        >
                          Одобрить
                        </button>
                      </form>
                      <form action={moderateAdminReviewAction} className="space-y-1">
                        <input type="hidden" name="id" value={review.id} />
                        <input type="hidden" name="action" value="reject" />
                        <input type="hidden" name="statusFilter" value={status} />
                        <input
                          name="adminComment"
                          placeholder="Комментарий reject"
                          className="w-36 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 hover:bg-rose-100"
                        >
                          Отклонить
                        </button>
                      </form>
                      <form action={moderateAdminReviewAction}>
                        <input type="hidden" name="id" value={review.id} />
                        <input type="hidden" name="action" value="hide" />
                        <input type="hidden" name="statusFilter" value={status} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Скрыть
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={data.page}
        pages={data.pages}
        total={data.total}
        basePath="/admin/reviews"
        current={{ status: status === 'PENDING_MODERATION' ? undefined : status }}
      />
    </div>
  );
}
