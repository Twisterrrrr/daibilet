import { AdminRewritePublish } from '@/components/admin/AdminRewritePublish.client';
import { loadRewriteQueue } from '@/server/admin-rewrite-data';

export const dynamic = 'force-dynamic';

/**
 * Publication list. Approval and publication are deliberately different screens:
 * the editor works in /admin/rewrite-queue, the approved batch waits here for its
 * publication window. STALE rows appear here too - "approved, but the input
 * changed" - with publishing disabled until they are regenerated.
 */
export default async function AdminRewritePublishPage() {
  const [approved, stale] = await Promise.all([loadRewriteQueue('APPROVED'), loadRewriteQueue('STALE')]);
  const items = [...approved.items, ...stale.items];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Публикация AI-рерайтов</h1>
        <p className="mt-1 text-sm text-slate-500">
          Одобренные ревизии, ждущие публикации. Только отсюда текст уходит на публичную страницу.
          Устаревшие ревизии (вход изменился после одобрения) публиковать нельзя - нужна новая генерация.
        </p>
      </header>
      <AdminRewritePublish items={items} />
    </div>
  );
}
