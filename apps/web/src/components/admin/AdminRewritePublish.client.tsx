'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { RewriteQueueItem } from '@/components/admin/AdminRewriteQueue.client';
import { publishRewriteAction } from '@/server/admin-rewrite-actions';

type Props = {
  items: RewriteQueueItem[];
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Одобрено',
  STALE: 'Устарело (нужна новая генерация)',
};

/**
 * Publication list: approved revisions waiting for their window. Separate from the
 * work queue on purpose - approval is batched editorial work, publication is a
 * deliberate external action, and STALE belongs here ("approved, but the input
 * changed") rather than among drafts in progress.
 */
export function AdminRewritePublish({ items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function publish(item: RewriteQueueItem) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await publishRewriteAction(item.id);
      if (!result.ok) {
        setError(result.error || 'Публикация не выполнена');
        return;
      }
      setNotice(`Опубликовано: ${item.eventTitle || item.eventId}`);
      router.refresh();
    });
  }

  if (!items.length) {
    return <p className="text-sm text-slate-500">Одобренных ревизий, ждущих публикации, нет.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Событие</th>
              <th className="px-3 py-2">Город</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Текст к публикации</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 font-medium text-slate-900">{item.eventTitle || item.eventId}</td>
                <td className="px-3 py-2 text-slate-600">{item.city || '-'}</td>
                <td className="px-3 py-2 text-slate-600">{STATUS_LABELS[item.status] || item.status}</td>
                <td className="px-3 py-2 text-slate-600">
                  <span className="block max-w-[520px] whitespace-pre-wrap">{item.finalText || item.draftText || '-'}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending || item.status !== 'APPROVED'}
                    onClick={() => publish(item)}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Опубликовать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
