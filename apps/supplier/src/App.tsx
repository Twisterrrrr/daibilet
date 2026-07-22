import * as React from 'react';
import { NavLink, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

import type {
  SupplierPortalDashboardDto,
  SupplierPortalEventsListDto,
  SupplierPortalFinanceDto,
  SupplierPortalOrdersListDto,
  SupplierPortalProfileDto,
  SupplierPortalReviewsListDto,
} from '@daibilet/contracts/supplier';
import { supplierGet } from '@/lib/api';

const STORAGE_KEY = 'daibilet_supplier_key';

const NAV_ITEMS = [
  { to: '/', label: 'Дашборд', icon: '01' },
  { to: '/events', label: 'События', icon: '02' },
  { to: '/orders', label: 'Заказы', icon: '03' },
  { to: '/finance', label: 'Финансы', icon: '04' },
  { to: '/reviews', label: 'Отзывы', icon: '05' },
  { to: '/profile', label: 'Реквизиты', icon: '06' },
];

type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [supplierKey, setSupplierKeyState] = React.useState(() => {
    const fromUrl = searchParams.get('supplier') || searchParams.get('slug') || searchParams.get('supplierId');
    if (fromUrl) return fromUrl;
    return window.localStorage.getItem(STORAGE_KEY) || '';
  });

  const setSupplierKey = React.useCallback((value: string) => {
    setSupplierKeyState(value);
    if (value.trim()) window.localStorage.setItem(STORAGE_KEY, value.trim());
    else window.localStorage.removeItem(STORAGE_KEY);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('supplier', value.trim());
    else next.delete('supplier');
    next.delete('slug');
    next.delete('supplierId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Д</div>
          <div>
            <div className="brand-title">Дайбилет</div>
            <div className="brand-subtitle">Кабинет поставщика</div>
          </div>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
              <span className="nav-index">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-mark">i</span>
          <span>Read-first режим. Изменения и выплаты пока идут через администратора.</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow">Фаза 2</div>
            <h1>Личный кабинет поставщика</h1>
          </div>
          <SupplierSelector value={supplierKey} onChange={setSupplierKey} />
        </header>

        <main className="content">
          {!supplierKey.trim() ? (
            <EmptySetup />
          ) : (
            <Routes>
              <Route index element={<DashboardPage supplierKey={supplierKey} />} />
              <Route path="events" element={<EventsPage supplierKey={supplierKey} />} />
              <Route path="orders" element={<OrdersPage supplierKey={supplierKey} />} />
              <Route path="finance" element={<FinancePage supplierKey={supplierKey} />} />
              <Route path="reviews" element={<ReviewsPage supplierKey={supplierKey} />} />
              <Route path="profile" element={<ProfilePage supplierKey={supplierKey} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

function SupplierSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => setDraft(value), [value]);

  return (
    <form
      className="supplier-selector"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft);
      }}
    >
      <label htmlFor="supplier-key">Поставщик</label>
      <div className="selector-row">
        <input
          id="supplier-key"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="slug или supplierId"
        />
        <button type="submit">Открыть</button>
      </div>
    </form>
  );
}

function DashboardPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalDashboardDto>('/api/supplier/dashboard', supplierKey);

  if (loading && !data) return <LoadingState label="Загружаем дашборд..." />;
  if (error && !data) return <ErrorState title="Не удалось загрузить дашборд" error={error} onRetry={reload} />;
  if (!data) return null;

  const finance = data.summary.finance;
  const events = data.summary.events;
  const orders = data.summary.orders;
  const reviews = data.summary.reviews;

  return (
    <div className="page-stack">
      <PageTitle
        title={data.supplier.title}
        description={`${statusLabel(data.supplier.status)} · ${catalogModeLabel(data.supplier.defaultCatalogMode)} · комиссия ${formatPercentBps(data.supplier.defaultCommissionBps)}`}
        action={<RefreshButton onClick={reload} />}
      />

      <div className="stats-grid">
        <StatCard label="Событий" value={events.total} hint={`${events.published} опубликовано`} />
        <StatCard label="Позиции заказов" value={orders.totalItems} hint={formatMoney(orders.grossKopecks)} />
        <StatCard label="Баланс ledger" value={formatMoney(finance.ledgerBalanceKopecks)} hint={`выплачено ${formatMoney(finance.paidPayoutsKopecks)}`} />
        <StatCard label="Отзывы" value={reviews.total} hint={reviews.averageRating ? `рейтинг ${reviews.averageRating.toFixed(1)}` : 'рейтинга пока нет'} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Готовность к внутреннему checkout</h2>
          <StatusPill tone={data.readiness.canEnableInternalCheckout ? 'success' : 'warning'}>
            {data.readiness.canEnableInternalCheckout ? 'можно включать' : 'нужны настройки'}
          </StatusPill>
        </div>
        <IssueList issues={[...data.readiness.blockers, ...data.readiness.warnings]} empty="Блокеров не найдено." />
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Ближайшие сеансы</h2>
          </div>
          {data.upcomingSessions.length ? (
            <div className="compact-list">
              {data.upcomingSessions.map((session) => (
                <div key={session.id} className="compact-row">
                  <div>
                    <strong>{session.eventTitle}</strong>
                    <span>{formatDateTime(session.startsAt)}</span>
                  </div>
                  <small>{session.capacitySold} продано · {session.ticketsVacant ?? '-'} доступно</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInline text="Ближайших сеансов нет." />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Требует внимания</h2>
          </div>
          {data.eventsNeedingAttention.length ? (
            <div className="compact-list">
              {data.eventsNeedingAttention.map((event) => (
                <div key={event.id} className="compact-row">
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.readinessIssues.map((issue) => issue.label).join(', ')}</span>
                  </div>
                  <StatusPill tone="warning">{event.readinessIssues.length}</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInline text="Критичных замечаний нет." />
          )}
        </section>
      </div>
    </div>
  );
}

function EventsPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalEventsListDto>('/api/supplier/events?limit=50', supplierKey);

  return (
    <div className="page-stack">
      <PageTitle title="События" description="Все карточки, привязанные к поставщику. Редактирование будет через заявки или администратора." action={<RefreshButton onClick={reload} />} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.items.length)}>
        {data ? (
          <Table
            columns={['Событие', 'Статус', 'Город / площадка', 'Расписание', 'Цена', 'Готовность']}
            rows={data.items.map((event) => [
              <div key="event"><strong>{event.title}</strong><small>{event.slug}</small></div>,
              <StatusPill key="status" tone={event.status === 'PUBLISHED' ? 'success' : 'neutral'}>{statusLabel(event.status)}</StatusPill>,
              <div key="place"><span>{event.city.title || '-'}</span><small>{event.venue.title || '-'}</small></div>,
              <div key="schedule"><span>{event.kind === 'OPEN_DATE' ? 'Открытая дата' : formatDateTime(event.nextSessionAt)}</span><small>{event.activeSessions} слотов</small></div>,
              formatRub(event.priceFromRub),
              <IssueList key="issues" compact issues={event.readinessIssues} empty="готово" />,
            ])}
          />
        ) : null}
      </DataState>
    </div>
  );
}

function OrdersPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalOrdersListDto>('/api/supplier/orders?limit=50', supplierKey);

  return (
    <div className="page-stack">
      <PageTitle title="Заказы" description="Позиции внутреннего checkout. Заказы через внешние виджеты остаются в билетных системах." action={<RefreshButton onClick={reload} />} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.items.length)}>
        {data ? (
          <Table
            columns={['Заказ', 'Событие', 'Покупатель', 'Билеты', 'Сумма', 'Статус']}
            rows={data.items.map((order) => [
              <div key="order"><strong>{order.publicCode || '-'}</strong><small>{formatDateTime(order.createdAt)}</small></div>,
              <div key="event"><span>{order.eventTitle || order.title}</span><small>{formatDateTime(order.startsAt)}</small></div>,
              <div key="buyer"><span>{order.buyerName || '-'}</span><small>{order.buyerEmail || ''}</small></div>,
              <div key="tickets"><span>{order.quantity} шт.</span><small>{order.ticketTitle || '-'}</small></div>,
              formatMoney(order.totalKopecks),
              <StatusPill key="status" tone={order.status === 'FULFILLED' || order.status === 'CONFIRMED' ? 'success' : 'neutral'}>{orderStatusLabel(order.status)}</StatusPill>,
            ])}
          />
        ) : null}
      </DataState>
    </div>
  );
}

function FinancePage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalFinanceDto>('/api/supplier/finance', supplierKey);

  return (
    <div className="page-stack">
      <PageTitle title="Финансы" description="Read-only ledger, выплаты и сверка. Заявки на вывод будут отдельным write-flow." action={<RefreshButton onClick={reload} />} />
      {data ? (
        <div className="stats-grid">
          <StatCard label="Баланс" value={formatMoney(data.summary.ledgerBalanceKopecks)} hint="по ledger" />
          <StatCard label="Продажи" value={formatMoney(data.summary.saleKopecks)} hint="gross" />
          <StatCard label="Комиссия" value={formatMoney(data.summary.commissionKopecks)} hint="Daibilet" />
          <StatCard label="Выплачено" value={formatMoney(data.summary.paidPayoutsKopecks)} hint="payouts" />
        </div>
      ) : null}
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.ledger.length)}>
        {data ? (
          <Table
            columns={['Дата', 'Тип', 'Сумма', 'Основание', 'Комментарий']}
            rows={data.ledger.map((entry) => [
              formatDateTime(entry.createdAt),
              ledgerTypeLabel(entry.type),
              formatMoney(entry.amountKopecks),
              entry.referenceType || '-',
              entry.note || '-',
            ])}
          />
        ) : null}
      </DataState>
    </div>
  );
}

function ReviewsPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalReviewsListDto>('/api/supplier/reviews?limit=50', supplierKey);

  return (
    <div className="page-stack">
      <PageTitle title="Отзывы" description="Отзывы и ответы поставщика. На первом этапе только чтение и контроль очереди." action={<RefreshButton onClick={reload} />} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.items.length)}>
        {data ? (
          <Table
            columns={['Оценка', 'Отзыв', 'Событие', 'Ответ', 'Статус']}
            rows={data.items.map((review) => [
              `${review.rating}/5`,
              <div key="text"><strong>{review.authorName}</strong><small>{review.text}</small></div>,
              review.eventTitle || '-',
              review.supplierResponseStatus ? responseStatusLabel(review.supplierResponseStatus) : 'нет',
              <StatusPill key="status" tone={review.status === 'APPROVED' ? 'success' : 'neutral'}>{reviewStatusLabel(review.status)}</StatusPill>,
            ])}
          />
        ) : null}
      </DataState>
    </div>
  );
}

function ProfilePage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalProfileDto>('/api/supplier/profile', supplierKey);

  if (loading && !data) return <LoadingState label="Загружаем реквизиты..." />;
  if (error && !data) return <ErrorState title="Не удалось загрузить профиль" error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="page-stack">
      <PageTitle title="Реквизиты" description="Юридический профиль, банковские счета, команда и площадки." action={<RefreshButton onClick={reload} />} />
      <div className="two-column">
        <section className="panel">
          <div className="panel-header"><h2>Юридический профиль</h2></div>
          <DefinitionList rows={[
            ['Статус', data.legal.status || '-'],
            ['Юрлицо', data.legal.legalName || '-'],
            ['ИНН', data.legal.inn || '-'],
            ['КПП', data.legal.kpp || '-'],
            ['Налоговый режим', data.legal.taxMode || '-'],
            ['Email финансов', data.legal.financeEmail || '-'],
          ]} />
        </section>
        <section className="panel">
          <div className="panel-header"><h2>Счета</h2></div>
          {data.bankAccounts.length ? (
            <div className="compact-list">
              {data.bankAccounts.map((account) => (
                <div key={account.id} className="compact-row">
                  <div>
                    <strong>{account.bankName || 'Банк не указан'}</strong>
                    <span>{account.accountMask || '-'}</span>
                  </div>
                  {account.isPrimary ? <StatusPill tone="success">основной</StatusPill> : null}
                </div>
              ))}
            </div>
          ) : <EmptyInline text="Счета не добавлены." />}
        </section>
      </div>
      <section className="panel">
        <div className="panel-header"><h2>Площадки</h2></div>
        <div className="chip-row">
          {data.venues.length ? data.venues.map((venue) => <span key={venue.id} className="chip">{venue.title} · {venue.cityTitle || 'город не указан'}</span>) : <EmptyInline text="Площадки не привязаны." />}
        </div>
      </section>
    </div>
  );
}

function useSupplierResource<T>(path: string, supplierKey: string): ResourceState<T> & { reload: () => void } {
  const [state, setState] = React.useState<ResourceState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    supplierGet<T>(path, supplierKey, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, loading: false, error: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [path, supplierKey, tick]);

  return { ...state, reload: () => setTick((value) => value + 1) };
}

function PageTitle({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="ghost-button" onClick={onClick}>
      <span className="refresh-mark">↻</span>
      Обновить
    </button>
  );
}

function DataState({ loading, error, hasData, onRetry, children }: { loading: boolean; error: string | null; hasData: boolean; onRetry: () => void; children: React.ReactNode }) {
  if (loading && !hasData) return <LoadingState label="Загружаем данные..." />;
  if (error && !hasData) return <ErrorState title="Backend недоступен" error={error} onRetry={onRetry} />;
  if (!hasData) return <EmptyInline text="Данных пока нет." />;
  return <>{children}</>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="state-card">{label}</div>;
}

function ErrorState({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  return (
    <div className="state-card error">
      <strong>{title}</strong>
      <span>{error}</span>
      <button type="button" onClick={onRetry}>Повторить</button>
    </div>
  );
}

function EmptySetup() {
  return (
    <div className="setup-card">
      <div className="setup-mark">ЛК</div>
      <h2>Укажите slug или id поставщика</h2>
      <p>Пока нет полноценной авторизации поставщика, кабинет открывает данные строго по указанному поставщику и защищен backend Basic Auth в production.</p>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="empty-inline">{text}</div>;
}

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DefinitionList({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="definition-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IssueList({ issues, empty, compact = false }: { issues: Array<{ code: string; label: string; severity: string }>; empty: string; compact?: boolean }) {
  if (!issues.length) return <span className={compact ? 'muted' : 'empty-inline'}>{empty}</span>;
  return (
    <div className={compact ? 'issue-list compact' : 'issue-list'}>
      {issues.slice(0, compact ? 2 : 8).map((issue) => (
        <StatusPill key={issue.code} tone={issue.severity === 'high' ? 'danger' : 'warning'}>{issue.label}</StatusPill>
      ))}
      {compact && issues.length > 2 ? <StatusPill tone="neutral">+{issues.length - 2}</StatusPill> : null}
    </div>
  );
}

function StatusPill({ tone, children }: { tone: 'success' | 'warning' | 'danger' | 'neutral'; children: React.ReactNode }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    REVIEW: 'на проверке',
    READY: 'готово',
    PUBLISHED: 'опубликовано',
    HIDDEN: 'скрыто',
    ACTIVE: 'активен',
    PAUSED: 'пауза',
    ARCHIVED: 'архив',
  };
  return labels[value] || value;
}

function catalogModeLabel(value: string): string {
  const labels: Record<string, string> = {
    WIDGET_ONLY: 'только виджеты',
    INTERNAL_CHECKOUT: 'внутренний checkout',
    HYBRID: 'гибрид',
  };
  return labels[value] || value;
}

function orderStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    PENDING_PAYMENT: 'ожидает оплату',
    PAID: 'оплачен',
    CONFIRMED: 'подтвержден',
    FULFILLED: 'выдан',
    CANCELLED: 'отменен',
    REFUNDED: 'возврат',
    EXPIRED: 'истек',
    FAILED: 'ошибка',
  };
  return labels[value] || value;
}

function reviewStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    PENDING_EMAIL: 'ожидает email',
    PENDING_MODERATION: 'на модерации',
    APPROVED: 'опубликован',
    REJECTED: 'отклонен',
    HIDDEN: 'скрыт',
  };
  return labels[value] || value;
}

function responseStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    PENDING_MODERATION: 'на модерации',
    APPROVED: 'опубликован',
    REJECTED: 'отклонен',
  };
  return labels[value] || value;
}

function ledgerTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    SALE: 'продажа',
    COMMISSION: 'комиссия',
    REFUND: 'возврат',
    PAYOUT: 'выплата',
    ADJUSTMENT: 'корректировка',
    CHARGEBACK_ADJUSTMENT: 'chargeback',
    FEE_RECHARGE: 'комиссия PSP',
  };
  return labels[value] || value;
}

function formatPercentBps(value: number): string {
  return `${(value / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`;
}

function formatRub(value: number | null): string {
  if (value == null) return '-';
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatMoney(kopecks: number): string {
  return `${Math.round((kopecks || 0) / 100).toLocaleString('ru-RU')} ₽`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
