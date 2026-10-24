import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminEventEditor } from '@/components/admin/AdminEventEditor';
import { loadAdminEventDetail, loadAdminTaxonomy } from '@/server/admin-events-data';
import { loadAdminPdpEditorData } from '@/server/admin-pdp-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function noticeFromSearch(raw: Record<string, string | string[] | undefined>): string | null {
  const saved = first(raw.saved);
  if (saved === 'content') return 'Контент сохранён.';
  if (saved === 'seo') return 'SEO сохранён.';
  if (saved === 'media') return 'Медиа сохранены.';
  if (saved === 'taxonomy') return 'Taxonomy сохранена.';
  if (first(raw.moderation) === '1') return 'Статус модерации обновлён.';
  return null;
}

export default async function AdminEventDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const rawSearch = await searchParams;
  const [detail, taxonomy, pdpData] = await Promise.all([
    loadAdminEventDetail(id), loadAdminTaxonomy(), loadAdminPdpEditorData('events', id),
  ]);
  // Queue context from the events list: back keeps the selection, next opens
  // the following task without returning to the list.
  const back = first(rawSearch.back) || '';
  const backHref = /^\/admin\/events(?:\?|$)/.test(back) ? back : '/admin/events';
  const remainingIds = (first(rawSearch.next) || '')
    .split(',')
    .filter((candidate) => /^[a-zA-Z0-9_-]{1,80}$/.test(candidate))
    .slice(0, 50);
  const nextId = remainingIds[0];
  const nextParams = new URLSearchParams({ back: backHref });
  if (remainingIds.length > 1) nextParams.set('next', remainingIds.slice(1).join(','));
  const nextHref = nextId ? `/admin/events/${encodeURIComponent(nextId)}?${nextParams}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href={backHref} className="hover:underline">
            ← К очереди
          </Link>
          <span>/</span>
          <span className="text-slate-700">{detail.found ? detail.id : id}</span>
        </div>
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Следующая задача →
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Конец страницы очереди</span>
        )}
      </div>
      <AdminApiErrorBanner errors={[...detail.errors, ...taxonomy.errors]} />
      {!detail.found && detail.errors.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Событие не найдено или без контента в API.
        </div>
      ) : null}
      <AdminEventEditor
        detail={detail}
        taxonomy={taxonomy}
        notice={noticeFromSearch(rawSearch)}
        queue={{ back: backHref, next: remainingIds.join(',') || undefined }}
        pdpData={pdpData}
      />
    </div>
  );
}
