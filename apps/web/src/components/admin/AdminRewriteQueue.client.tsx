'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  approveRewriteAction,
  generateRewriteDraftsAction,
  rejectRewriteAction,
} from '@/server/admin-rewrite-actions';

export type RewriteQueueItem = {
  id: string;
  eventId: string;
  status: string;
  priority: string | null;
  sourceText: string;
  draftText: string | null;
  finalText: string | null;
  model: string | null;
  qaFlags: Array<{ code: string; message: string }>;
  eventTitle: string | null;
  eventSlug: string | null;
  city: string | null;
  updatedAt: string | Date;
};

type Props = {
  items: RewriteQueueItem[];
  counts: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'В очереди',
  GENERATED: 'Черновик (есть флаги)',
  CHECKED: 'Черновик проверен',
  APPROVED: 'Одобрено (ждёт публикации)',
  STALE: 'Устарел',
  PUBLISHED: 'Опубликован',
};

const PRIORITY_LABELS: Record<string, string> = { A: 'Приоритет A', B: 'Приоритет B' };

export function AdminRewriteQueue({ items, counts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [limit, setLimit] = useState(10);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function run(action: () => Promise<{ ok: boolean; error?: string; generated?: number }>, success: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error || 'Действие не выполнено');
        return;
      }
      setNotice('generated' in result ? `${success}: ${result.generated ?? 0}` : success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-slate-600" htmlFor="rewrite-limit">
          Черновиков за раз:
        </label>
        <input
          id="rewrite-limit"
          type="number"
          min={1}
          max={50}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value) || 10)}
          className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => generateRewriteDraftsAction(limit), 'Сгенерировано черновиков')}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Сгенерировать черновики AI
        </button>
        <div className="ml-auto flex flex-wrap gap-2 text-xs text-slate-600">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <span key={status} className="rounded-md bg-slate-100 px-2 py-1">
              {label}: <strong>{counts[status] || 0}</strong>
            </span>
          ))}
        </div>
      </div>

      {notice ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <p className="text-xs text-slate-500">
        Правило: черновик публикуется только после подтверждения редактором. Тексты с флагами QA требуют ручной
        проверки фактов.
      </p>

      <div className="space-y-4">
        {items.length === 0 ? <p className="text-sm text-slate-500">Очередь пуста.</p> : null}
        {items.map((item) => {
          const current = drafts[item.id] ?? item.draftText ?? item.finalText ?? '';
          return (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <header className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {STATUS_LABELS[item.status] || item.status}
                </span>
                {item.priority ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {PRIORITY_LABELS[item.priority] || item.priority}
                  </span>
                ) : null}
                <a href={`/admin/events/${item.eventId}`} className="text-sm font-semibold text-slate-800 hover:underline">
                  {item.eventTitle || item.eventId}
                </a>
                <span className="text-xs text-slate-500">{item.city || ''}</span>
                {item.eventSlug ? (
                  <a href={`/events/${item.eventSlug}`} target="_blank" rel="noreferrer" className="ml-auto text-xs text-sky-700 hover:underline">
                    Открыть карточку
                  </a>
                ) : null}
              </header>

              {item.qaFlags.length ? (
                <ul className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {item.qaFlags.map((flag) => (
                    <li key={flag.code}>
                      <strong>{flag.code}</strong>: {flag.message}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Было (фид)</h3>
                  <p className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                    {item.sourceText || '—'}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Стало (черновик AI)</h3>
                  <textarea
                    value={current}
                    disabled={item.status === 'PUBLISHED'}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    className="min-h-40 w-full rounded-md border border-slate-200 p-3 text-xs leading-5"
                  />
                </div>
              </div>

              {item.status !== 'PUBLISHED' ? (
                <footer className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending || !current.trim()}
                    onClick={() =>
                      run(
                        () => approveRewriteAction(item.id, drafts[item.id] !== undefined ? drafts[item.id] : undefined),
                        'Рерайт опубликован',
                      )
                    }
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Одобрить и опубликовать
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => rejectRewriteAction(item.id), 'Черновик возвращён в очередь')}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                </footer>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}