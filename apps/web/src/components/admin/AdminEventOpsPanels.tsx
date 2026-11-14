import type { AdminEventDetailData } from '@/server/admin-events-data';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';

type Props = {
  detail: AdminEventDetailData;
};

export function AdminEventOpsPanels({ detail }: Props) {
  return (
    <div className="space-y-4">
      <SchedulePanel detail={detail} />
      <SalesPanel detail={detail} />
      <SourcePanel detail={detail} />
    </div>
  );
}

function SchedulePanel({ detail }: Props) {
  const sessions = detail.sessions.length
    ? detail.sessions
    : [
        {
          id: `${detail.id}:fallback`,
          startsAt: null,
          sourceStatus: detail.source.status,
          priceFrom: detail.summary.priceFrom,
          vacant: detail.summary.vacant,
          externalId: null,
        },
      ];

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Расписание / слоты</h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Слотов" value={detail.summary.slots || sessions.length} />
        <Metric label="Остаток source" value={detail.summary.vacant} />
        <Metric label="Строк офера" value={detail.summary.offers} />
        <Metric label="Цена от" value={detail.summary.priceFrom} suffix="₽" />
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Дата</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium">Цена</th>
              <th className="px-3 py-2 font-medium">Остаток</th>
              <th className="px-3 py-2 font-medium">Внешний ID</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{formatAdminDateTime(session.startsAt)}</td>
                <td className="px-3 py-2 text-xs">{session.sourceStatus || '—'}</td>
                <td className="px-3 py-2">
                  {session.priceFrom == null ? '—' : `${formatAdminNumber(session.priceFrom)} ₽`}
                </td>
                <td className="px-3 py-2">{formatAdminNumber(session.vacant)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">
                  {session.externalId || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SalesPanel({ detail }: Props) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Продажи / оферы</h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Заказов" value={detail.sales.orders || detail.summary.orders} />
        <Metric label="Билетов" value={detail.sales.soldTickets || detail.summary.soldTickets} />
        <Metric label="Остаток" value={detail.summary.vacant} />
        <Info
          label="Offer status"
          value={detail.source.offerStatus || '—'}
        />
      </div>
      {detail.sales.ticketStatuses.length ? (
        <div className="flex flex-wrap gap-2">
          {detail.sales.ticketStatuses.map((row) => (
            <span
              key={row.status}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              {row.status}: {formatAdminNumber(row.tickets)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Офер</th>
              <th className="px-3 py-2 font-medium">Источник</th>
              <th className="px-3 py-2 font-medium">Цена</th>
              <th className="px-3 py-2 font-medium">Активен</th>
              <th className="px-3 py-2 font-medium">Ссылка</th>
            </tr>
          </thead>
          <tbody>
            {detail.offers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Нет оферов в зеркале.
                </td>
              </tr>
            ) : (
              detail.offers.map((offer) => {
                const href = offer.widgetUrl || offer.deeplinkUrl;
                return (
                  <tr key={offer.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{offer.title || offer.id}</td>
                    <td className="px-3 py-2 text-xs">{offer.sourceCode || '—'}</td>
                    <td className="px-3 py-2">
                      {offer.priceRub == null ? '—' : `${formatAdminNumber(offer.priceRub)} ₽`}
                    </td>
                    <td className="px-3 py-2 text-xs">{offer.active ? 'да' : 'нет'}</td>
                    <td className="px-3 py-2">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-700 hover:underline"
                        >
                          открыть
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SourcePanel({ detail }: Props) {
  const problems = detail.source.problems.length
    ? detail.source.problems
    : detail.publishBlockers;
  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Источник / импорт</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Источник" value={detail.source.sourceLabel || '—'} />
          <Row label="Категория каталога" value={detail.source.proposedCategory || '—'} />
          <Row label="Статус source" value={detail.source.status || '—'} />
          <Row
            label="Свободно билетов"
            value={
              detail.source.vacant == null ? '—' : formatAdminNumber(detail.source.vacant)
            }
          />
          <Row
            label="Purchase ready"
            value={
              detail.source.purchaseReady == null
                ? '—'
                : detail.source.purchaseReady
                  ? 'да'
                  : 'нет'
            }
          />
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Диагностика</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {problems.length === 0 ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
              нет проблем
            </span>
          ) : (
            problems.map((problem) => (
              <span
                key={problem}
                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900"
              >
                {problem}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="text-lg font-semibold tabular-nums text-slate-900">
        {value == null ? '—' : `${formatAdminNumber(value)}${suffix ? ` ${suffix}` : ''}`}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="truncate text-sm font-medium text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 py-1">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}
