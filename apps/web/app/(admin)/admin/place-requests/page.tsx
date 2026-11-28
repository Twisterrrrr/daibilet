import Link from 'next/link';
import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { reviewSupplierPlaceRequestAction } from '@/server/admin-supplier-place-actions';
import { loadAdminSupplierPlaceRequests } from '@/server/admin-supplier-place-requests';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const statusLabels: Record<string, string> = { SUBMITTED: 'На рассмотрении', NEEDS_INFO: 'Нужно уточнение', APPROVED: 'Одобрено, ждёт применения', REJECTED: 'Отклонено', APPLIED: 'Применено редактором' };

export default async function AdminPlaceRequestsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status || '';
  const data = await loadAdminSupplierPlaceRequests(status);
  return <div className="space-y-4">
    <header><h1 className="text-xl font-semibold">Заявки на места</h1><p className="mt-1 text-sm text-slate-600">Сначала проверьте diff и одобрите заявку. Применение создаёт новую версию PDP и запись аудита; публикацию и SEO оно не меняет.</p></header>
    <AdminApiErrorBanner errors={data.error ? [data.error] : []}/>
    <nav className="flex flex-wrap gap-2">{[['', 'Все'], ['SUBMITTED', 'На рассмотрении'], ['NEEDS_INFO', 'Нужно уточнение'], ['APPROVED', 'Одобрено'], ['APPLIED', 'Применены'], ['REJECTED', 'Отклонено']].map(([value, label]) => <Link key={value} href={value ? `/admin/place-requests?status=${value}` : '/admin/place-requests'} className={`rounded-md border px-3 py-1.5 text-sm ${status === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}>{label}</Link>)}</nav>
    {!data.rows.length ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Заявок по этому фильтру нет.</div> : data.rows.map((row) => <article key={row.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{row.title}</h2><p className="mt-1 text-sm text-slate-600">{row.supplierTitle} · {row.type === 'CREATE' ? 'новое место-кандидат' : `изменения: ${row.venueTitle || row.venueId || 'место'}`} · {new Date(row.submittedAt).toLocaleString('ru-RU')}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{row.rolledBack ? 'Откат выполнен' : statusLabels[row.status] || row.status}</span></header>
      {row.venueId && <Link className="text-sm text-blue-700 underline" href={`/admin/venues/${encodeURIComponent(row.venueId)}`}>Открыть карточку места</Link>}
      <RequestDiff type={row.type} payload={row.payload} snapshot={row.sourceSnapshot}/>
      <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-medium">Техническая история заявки</summary><div className="mt-3 grid gap-3 lg:grid-cols-2"><JsonPanel title="Предложено поставщиком" value={row.payload}/><JsonPanel title="Снимок при подаче" value={row.sourceSnapshot}/></div></details>
      {['SUBMITTED', 'NEEDS_INFO'].includes(row.status) && <form action={reviewSupplierPlaceRequestAction} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[1fr_auto_auto_auto]"><input type="hidden" name="id" value={row.id}/><input name="comment" defaultValue={row.adminComment || ''} placeholder="Комментарий поставщику / причина решения" className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"/><button name="action" value="NEEDS_INFO" className="rounded-md border border-slate-300 px-3 py-2 text-sm">Запросить уточнение</button><button name="action" value="REJECT" className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Отклонить</button><button name="action" value="APPROVE" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Принять в редакционную работу</button></form>}
      {row.status === 'APPROVED' && row.type === 'UPDATE' && row.venueId && <form action={reviewSupplierPlaceRequestAction} className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3"><input type="hidden" name="id" value={row.id}/><input name="comment" defaultValue={row.adminComment || ''} placeholder="Комментарий к редакционной версии (необязательно)" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"/><button name="action" value="APPLY" className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white">Применить проверенные изменения</button><span className="text-xs text-slate-500">Если место или PDP менялись после подачи, применение остановится и попросит пересверить заявку.</span></form>}
      {row.status === 'APPROVED' && row.type === 'CREATE' && <form action={reviewSupplierPlaceRequestAction} className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3"><input type="hidden" name="id" value={row.id}/><input name="comment" defaultValue={row.adminComment || ''} placeholder="Комментарий редактора (необязательно)" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"/><button name="action" value="APPLY" className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white">Создать карточку-кандидат из заявки</button><span className="text-xs text-slate-500">Создаст CANDIDATE с noindex; публикацию можно решить позже.</span></form>}
      {row.status === 'APPLIED' && !row.rolledBack && <form action={reviewSupplierPlaceRequestAction} className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3"><input type="hidden" name="id" value={row.id}/><input name="comment" placeholder="Причина отката (необязательно)" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"/><button name="action" value="ROLLBACK" className="rounded-md border border-amber-300 px-4 py-2 text-sm text-amber-900">Откатить применение</button><span className="text-xs text-slate-500">Сработает, если применённые поля не менялись после заявки.</span></form>}
    </article>)}
  </div>;
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section><h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3><pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-5">{value == null ? 'Нет данных' : JSON.stringify(value, null, 2)}</pre></section>;
}

const fieldLabels: Record<string, string> = { title: 'Название', cityId: 'Город', cityTitle: 'Город', address: 'Адрес', latitude: 'Широта', longitude: 'Долгота', placeType: 'Тип места', placeSubtype: 'Подтип', websiteUrl: 'Сайт', phone: 'Телефон', openingHours: 'Часы работы', shortDescription: 'Краткое описание', description: 'Описание', metroStation: 'Метро', wayToFind: 'Как найти', parkingInfo: 'Парковка', imageUrl: 'Изображение', imageRights: 'Права на изображение', sourceUrl: 'Источник изображения' };
function RequestDiff({ type, payload, snapshot }: { type: string; payload: unknown; snapshot: unknown }) {
  const request = asRecord(payload);
  const before = asRecord(asRecord(snapshot).venue);
  const candidate = asRecord(request.candidate);
  const fields = type === 'CREATE' ? candidate : asRecord(request.fields);
  const rows: Array<{ key: string; label: string; oldValue: unknown; newValue: unknown }> = Object.entries(fields).map(([key, value]) => ({ key, label: fieldLabels[key] || key, oldValue: type === 'CREATE' ? null : before[key], newValue: value }));
  if (request.pdpDocument) {
    const oldLeaves = flatten(asRecord(asRecord(snapshot).pdpDocument).content, 'Контент PDP');
    const newLeaves = flatten(asRecord(request.pdpDocument).content, 'Контент PDP');
    for (const key of new Set([...Object.keys(oldLeaves), ...Object.keys(newLeaves)])) {
      if (JSON.stringify(oldLeaves[key]) !== JSON.stringify(newLeaves[key])) rows.push({ key: `pdp:${key}`, label: key, oldValue: oldLeaves[key], newValue: newLeaves[key] });
    }
  }
  return <section><h3 className="mb-2 text-sm font-semibold">Изменения: было → предлагается</h3>{rows.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-2">Поле</th><th className="p-2">Было</th><th className="p-2">Предлагается</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key} className="border-t border-slate-100 align-top"><th className="p-2 font-medium">{row.label}</th><td className="max-w-md whitespace-pre-wrap break-words p-2 text-slate-600">{display(row.oldValue)}</td><td className="max-w-md whitespace-pre-wrap break-words p-2">{display(row.newValue)}</td></tr>)}</tbody></table></div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">В запросе нет изменений карточки или текста PDP.</p>}</section>;
}
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function flatten(value: unknown, prefix: string, out: Record<string, unknown> = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) flatten(item, `${prefix} / ${fieldLabels[key] || key}`, out);
  } else out[prefix] = value;
  return out;
}
function display(value: unknown) { if (value == null || value === '') return '—'; return typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
