import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminLandingEditor } from '@/components/admin/AdminLandingEditor';
import { loadAdminLandingDetail } from '@/server/admin-landings-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function noticeFromSearch(raw: Record<string, string | string[] | undefined>): string | null {
  if (first(raw.saved) === 'seo') return 'SEO лендинга сохранён.';
  const match = first(raw.match);
  if (match === 'PINNED') return 'Событие закреплено.';
  if (match === 'EXCLUDED') return 'Событие скрыто.';
  if (match === 'REVIEW') return 'Событие возвращено к авто-матчу.';
  return null;
}

export default async function AdminLandingDetailPage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const rawSearch = await searchParams;
  const data = await loadAdminLandingDetail(slug);

  return (
    <div className="space-y-4">
      <AdminApiErrorBanner errors={data.errors} />
      <AdminLandingEditor detail={data} notice={noticeFromSearch(rawSearch)} />
    </div>
  );
}
