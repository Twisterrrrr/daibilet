import type { AdminEventDetailData } from '@/server/admin-events-data';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';

type Props = { detail: AdminEventDetailData };

const EVENT_KIND_LABELS: Record<string, string> = {
  SINGLE: 'Разовое',
  RECURRING: 'Повторяющееся',
  OPEN_DATE: 'С открытой датой',
};

const MANAGEMENT_LABELS: Record<string, string> = {
  SOURCE_MANAGED: 'Управляется источником',
  DAIBILET_MANAGED: 'Управляется Дайбилет',
  SUPPLIER_DRAFTS: 'Черновики поставщика',
  SUPPLIER_SELF_SERVICE: 'Кабинет поставщика',
};

const SOURCE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  PUBLIC: 'В продаже',
  SOLD_OUT: 'Билеты закончились',
  CANCELLED: 'Отменено',
  INACTIVE: 'Неактивно',
  DRAFT: 'Черновик',
};

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function AdminEventSchedulePanel({ detail }: Props) {
  const kind = detail.event.kind;
  const sessions = detail.sessions;
  const isOpenDate = kind === 'OPEN_DATE';

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Расписание события</h3>
          <p className="mt-1 text-xs text-slate-500">
            {kind ? EVENT_KIND_LABELS[kind] : 'Формат расписания не указан'}
            {detail.event.scheduleLocked === true ? ' · изменение расписания заблокировано' : ''}
          </p>
        </div>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          Только просмотр: серверное управление расписанием пока не подключено
        </span>
      </div>

      {isOpenDate ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Действует с" value={detail.event.openDateValidFrom ? formatAdminDateTime(detail.event.openDateValidFrom) : null} />
          <Metric label="Действует до" value={detail.event.openDateValidTo ? formatAdminDateTime(detail.event.openDateValidTo) : null} />
          <Metric label="Срок действия" value={detail.event.openDateValidDays} suffix="дн." />
          <div className="sm:col-span-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            Для открытой даты сеансов нет. Покупатель выбирает время посещения по правилам площадки.
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Сеансов" value={detail.summary.slots} />
            <Metric label="Вместимость события" value={detail.event.defaultCapacityTotal} />
            <Metric label="Свободно по источнику" value={detail.summary.vacant} />
            <Metric label="Продано билетов" value={detail.sales.soldTickets} />
          </div>
          {kind === 'RECURRING' ? <RecurringPattern detail={detail} /> : null}
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Дата и время</th>
                  <th className="px-3 py-2 font-medium">Состояние</th>
                  <th className="px-3 py-2 font-medium">Вместимость</th>
                  <th className="px-3 py-2 font-medium">Продано</th>
                  <th className="px-3 py-2 font-medium">Свободно</th>
                  <th className="px-3 py-2 font-medium">Цена от</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Сеансы не переданы в текущий источник данных.</td></tr>
                ) : sessions.map((session) => (
                  <tr key={session.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{formatAdminDateTime(session.startsAt)}{session.endsAt ? ` — ${formatAdminDateTime(session.endsAt)}` : ''}</td>
                    <td className="px-3 py-2">{session.cancelledAt ? 'Отменён' : session.isActive === false ? 'Неактивен' : localizeStatus(session.sourceStatus)}</td>
                    <td className="px-3 py-2">{formatNullable(session.capacityTotal)}</td>
                    <td className="px-3 py-2">{formatNullable(session.capacitySold)}</td>
                    <td className="px-3 py-2">{formatNullable(session.vacant)}</td>
                    <td className="px-3 py-2">{session.priceFrom == null ? '—' : `${formatAdminNumber(session.priceFrom)} ₽`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function AdminEventSalesPanel({ detail }: Props) {
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Тарифы и предложения источников</h3>
            <p className="mt-1 text-xs text-slate-500">В текущей модели предложения не связаны с сеансами как категории билетов.</p>
          </div>
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">Только просмотр</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Заказов" value={detail.sales.orders} />
          <Metric label="Продано билетов" value={detail.sales.soldTickets} />
          <Metric label="Цена от" value={detail.summary.priceFrom} suffix="₽" />
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium">Источник</th>
                <th className="px-3 py-2 font-medium">Цена</th>
                <th className="px-3 py-2 font-medium">Квота</th>
                <th className="px-3 py-2 font-medium">Продажа</th>
              </tr>
            </thead>
            <tbody>
              {detail.offers.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Тарифы не переданы в текущий источник данных.</td></tr>
              ) : detail.offers.map((offer) => (
                <tr key={offer.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{offer.title || 'Без названия'}</td>
                  <td className="px-3 py-2">{localizeSource(offer.sourceCode)}</td>
                  <td className="px-3 py-2">{offer.priceRub == null ? '—' : `${formatAdminNumber(offer.priceRub)} ₽`}{offer.oldPriceRub != null ? <span className="ml-2 text-xs text-slate-400 line-through">{formatAdminNumber(offer.oldPriceRub)} ₽</span> : null}</td>
                  <td className="px-3 py-2">{formatNullable(offer.capacityTotal)}</td>
                  <td className="px-3 py-2">{offer.active ? 'Активна' : 'Остановлена'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Продажи по статусам билетов</h3>
        {detail.sales.ticketStatuses.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.sales.ticketStatuses.map((row) => <span key={row.status} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{localizeStatus(row.status)}: {formatAdminNumber(row.tickets)}</span>)}
          </div>
        ) : <p className="mt-2 text-sm text-slate-500">Статистика по статусам не передана.</p>}
      </section>
    </div>
  );
}

export function AdminEventSourcePanel({ detail }: Props) {
  const problems = detail.source.problems.length ? detail.source.problems : detail.publishBlockers;
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Источник и управление</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Источник данных" value={localizeSource(detail.source.sourceLabel)} />
          <Row label="Способ управления" value={detail.event.managementMode ? MANAGEMENT_LABELS[detail.event.managementMode] || 'Неизвестно' : 'Не указан'} />
          <Row label="Способ покупки" value={detail.event.purchaseFlow === 'PLATFORM' ? 'Оплата на Дайбилет' : detail.event.purchaseFlow === 'EXTERNAL' ? 'Покупка на стороне источника' : 'Не указан'} />
          <Row label="Статус источника" value={localizeStatus(detail.source.status)} />
          <Row label="Свободно билетов" value={detail.source.vacant == null ? '—' : formatAdminNumber(detail.source.vacant)} />
          <Row label="Можно купить" value={detail.source.purchaseReady == null ? 'Неизвестно' : detail.source.purchaseReady ? 'Да' : 'Нет'} />
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Диагностика</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {problems.length === 0 ? <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">Замечаний нет</span> : problems.map((problem) => <span key={problem} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">{problem}</span>)}
        </div>
      </div>
    </div>
  );
}

function RecurringPattern({ detail }: Props) {
  const mask = detail.offers.find((offer) => offer.weekdayMask != null)?.weekdayMask;
  const weekdays = mask == null ? [] : DAY_LABELS.filter((_, day) => (mask & (1 << day)) !== 0);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs font-medium text-slate-700">Повторение</div>
      <div className="mt-1 text-sm text-slate-900">{weekdays.length ? weekdays.join(', ') : 'Шаблон дней недели не указан в данных'}</div>
      <div className="mt-1 text-xs text-slate-500">Слоты показаны ниже списком. Календарная сетка и массовое управление требуют отдельного backend API.</div>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number | string | null; suffix?: string }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="text-base font-semibold tabular-nums text-slate-900">{value == null ? '—' : typeof value === 'number' ? `${formatAdminNumber(value)}${suffix ? ` ${suffix}` : ''}` : value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-slate-50 py-1"><dt className="text-xs text-slate-500">{label}</dt><dd className="text-right text-slate-800">{value}</dd></div>;
}

function formatNullable(value: number | null) { return value == null ? '—' : formatAdminNumber(value); }
function localizeSource(value: string | null) {
  const key = String(value || '').toUpperCase();
  if (key.includes('TICKETSCLOUD')) return 'Ticketscloud';
  if (key.includes('TEPLOHOD')) return 'Teplohod.info';
  if (key.includes('MANUAL')) return 'Создано вручную';
  return value || 'Не указан';
}
function localizeStatus(value: string | null) {
  const key = String(value || '').toUpperCase();
  return SOURCE_STATUS_LABELS[key] || (key === 'UNKNOWN' || !key ? 'Не указан' : key.replaceAll('_', ' ').toLocaleLowerCase('ru-RU'));
}
