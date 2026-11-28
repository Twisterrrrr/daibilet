import Link from 'next/link';
import { DestinationPdpEditor } from '@/components/admin/DestinationPdpEditor.client';
import { loadAdminDestinationPdpAction } from '@/server/admin-destination-pdp-actions';

export const dynamic = 'force-dynamic';

export default async function AdminRegionPdpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  try {
    const data = await loadAdminDestinationPdpAction('regions', id);
    return <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500"><Link href="/admin/cities/regions" className="hover:underline">← Регионы</Link><span>/</span><span>{data.owner.title}</span></div>
      <header><h2 className="text-xl font-semibold text-slate-900">{data.owner.title}</h2><p className="mt-1 text-sm text-slate-600">Региональный хаб · /cities/{data.owner.slug}</p></header>
      <DestinationPdpEditor ownerType="regions" owner={data.owner} initialDocument={data.document} initialReadiness={{ ready: data.readiness.ready, issues: data.readiness.missing || [] }} />
    </div>;
  } catch (error) {
    return <div className="space-y-3"><Link href="/admin/cities/regions" className="text-sm text-blue-700 hover:underline">← К регионам</Link><h2 className="text-xl font-semibold">Редактор региона недоступен</h2><p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error instanceof Error ? error.message : 'Не удалось загрузить редактор'}</p></div>;
  }
}
