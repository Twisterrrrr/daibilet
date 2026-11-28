'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bookmark, X } from 'lucide-react';

type MyDaySaveScenarioDialogProps = {
  open: boolean;
  defaultName: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (name: string) => boolean;
};

/** Save a named route snapshot in this browser's local storage. */
export function MyDaySaveScenarioDialog({
  open,
  defaultName,
  busy = false,
  onClose,
  onSave,
}: MyDaySaveScenarioDialogProps) {
  const [name, setName] = useState(defaultName);
  const [saveError, setSaveError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setSaveError(false);
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setSaveError(!onSave(trimmed));
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4 print:hidden"
      role="presentation"
      onClick={onClose}
      data-my-day-save-scenario-dialog
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-day-save-scenario-title"
        className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              id="my-day-save-scenario-title"
              className="text-base font-bold text-slate-900"
            >
              Сохранить на этом устройстве
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Маршрут сохранится в этом браузере. Он не появится на других устройствах и не создаст ссылку для друзей.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Название
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Классика за день"
              maxLength={80}
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-400 disabled:opacity-60"
            />
          </label>
          {saveError ? (
            <p role="alert" className="text-sm text-rose-700">
              Не удалось сохранить маршрут в этом браузере. Проверьте свободное место в хранилище и попробуйте ещё раз.
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
