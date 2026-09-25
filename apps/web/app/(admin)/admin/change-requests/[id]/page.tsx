import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { formatAdminDateTime } from '@/lib/admin-ui';
import { runAdminEcrAction } from '@/server/admin-ecr-actions';
import { loadAdminEcrDetail } from '@/server/admin-ecr-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminChangeRequestDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const rawSearch = await searchParams;
  const detail = await loadAdminEcrDetail(id);
  const done = first(rawSearch.done);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/change-requests" className="hover:underline">
          ECR
        </Link>
        <span>/</span>
        <span className="text-slate-700">{detail.id}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{detail.title || detail.id}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {detail.type} · {detail.status}
            {detail.supplierName ? ` · ${detail.supplierName}` : ''}
          </p>
        </div>
        {detail.eventId ? (
          <Link
            href={`/admin/events/${encodeURIComponent(detail.eventId)}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Событие
          </Link>
        ) : null}
      </header>

      {done ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Действие выполнено: {done}.
        </div>
      ) : null}

      <AdminApiErrorBanner errors={detail.errors} />

      {!detail.found ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Заявка не найдена.
        </div>
      ) : null}

      {detail.summary ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          {detail.summary}
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Создано" value={formatAdminDateTime(detail.createdAt)} />
        <Info label="Отправлено" value={formatAdminDateTime(detail.submittedAt)} />
        <Info
          label="Payload keys"
          value={detail.payloadKeys.length ? detail.payloadKeys.slice(0, 8).join(', ') : '—'}
        />
      </div>

      {detail.adminComment ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="text-xs text-slate-500">Комментарий админа</div>
          <div className="mt-1">{detail.adminComment}</div>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {detail.actions.canApprove ? (
          <form action={runAdminEcrAction}>
            <input type="hidden" name="id" value={detail.id} />
            <input type="hidden" name="action" value="approve" />
            <button
              type="submit"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Одобрить
            </button>
          </form>
        ) : null}
        {detail.actions.canReject ? (
          <form action={runAdminEcrAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={detail.id} />
            <input type="hidden" name="action" value="reject" />
            <input
              name="adminComment"
              required
              placeholder="Причина отклонения"
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100"
            >
              Отклонить
            </button>
          </form>
        ) : null}
        {detail.actions.canApply ? (
          <form action={runAdminEcrAction}>
            <input type="hidden" name="id" value={detail.id} />
            <input type="hidden" name="action" value="apply" />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Применить
            </button>
          </form>
        ) : null}
        {!detail.actions.canApprove && !detail.actions.canReject && !detail.actions.canApply ? (
          <span className="text-xs text-slate-500">Нет доступных действий для текущего статуса.</span>
        ) : null}
      </section>

      {detail.warnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {detail.warnings.join(' · ')}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Diff</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Поле</th>
                <th className="px-3 py-2 font-medium">Сейчас</th>
                <th className="px-3 py-2 font-medium">Предложено</th>
                <th className="px-3 py-2 font-medium">Тип</th>
              </tr>
            </thead>
            <tbody>
              {detail.diffItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Diff пуст или недоступен.
                  </td>
                </tr>
              ) : (
                detail.diffItems.map((item) => (
                  <tr key={`${item.path}-${item.changeType}`} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.label}</div>
                      <div className="font-mono text-[11px] text-slate-400">{item.path}</div>
                    </td>
                    <td className="max-w-xs break-words px-3 py-2 text-xs text-slate-600">
                      {item.currentValue}
                    </td>
                    <td className="max-w-xs break-words px-3 py-2 text-xs text-slate-900">
                      {item.proposedValue}
                    </td>
                    <td className="px-3 py-2 text-xs">{item.changeType}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
