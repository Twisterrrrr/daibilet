import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminEventEditor } from '@/components/admin/AdminEventEditor';
import { loadAdminEventDetail } from '@/server/admin-events-data';

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
  if (first(raw.moderation) === '1') return 'Статус модерации обновлён.';
  return null;
}

export default async function AdminEventDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const rawSearch = await searchParams;
  const detail = await loadAdminEventDetail(id);

  return (
    <div className="space-y-4">
      <AdminApiErrorBanner errors={detail.errors} />
      {!detail.found && detail.errors.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Событие не найдено или без контента в API.
        </div>
      ) : null}
      <AdminEventEditor detail={detail} notice={noticeFromSearch(rawSearch)} />
    </div>
  );
}
