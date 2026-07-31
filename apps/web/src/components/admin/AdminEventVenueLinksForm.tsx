'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  fetchAdminVenueLinkSuggestionsAction,
  saveAdminEventVenueLinksAction,
  type VenueLinkSuggestion,
} from '@/server/admin-event-actions';
import type { AdminEventDetailData } from '@/server/admin-events-data';

type LinkRow = {
  venueId: string;
  label: string;
  sortOrder: string;
};

type Props = {
  eventId: string;
  venueLinks: AdminEventDetailData['venueLinks'];
};

function toRows(links: AdminEventDetailData['venueLinks']): LinkRow[] {
  if (!links.length) {
    return [{ venueId: '', label: '', sortOrder: '0' }];
  }
  return links.map((link, index) => ({
    venueId: link.venueId || link.slug || '',
    label: link.label || '',
    sortOrder: String(link.sortOrder ?? index),
  }));
}

function confidenceBadgeClass(confidence: VenueLinkSuggestion['confidence']) {
  if (confidence === 'high') return 'bg-emerald-50 text-emerald-800';
  if (confidence === 'medium') return 'bg-amber-50 text-amber-900';
  return 'bg-slate-100 text-slate-600';
}

export function AdminEventVenueLinksForm({ eventId, venueLinks }: Props) {
  const [rows, setRows] = useState<LinkRow[]>(() => toRows(venueLinks));
  const [suggestions, setSuggestions] = useState<VenueLinkSuggestion[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestReason, setSuggestReason] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const existingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      const value = row.venueId.trim();
      if (value) ids.add(value);
    }
    for (const link of venueLinks) {
      if (link.venueId) ids.add(link.venueId);
      if (link.slug) ids.add(link.slug);
    }
    return ids;
  }, [rows, venueLinks]);

  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter(
        (item) => !existingIds.has(item.venueId) && !(item.slug && existingIds.has(item.slug)),
      ),
    [suggestions, existingIds],
  );

  function updateRow(index: number, patch: Partial<LinkRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { venueId: '', label: '', sortOrder: String(current.length) },
    ]);
  }

  function removeRow(index: number) {
    setRows((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length ? next : [{ venueId: '', label: '', sortOrder: '0' }];
    });
  }

  function loadSuggestions() {
    setSuggestError(null);
    setSuggestReason(null);
    startTransition(async () => {
      const result = await fetchAdminVenueLinkSuggestionsAction(eventId, 300);
      if (!result.ok) {
        setSuggestError(result.error || 'Не удалось подобрать');
        setSuggestions([]);
        setSuggestOpen(true);
        return;
      }
      setSuggestions(result.suggestions);
      setSuggestReason(result.reason || null);
      setSelected({});
      setSuggestOpen(true);
    });
  }

  function addSelectedSuggestions() {
    const picked = visibleSuggestions.filter((item) => selected[item.venueId]);
    if (!picked.length) return;
    setRows((current) => {
      const filled = current.filter((row) => row.venueId.trim());
      const baseOrder = filled.length;
      const additions = picked.map((item, index) => ({
        venueId: item.venueId,
        label: '',
        sortOrder: String(baseOrder + index),
      }));
      const next = [...filled, ...additions];
      return next.length ? next : [{ venueId: '', label: '', sortOrder: '0' }];
    });
    setSelected({});
    setSuggestOpen(false);
  }

  return (
    <form
      action={saveAdminEventVenueLinksAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={eventId} />
      {rows.map((row, index) => (
        <div key={`link-row-${index}`}>
          <input type="hidden" name="venueIds" value={row.venueId} />
          <input type="hidden" name="labels" value={row.label} />
          <input type="hidden" name="sortOrders" value={row.sortOrder} />
        </div>
      ))}

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Места маршрута (STOP)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Явные остановки экскурсии через EventVenueRouteItem. Точка старта (Event.venueId) здесь не
          меняется - только доп. площадки.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={`row-ui-${index}`}
            className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_auto]"
          >
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">venueId или slug</span>
              <input
                value={row.venueId}
                onChange={(event) => updateRow(index, { venueId: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
                placeholder="venue_… или naberezhnaya-kamy"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Подпись (опционально)</span>
              <input
                value={row.label}
                onChange={(event) => updateRow(index, { label: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Остановка у памятника"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Порядок</span>
              <input
                value={row.sortOrder}
                onChange={(event) => updateRow(index, { sortOrder: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums"
                inputMode="numeric"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Удалить
              </button>
            </div>
            {venueLinks[index]?.title ? (
              <p className="md:col-span-4 text-xs text-slate-500">
                Сейчас: {venueLinks[index].title}
                {venueLinks[index].slug ? ` · ${venueLinks[index].slug}` : ''}
                {venueLinks[index].kind ? ` · ${venueLinks[index].kind}` : ''}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {suggestOpen ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Кандидаты рядом (STOP)</p>
            <button
              type="button"
              onClick={() => setSuggestOpen(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Скрыть
            </button>
          </div>
          {suggestError ? <p className="mt-2 text-xs text-rose-700">{suggestError}</p> : null}
          {suggestReason === 'start_venue_missing_coords' ? (
            <p className="mt-2 text-xs text-amber-800">
              У точки старта нет координат - подбор невозможен.
            </p>
          ) : null}
          {!suggestError && !visibleSuggestions.length ? (
            <p className="mt-2 text-xs text-slate-600">Нет новых кандидатов в радиусе.</p>
          ) : null}
          {visibleSuggestions.length ? (
            <ul className="mt-3 space-y-2">
              {visibleSuggestions.map((item) => (
                <li key={item.venueId} className="flex items-start gap-2 text-sm">
                  <input
                    id={`suggest-${item.venueId}`}
                    type="checkbox"
                    checked={Boolean(selected[item.venueId])}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [item.venueId]: event.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <label htmlFor={`suggest-${item.venueId}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="font-medium text-slate-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {item.kind || '—'} · {item.distanceMeters} м · {item.slug || item.venueId}
                    </span>
                  </label>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceBadgeClass(item.confidence)}`}
                  >
                    {item.confidence}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {visibleSuggestions.length ? (
            <button
              type="button"
              onClick={addSelectedSuggestions}
              className="mt-3 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
            >
              Добавить выбранные в форму
            </button>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-500">
            В форму без автосохранения. Сохраните места маршрута отдельно. Только STOP; старт не меняется.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Добавить строку
        </button>
        <button
          type="button"
          onClick={loadSuggestions}
          disabled={pending}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
        >
          {pending ? 'Подбираем…' : 'Подобрать рядом'}
        </button>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Сохранить места маршрута
        </button>
      </div>
    </form>
  );
}
