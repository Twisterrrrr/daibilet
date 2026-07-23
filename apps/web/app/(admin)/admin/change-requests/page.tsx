import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';
import { loadAdminEcrList } from '@/server/admin-ecr-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS = [
  { id: 'SUBMITTED', label: 'На проверке' },
  { id: 'APPROVED', label: 'Одобрено' },
  { id: 'REJECTED', label: 'Отклонено' },
  { id: 'APPLIED', label: 'Применено' },
  { id: 'all', label: 'Все' },
];

export default async function AdminChangeRequestsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const status = first(raw.status) || 'SUBMITTED';
  const type = first(raw.type) || 'all';
  const q = (first(raw.q) || '').trim();
  const offset = first(raw.offset) || '0';
  const data = await loadAdminEcrList({ status, type, q, offset });
  const typeOptions = Object.keys(data.facets.types).sort();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Заявки на изменения (ECR)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Очередь правок: approve / reject / apply. Всего {formatAdminNumber(data.total)}.
          </p>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <form className="flex flex-wrap gap-2" action="/admin/change-requests" method="get">
        {status !== 'SUBMITTED' ? <input type="hidden" name="status" value={status} /> : null}
        {type !== 'all' ? <input type="hidden" name="type" value={type} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Событие, поставщик, slug..."
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
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.id;
          const params = new URLSearchParams();
          if (filter.id !== 'SUBMITTED') params.set('status', filter.id);
          if (type !== 'all') params.set('type', type);
          if (q) params.set('q', q);
          const qs = params.toString();
          return (
            <Link
              key={filter.id}
              href={qs ? `/admin/change-requests?${qs}` : '/admin/change-requests'}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {filter.label}
              {filter.id !== 'all' && data.facets.statuses[filter.id] != null
                ? ` (${data.facets.statuses[filter.id]})`
                : ''}
            </Link>
          );
        })}
      </div>

      {typeOptions.length ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildEcrHref({ status, q, type: 'all' })}
            className={`rounded-md border px-2 py-1 text-xs ${
              type === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
            }`}
          >
            Все типы
          </Link>
          {typeOptions.map((item) => (
            <Link
              key={item}
              href={buildEcrHref({ status, q, type: item })}
              className={`rounded-md border px-2 py-1 text-xs ${
                type === item ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Заявка</th>
              <th className="px-3 py-2 font-medium">Событие</th>
              <th className="px-3 py-2 font-medium">Тип / статус</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                  Заявок нет.
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">{item.title || item.id}</div>
                    {item.summary ? (
                      <p className="mt-1 max-w-xl text-xs text-slate-600">{item.summary}</p>
                    ) : null}
                    <div className="mt-1 text-[11px] text-slate-400">
                      {formatAdminDateTime(item.submittedAt || item.createdAt)}
                      {item.supplierName ? ` · ${item.supplierName}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {item.eventId ? (
                      <Link
                        href={`/admin/events/${encodeURIComponent(item.eventId)}`}
                        className="text-sky-700 hover:underline"
                      >
                        {item.eventTitle || item.eventId}
                      </Link>
                    ) : (
                      item.eventTitle || '—'
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>{item.type}</div>
                    <div className="mt-1 text-slate-500">{item.status}</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/admin/change-requests/${encodeURIComponent(item.id)}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.offset > 0 ? (
          <Link
            href={buildEcrHref({
              status,
              type,
              q,
              offset: Math.max(0, data.offset - data.limit),
            })}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            Назад
          </Link>
        ) : null}
        {data.hasMore ? (
          <Link
            href={buildEcrHref({
              status,
              type,
              q,
              offset: data.offset + data.limit,
            })}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            Дальше
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function buildEcrHref(opts: {
  status: string;
  type: string;
  q: string;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'SUBMITTED') params.set('status', opts.status);
  if (opts.type && opts.type !== 'all') params.set('type', opts.type);
  if (opts.q) params.set('q', opts.q);
  if (opts.offset && opts.offset > 0) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return qs ? `/admin/change-requests?${qs}` : '/admin/change-requests';
}
