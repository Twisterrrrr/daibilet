import { AdminRewriteQueue } from '@/components/admin/AdminRewriteQueue.client';
import { loadRewriteQueue } from '@/server/admin-rewrite-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminRewriteQueuePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const status = first(raw.status) || '';
  const data = await loadRewriteQueue(status || undefined);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">AI-рерайт описаний</h1>
        <p className="mt-1 text-sm text-slate-500">
          Очередь рерайтов для карточек с тонким или дублирующимся описанием (canon event-rewrite-seo-plan.md).
          Новые импортированные события попадают сюда автоматически после синка; публикация только после
          подтверждения редактором.
        </p>
      </header>
      <AdminRewriteQueue items={data.items} counts={data.counts} />
    </div>
  );
}
