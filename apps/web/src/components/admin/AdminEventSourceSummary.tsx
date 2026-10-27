import type { AdminEventDetailData } from '@/server/admin-events-data';

type SummaryRow = {
  field: string;
  source: string;
  override: string | null;
};

function clip(value: string | null, limit = 140): string {
  if (!value) return '—';
  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

/**
 * Source vs override comparison: shows what the import brought and what the
 * operator changed on top. An empty override means "same as source" for these
 * content fields; taxonomy and other catalog data are managed in their own panels.
 */
export function AdminEventSourceSummary({ detail }: { detail: AdminEventDetailData }) {
  const override = detail.override;
  const rows: SummaryRow[] = [
    { field: 'Заголовок', source: detail.sourceTitle, override: override.title || null },
    {
      field: 'Короткое описание',
      source: 'не передаётся отдельно',
      override: override.shortDescription ? clip(override.shortDescription, 80) : null,
    },
    {
      field: 'Описание',
      source: clip(detail.sourceDescription),
      override: override.description ? clip(override.description) : null,
    },
    {
      field: 'Изображение',
      source: detail.sourceImageUrl || '—',
      override: override.imageUrl || null,
    },
  ];
  const changedCount = rows.filter((row) => row.override != null).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Источник и правки</h3>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
          изменено полей: {changedCount} из {rows.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Пустая правка означает «как в источнике». Таблица сравнивает только текст и изображение.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Поле</th>
              <th className="px-3 py-2 font-medium">В источнике</th>
              <th className="px-3 py-2 font-medium">Правка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2 font-medium text-slate-900">{row.field}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{row.source || '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {row.override != null ? (
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                      {row.override}
                    </span>
                  ) : (
                    <span className="text-slate-400">как в источнике</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
