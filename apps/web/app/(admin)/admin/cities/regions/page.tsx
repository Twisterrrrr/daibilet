import Link from 'next/link';
import { RegionsManager } from '@/components/admin/RegionsManager.client';
import { listAdminRegionsAction } from '@/server/admin-destination-pdp-actions';

export const dynamic = 'force-dynamic';

export default async function AdminRegionsPage() {
  let regions: Awaited<ReturnType<typeof listAdminRegionsAction>>['regions'] = [];
  let error = '';
  try { regions = (await listAdminRegionsAction()).regions; }
  catch (cause) { error = cause instanceof Error ? cause.message : 'API недоступен'; }
  return <div className="space-y-4">
    <div className="flex items-center gap-2 text-xs text-slate-500"><Link href="/admin/cities" className="hover:underline">← Города</Link><span>/</span><span className="text-slate-700">Регионы</span></div>
    <header><h2 className="text-xl font-semibold text-slate-900">Региональные хабы</h2><p className="mt-1 text-sm text-slate-600">Регион становится публичным хабом только после редакторского наполнения и публикации.</p></header>
    {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Не удалось загрузить регионы: {error}</p> : null}
    <RegionsManager regions={regions} />
  </div>;
}
