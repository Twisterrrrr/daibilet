'use client';

import { useState, useTransition } from 'react';

import { rewriteAdminEventDescriptionAction } from '@/server/admin-event-actions';

type Props = {
  eventId: string;
  sourceDescription: string | null;
  initialDescription: string;
};

export function AdminEventDescriptionRewrite({
  eventId,
  sourceDescription,
  initialDescription,
}: Props) {
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const source = String(sourceDescription || '').trim();

  function onRewrite() {
    setError(null);
    setHint(null);
    startTransition(async () => {
      const result = await rewriteAdminEventDescriptionAction(eventId);
      if (!result.ok || !result.text) {
        setError(result.error || 'Не удалось сгенерировать рерайт');
        return;
      }
      setDescription(result.text);
      const notes: string[] = [];
      if (result.sourceUsed === 'override') {
        notes.push('вход: текущий override (source пуст)');
      }
      if (result.truncatedInput) {
        notes.push('исходник усечён по длине');
      }
      setHint(
        notes.length
          ? `Рерайт готов (${notes.join(', ')}). Проверьте и нажмите «Сохранить контент».`
          : 'Рерайт готов. Проверьте и нажмите «Сохранить контент».',
      );
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">Описание (Было / Стало)</span>
        <button
          type="button"
          onClick={onRewrite}
          disabled={pending || (!source && !description.trim())}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            !source && !description.trim()
              ? 'Нет текста для рерайта'
              : 'Сгенерировать уникальный рерайт (не сохраняет в БД)'
          }
        >
          {pending ? 'Генерация…' : 'Сгенерировать рерайт'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">Было (source)</span>
          <textarea
            readOnly
            rows={10}
            value={source || '(пусто — для рерайта будет взят текущий override)'}
            className="w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">Стало (override, редактируемо)</span>
          <textarea
            name="description"
            rows={10}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={source || ''}
            className="w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {hint ? <p className="text-xs text-emerald-700">{hint}</p> : null}
      <p className="text-xs text-slate-500">
        Кнопка рерайта не пишет в БД. В override попадёт только после «Сохранить контент».
      </p>
    </div>
  );
}
