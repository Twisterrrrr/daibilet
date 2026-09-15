import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminArticleEditor } from '@/components/admin/AdminArticleEditor';
import { loadAdminArticleDetail } from '@/server/admin-articles-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminArticleEditPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const query = await searchParams;
  const { article, errors } = await loadAdminArticleDetail(id);

  let notice: string | null = null;
  if (first(query.saved) === '1') notice = 'Статья сохранена.';
  if (first(query.archived) === '1') notice = 'Статья отправлена в архив.';

  if (!article) {
    return (
      <div className="space-y-4">
        <AdminApiErrorBanner errors={errors.length ? errors : [`Статья ${id} не найдена`]} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminApiErrorBanner errors={errors} />
      <AdminArticleEditor mode="edit" article={article} notice={notice} />
    </div>
  );
}
