import Link from 'next/link';
import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { reviewSupplierPlaceRequestAction } from '@/server/admin-supplier-place-actions';
import { loadAdminSupplierPlaceRequests } from '@/server/admin-supplier-place-requests';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const statusLabels: Record<string, string> = { SUBMITTED: 'На рассмотрении', NEEDS_INFO: 'Нужно уточнение', APPROVED: 'Принято в редакционную работу', REJECTED: 'Отклонено', APPLIED: 'Применено редактором' };

export default async function AdminPlaceRequestsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status || '';
  const data = await loadAdminSupplierPlaceRequests(status);
  return <div className="space-y-4">
    <header><h1 className="text-xl font-semibold">Заявки на места</h1><p className="mt-1 text-sm text-slate-600">Проверяйте предложения поставщиков. Одобрение заявки не применяет текст к публичной PDP и не меняет публикацию или SEO.</p></header>
    <AdminApiErrorBanner errors={data.error ? [data.error] : []}/>
    <nav className="flex flex-wrap gap-2">{[['', 'Все'], ['SUBMITTED', 'На рассмотрении'], ['NEEDS_INFO', 'Нужно уточнение'], ['APPROVED', 'Одобрено'], ['REJECTED', 'Отклонено']].map(([value, label]) => <Link key={value} href={value ? `/admin/place-requests?status=${value}` : '/admin/place-requests'} className={`rounded-md border px-3 py-1.5 text-sm ${status === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}>{label}</Link>)}</nav>
    {!data.rows.length ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Заявок по этому фильтру нет.</div> : data.rows.map((row) => <article key={row.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{row.title}</h2><p className="mt-1 text-sm text-slate-600">{row.supplierTitle} · {row.type === 'CREATE' ? 'новое место-кандидат' : `изменения: ${row.venueTitle || row.venueId || 'место'}`} · {new Date(row.submittedAt).toLocaleString('ru-RU')}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{statusLabels[row.status] || row.status}</span></header>
      {row.venueId && <Link className="text-sm text-blue-700 underline" href={`/admin/venues/${encodeURIComponent(row.venueId)}`}>Открыть карточку места</Link>}
      <div className="grid gap-3 lg:grid-cols-2"><JsonPanel title="Предложено поставщиком" value={row.payload}/><JsonPanel title="Снимок текущего состояния" value={row.sourceSnapshot}/></div>
      {['SUBMITTED', 'NEEDS_INFO'].includes(row.status) && <form action={reviewSupplierPlaceRequestAction} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[1fr_auto_auto_auto]"><input type="hidden" name="id" value={row.id}/><input name="comment" defaultValue={row.adminComment || ''} placeholder="Комментарий поставщику / причина решения" className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"/><button name="action" value="NEEDS_INFO" className="rounded-md border border-slate-300 px-3 py-2 text-sm">Запросить уточнение</button><button name="action" value="REJECT" className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Отклонить</button><button name="action" value="APPROVE" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Принять в редакционную работу</button></form>}
    </article>)}
  </div>;
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section><h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3><pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-5">{value == null ? 'Нет данных' : JSON.stringify(value, null, 2)}</pre></section>;
}
