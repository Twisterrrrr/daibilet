'use client';

import { useState } from 'react';

import { saveAdminEventVenueLinksAction } from '@/server/admin-event-actions';
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

export function AdminEventVenueLinksForm({ eventId, venueLinks }: Props) {
  const [rows, setRows] = useState<LinkRow[]>(() => toRows(venueLinks));

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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Добавить строку
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
