import * as React from 'react';
import { NavLink, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

import type {
  SupplierPortalDashboardDto,
  SupplierPortalAdmissionsListDto,
  SupplierPortalEventsListDto,
  SupplierPortalFinanceDto,
  SupplierPortalIdentityDto,
  SupplierPortalOrdersListDto,
  SupplierPortalProfileDto,
  SupplierPortalReviewsListDto,
} from '@daibilet/contracts/supplier';
import { supplierGet } from '@/lib/api';

const STORAGE_KEY = 'daibilet_supplier_key';

const NAV_SECTIONS = [
  {
    title: 'Работа',
    items: [
      { to: '/', label: 'Главная', icon: '⌂' },
      { to: '/readiness', label: 'Готовность', icon: '✓' },
      { to: '/admissions', label: 'Входные билеты', icon: 'Б' },
      { to: '/events', label: 'События', icon: 'С' },
      { to: '/orders', label: 'Заказы', icon: 'З' },
      { to: '/reviews', label: 'Отзывы', icon: 'О' },
    ],
  },
  {
    title: 'Деньги',
    items: [
      { to: '/finance', label: 'Финансы', icon: '₽' },
      { to: '/documents', label: 'Документы', icon: 'Д' },
    ],
  },
  {
    title: 'Настройки',
    items: [
      { to: '/profile', label: 'Реквизиты', icon: 'Р' },
      { to: '/team', label: 'Команда', icon: 'К' },
      { to: '/integrations', label: 'Интеграции', icon: 'И' },
    ],
  },
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
          <div className="brand-mark" aria-hidden>
            <span />
          </div>
          <div className="brand-copy">
            <div className="brand-title">Дайбилет</div>
            <div className="brand-subtitle">Кабинет поставщика</div>
          </div>
        </div>
        <nav className="nav-list">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
                  <span className="nav-index">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-mark">i</span>
          <span>На первом этапе изменения и выплаты подтверждаются через администратора.</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow">Финконтур · Поставщик</div>
            <h1>Личный кабинет поставщика</h1>
          </div>
          <div className="topbar-actions">
            <span className="session-pill">Сеанс</span>
            <SupplierSelector value={supplierKey} onChange={setSupplierKey} />
          </div>
        </header>

        <main className="content">
          {!supplierKey.trim() ? (
            <EmptySetup />
          ) : (
            <Routes>
              <Route index element={<DashboardPage supplierKey={supplierKey} />} />
              <Route path="readiness" element={<ReadinessPage supplierKey={supplierKey} />} />
              <Route path="events" element={<EventsPage supplierKey={supplierKey} />} />
              <Route path="admissions" element={<AdmissionsPage supplierKey={supplierKey} />} />
              <Route path="orders" element={<OrdersPage supplierKey={supplierKey} />} />
              <Route path="finance" element={<FinancePage supplierKey={supplierKey} />} />
              <Route path="documents" element={<DocumentsPage supplierKey={supplierKey} />} />
              <Route path="reviews" element={<ReviewsPage supplierKey={supplierKey} />} />
              <Route path="profile" element={<ProfilePage supplierKey={supplierKey} />} />
              <Route path="team" element={<TeamPage supplierKey={supplierKey} />} />
              <Route path="integrations" element={<IntegrationsPage supplierKey={supplierKey} />} />
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
          placeholder="код поставщика"
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
  const admissions = data.summary.admissions;
  const orders = data.summary.orders;
  const reviews = data.summary.reviews;

  return (
    <div className="page-stack">
      <PageTitle
        title={data.supplier.title}
        description={`${statusLabel(data.supplier.status)} · ${integrationModeLabel(data.supplier.integrationMode)} · комиссия ${formatPercentBps(data.supplier.defaultCommissionBps)}`}
        action={<RefreshButton onClick={reload} />}
      />

      <div className="stats-grid">
        <StatCard label="Событий" value={events.total} hint={`${events.published} опубликовано`} />
        <StatCard label="Входных билетов" value={admissions.total} hint={`${admissions.canSell} готовы к продаже`} />
        <StatCard label="Позиции заказов" value={orders.totalItems} hint={formatMoney(orders.grossKopecks)} />
        <StatCard label="Баланс" value={formatMoney(finance.ledgerBalanceKopecks)} hint={`выплачено ${formatMoney(finance.paidPayoutsKopecks)}`} />
        <StatCard label="Отзывы" value={reviews.total} hint={reviews.averageRating ? `рейтинг ${reviews.averageRating.toFixed(1)}` : 'рейтинга пока нет'} />
      </div>

      <div className="workflow-strip" aria-label="Путь поставщика к продажам">
        <WorkflowStep label="Реквизиты" value={data.supplier.legalName ? 'есть' : 'нужно заполнить'} tone={data.supplier.legalName ? 'success' : 'warning'} />
        <WorkflowStep label="Готовность" value={readinessStatusLabel(data.readiness.status)} tone={readinessTone(data.readiness.status)} />
        <WorkflowStep label="Продажи" value={orders.totalItems ? `${orders.totalItems} поз.` : 'ожидаем'} tone={orders.totalItems ? 'success' : 'neutral'} />
        <WorkflowStep label="Выплаты" value={finance.paidPayoutsKopecks ? formatMoney(finance.paidPayoutsKopecks) : 'позже'} tone={finance.paidPayoutsKopecks ? 'success' : 'neutral'} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Готовность к внутренним продажам</h2>
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
          {data.admissionsNeedingAttention.length ? (
            <div className="compact-list" style={{ marginTop: 12 }}>
              {data.admissionsNeedingAttention.map((product) => (
                <div key={product.id} className="compact-row">
                  <div>
                    <strong>{product.title}</strong>
                    <span>{[...product.health.blockers, ...product.health.warnings].map((issue) => issue.label).join(', ')}</span>
                  </div>
                  <StatusPill tone={product.health.status === 'blocked' ? 'danger' : 'warning'}>{product.health.score}</StatusPill>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ReadinessPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalDashboardDto>('/api/supplier/dashboard', supplierKey);

  if (loading && !data) return <LoadingState label="Загружаем готовность..." />;
  if (error && !data) return <ErrorState title="Не удалось загрузить готовность" error={error} onRetry={reload} />;
  if (!data) return null;

  const supplierIssues = [...data.readiness.blockers, ...data.readiness.warnings];

  return (
    <div className="page-stack">
      <PageTitle
        title="Готовность"
        description="Что мешает включить внутренние продажи и что стоит поправить до появления кнопок покупки."
        action={<RefreshButton onClick={reload} />}
      />

      <div className="readiness-summary">
        <div>
          <span>Общий статус</span>
          <strong>{readinessStatusLabel(data.readiness.status)}</strong>
          <small>{data.readiness.canEnableInternalCheckout ? 'Можно включать продажи после проверки.' : 'Есть блокеры или предупреждения.'}</small>
        </div>
        <div>
          <span>События</span>
          <strong>{data.eventsNeedingAttention.length}</strong>
          <small>требуют внимания</small>
        </div>
        <div>
          <span>Входные билеты</span>
          <strong>{data.admissionsNeedingAttention.length}</strong>
          <small>требуют внимания</small>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Поставщик</h2>
          <StatusPill tone={readinessTone(data.readiness.status)}>{readinessStatusLabel(data.readiness.status)}</StatusPill>
        </div>
        <IssueList issues={supplierIssues} empty="Блокеров по поставщику нет." />
      </section>

      <section className="panel">
        <div className="panel-header"><h2>События</h2></div>
        {data.eventsNeedingAttention.length ? (
          <Table
            columns={['Событие', 'Город / площадка', 'Расписание', 'Проблемы']}
            rows={data.eventsNeedingAttention.map((event) => [
              <div key="event"><strong>{event.title}</strong><small>{statusLabel(event.status)} · {managementModeLabel(event.managementMode)}</small></div>,
              <div key="place"><span>{event.city.title || '-'}</span><small>{event.venue.title || '-'}</small></div>,
              <div key="schedule"><span>{event.kind === 'OPEN_DATE' ? 'Открытая дата' : formatDateTime(event.nextSessionAt)}</span><small>{event.activeSessions} слотов</small></div>,
              <IssueList key="issues" compact issues={event.readinessIssues} empty="готово" />,
            ])}
          />
        ) : (
          <EmptyInline text="Событий с критичными замечаниями нет." />
        )}
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Входные билеты</h2></div>
        {data.admissionsNeedingAttention.length ? (
          <Table
            columns={['Билет', 'Площадка', 'Цена', 'Проблемы']}
            rows={data.admissionsNeedingAttention.map((product) => [
              <div key="product"><strong>{product.title}</strong><small>{validityLabel(product.validityMode)}</small></div>,
              <div key="venue"><span>{product.venue.title}</span><small>{product.city.title || '-'}</small></div>,
              formatRub(product.priceFromRub),
              <IssueList key="health" compact issues={[...product.health.blockers, ...product.health.warnings]} empty="готово" />,
            ])}
          />
        ) : (
          <EmptyInline text="Входных билетов с критичными замечаниями нет." />
        )}
      </section>
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
              <div key="event"><strong>{event.title}</strong><small>{managementModeLabel(event.managementMode)} · {catalogModeLabel(event.catalogMode)}</small></div>,
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

function AdmissionsPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalAdmissionsListDto>('/api/supplier/admissions?limit=50', supplierKey);

  return (
    <div className="page-stack">
      <PageTitle title="Входные билеты" description="Билеты с открытой датой и входные продукты площадок: музеи, арт-пространства, выставки, аттракционы. Пока только чтение и контроль готовности." action={<RefreshButton onClick={reload} />} />
      {data ? (
        <div className="stats-grid">
          <StatCard label="Всего" value={data.metrics.total} hint={`${data.metrics.published} опубликовано`} />
          <StatCard label="Можно продавать" value={data.metrics.canSell} hint="без блокеров" />
          <StatCard label="Требуют внимания" value={data.metrics.needsAttention} hint={`${data.metrics.blocked} заблокированы`} />
        </div>
      ) : null}
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.items.length)}>
        {data ? (
          <Table
            columns={['Билет', 'Площадка', 'Срок действия', 'Категории', 'Цена', 'Готовность']}
            rows={data.items.map((product) => [
              <div key="product"><strong>{product.title}</strong><small>{product.purchaseFlow === 'PLATFORM' ? 'внутренние продажи' : 'витрина'}</small></div>,
              <div key="venue"><span>{product.venue.title}</span><small>{product.city.title || '-'}</small></div>,
              <div key="validity"><span>{validityLabel(product.validityMode)}</span><small>{validityPeriod(product)}</small></div>,
              <div key="offers"><span>{product.offers.filter((offer) => offer.active).length} активных</span><small>{product.offers.map((offer) => offer.title || 'билет').join(', ') || '-'}</small></div>,
              formatRub(product.priceFromRub),
              <IssueList key="health" compact issues={[...product.health.blockers, ...product.health.warnings]} empty="готово" />,
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
      <PageTitle title="Заказы" description="Позиции внутренних продаж. Заказы через внешние виджеты остаются в билетных системах." action={<RefreshButton onClick={reload} />} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.items.length)}>
        {data ? (
          <Table
            columns={['Заказ', 'Событие', 'Покупатель', 'Билеты', 'Сумма', 'Статус']}
            rows={data.items.map((order) => [
              <div key="order"><strong>{order.publicCode || '-'}</strong><small>{formatDateTime(order.createdAt)}</small></div>,
              <div key="event"><span>{order.eventTitle || order.admissionProductTitle || order.title}</span><small>{order.subjectType === 'VENUE_ADMISSION' ? 'входной билет' : formatDateTime(order.startsAt)}</small></div>,
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
      <PageTitle title="Финансы" description="Баланс, операции, выплаты и сверка. Заявки на вывод будут отдельным сценарием." action={<RefreshButton onClick={reload} />} />
      <FinanceNav />
      {data ? (
        <div className="stats-grid">
          <StatCard label="Баланс" value={formatMoney(data.summary.ledgerBalanceKopecks)} hint="по операциям" />
          <StatCard label="Продажи" value={formatMoney(data.summary.saleKopecks)} hint="до комиссии" />
          <StatCard label="Комиссия" value={formatMoney(data.summary.commissionKopecks)} hint="Daibilet" />
          <StatCard label="Выплачено" value={formatMoney(data.summary.paidPayoutsKopecks)} hint="по выплатам" />
        </div>
      ) : null}
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.ledger.length)}>
        {data ? (
          <Table
            columns={['Дата', 'Тип', 'Сумма', 'Операция', 'Комментарий']}
            rows={data.ledger.map((entry) => [
              formatDateTime(entry.createdAt),
              ledgerTypeLabel(entry.type),
              formatMoney(entry.amountKopecks),
              ledgerReferenceLabel(entry.referenceType),
              entry.note || '-',
            ])}
          />
        ) : null}
      </DataState>
    </div>
  );
}

function DocumentsPage({ supplierKey }: { supplierKey: string }) {
  const profile = useSupplierResource<SupplierPortalProfileDto>('/api/supplier/profile', supplierKey);
  const finance = useSupplierResource<SupplierPortalFinanceDto>('/api/supplier/finance', supplierKey);

  const loading = (profile.loading && !profile.data) || (finance.loading && !finance.data);
  const error = profile.error || finance.error;

  if (loading) return <LoadingState label="Загружаем документы..." />;
  if (error && (!profile.data || !finance.data)) {
    return <ErrorState title="Не удалось загрузить документы" error={error} onRetry={() => { profile.reload(); finance.reload(); }} />;
  }

  const supplier = profile.data?.supplier || finance.data?.supplier;
  const legal = profile.data?.legal;
  const payouts = finance.data?.payouts ?? [];

  return (
    <div className="page-stack">
      <PageTitle
        title="Документы"
        description="Юридический профиль, акты, выплаты и документы по взаиморасчетам. Генерация файлов будет отдельным шагом."
        action={<RefreshButton onClick={() => { profile.reload(); finance.reload(); }} />}
      />
      <FinanceNav />

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Профиль для документов</h2>
            <StatusPill tone={legal?.status === 'APPROVED' ? 'success' : 'warning'}>{legalStatusLabel(legal?.status)}</StatusPill>
          </div>
          <DefinitionList rows={[
            ['Поставщик', supplier?.title || '-'],
            ['Юрлицо', legal?.legalName || '-'],
            ['ИНН', legal?.inn || '-'],
            ['Email документов', legal?.docsEmail || legal?.financeEmail || '-'],
            ['Подписант', legal?.signerFullName || '-'],
          ]} />
        </section>

        <section className="panel">
          <div className="panel-header"><h2>Ближайшие документы</h2></div>
          <div className="compact-list">
            <DocumentRow title="Отчет агента" status="После включения агентской схемы" />
            <DocumentRow title="Акт сверки" status="После первых выплат" />
            <DocumentRow title="Выплатная ведомость" status={payouts.length ? `${payouts.length} выплат в истории` : 'Выплат пока нет'} />
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header"><h2>Выплаты</h2></div>
        {payouts.length ? (
          <Table
            columns={['Период', 'Сумма', 'Комиссия', 'Статус', 'Комментарий']}
            rows={payouts.map((payout) => [
              payout.periodStart || payout.periodEnd ? `${formatDateTime(payout.periodStart)} - ${formatDateTime(payout.periodEnd)}` : '-',
              formatMoney(payout.amountKopecks),
              formatMoney(payout.commissionKopecks),
              <StatusPill key="status" tone={payout.status === 'PAID' ? 'success' : 'neutral'}>{payoutStatusLabel(payout.status)}</StatusPill>,
              payout.comment || '-',
            ])}
          />
        ) : (
          <EmptyInline text="Документы по выплатам появятся после первых внутренних продаж." />
        )}
      </section>
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
      <SettingsNav />
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

function TeamPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalProfileDto>('/api/supplier/profile', supplierKey);

  if (loading && !data) return <LoadingState label="Загружаем команду..." />;
  if (error && !data) return <ErrorState title="Не удалось загрузить команду" error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="page-stack">
      <PageTitle
        title="Команда"
        description="Пользователи поставщика и роли доступа. Приглашения появятся после включения сценария изменений."
        action={<RefreshButton onClick={reload} />}
      />
      <SettingsNav />
      <section className="panel">
        <div className="panel-header"><h2>Пользователи</h2></div>
        {data.users.length ? (
          <Table
            columns={['Сотрудник', 'Роль', 'Статус', 'Принят']}
            rows={data.users.map((user) => [
              <div key="user"><strong>{user.name || user.email || '-'}</strong><small>{user.email || ''}</small></div>,
              roleLabel(user.role),
              <StatusPill key="active" tone={user.isActive ? 'success' : 'neutral'}>{user.isActive ? 'активен' : 'отключен'}</StatusPill>,
              user.acceptedAt ? formatDateTime(user.acceptedAt) : 'ожидает',
            ])}
          />
        ) : (
          <EmptyInline text="Команда еще не заведена. На старте доступ можно выдать вручную через администратора." />
        )}
      </section>
    </div>
  );
}

function IntegrationsPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalProfileDto>('/api/supplier/profile', supplierKey);

  if (loading && !data) return <LoadingState label="Загружаем интеграции..." />;
  if (error && !data) return <ErrorState title="Не удалось загрузить интеграции" error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="page-stack">
      <PageTitle title="Интеграции" description="Как поставщик передает данные и какие продажи ведутся через Дайбилет." action={<RefreshButton onClick={reload} />} />
      <SettingsNav />
      <div className="two-column">
        <IntegrationModeCard supplier={data.supplier} />
        <section className="panel">
          <div className="panel-header"><h2>Площадки</h2></div>
          <div className="compact-list">
            {data.venues.length ? data.venues.map((venue) => (
              <div key={venue.id} className="compact-row">
                <div>
                  <strong>{venue.title}</strong>
                  <span>{venue.cityTitle || 'город не указан'}</span>
                </div>
                <StatusPill tone={venue.isActive ? 'success' : 'neutral'}>{venue.isPrimary ? 'основная' : 'площадка'}</StatusPill>
              </div>
            )) : <EmptyInline text="Площадки не привязаны." />}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header"><h2>Матрица возможностей</h2></div>
        <div className="capability-grid">
          <Capability label="Витрина каталога" enabled />
          <Capability label="Продажи через Дайбилет" enabled={data.supplier.defaultCatalogMode === 'INTERNAL_CHECKOUT' || data.supplier.defaultCatalogMode === 'HYBRID'} />
          <Capability label="Билеты с открытой датой" enabled />
          <Capability label="Передача данных по API" enabled={data.supplier.integrationMode === 'API_SYNC'} />
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
      <h2>Укажите поставщика</h2>
      <p>Пока полноценный вход поставщика не включен, кабинет открывает данные по указанному поставщику. В production доступ дополнительно закрывается на уровне сервера.</p>
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

function WorkflowStep({ label, value, tone }: { label: string; value: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }) {
  return (
    <div className="workflow-step">
      <span className={`workflow-dot ${tone}`} />
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}

function FinanceNav() {
  return (
    <div className="subnav" aria-label="Финансы">
      <NavLink to="/finance" className={({ isActive }) => (isActive ? 'is-active' : '')}>Баланс</NavLink>
      <NavLink to="/documents" className={({ isActive }) => (isActive ? 'is-active' : '')}>Документы</NavLink>
    </div>
  );
}

function SettingsNav() {
  return (
    <div className="subnav" aria-label="Настройки">
      <NavLink to="/profile" className={({ isActive }) => (isActive ? 'is-active' : '')}>Реквизиты</NavLink>
      <NavLink to="/team" className={({ isActive }) => (isActive ? 'is-active' : '')}>Команда</NavLink>
      <NavLink to="/integrations" className={({ isActive }) => (isActive ? 'is-active' : '')}>Интеграции</NavLink>
    </div>
  );
}

function DocumentRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="compact-row">
      <div>
        <strong>{title}</strong>
        <span>{status}</span>
      </div>
      <StatusPill tone="neutral">позже</StatusPill>
    </div>
  );
}

function IntegrationModeCard({ supplier }: { supplier: SupplierPortalIdentityDto }) {
  return (
    <section className="panel">
      <div className="panel-header"><h2>Подключение</h2></div>
      <DefinitionList rows={[
        ['Способ работы', integrationModeLabel(supplier.integrationMode)],
        ['Способ продаж', salesModeLabel(supplier.defaultCatalogMode)],
        ['Комиссия Дайбилет', formatPercentBps(supplier.defaultCommissionBps)],
      ]} />
    </section>
  );
}

function Capability({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="capability">
      <StatusPill tone={enabled ? 'success' : 'neutral'}>{enabled ? 'да' : 'нет'}</StatusPill>
      <span>{label}</span>
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
    INTERNAL_CHECKOUT: 'внутренние продажи',
    HYBRID: 'гибрид',
  };
  return labels[value] || value;
}

function salesModeLabel(value: string): string {
  const labels: Record<string, string> = {
    WIDGET_ONLY: 'покупка через виджет',
    INTERNAL_CHECKOUT: 'продажи через Дайбилет',
    HYBRID: 'виджет и продажи через Дайбилет',
  };
  return labels[value] || value;
}

function managementModeLabel(value: string): string {
  const labels: Record<string, string> = {
    SOURCE_MANAGED: 'из источника',
    DAIBILET_MANAGED: 'управляется в Дайбилет',
    SUPPLIER_SELF_SERVICE: 'управляет поставщик',
  };
  return labels[value] || value;
}

function integrationModeLabel(value: string): string {
  const labels: Record<string, string> = {
    IMPORT_READONLY: 'импорт, только чтение',
    INTERNAL_SALES: 'внутренние продажи',
    API_SYNC: 'API-синхронизация',
    MANUAL: 'ручное управление',
  };
  return labels[value] || value;
}

function readinessStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    ready: 'готово',
    review: 'нужна проверка',
    warning: 'есть предупреждения',
    blocked: 'есть блокеры',
    unknown: 'не проверено',
  };
  return labels[value] || value;
}

function readinessTone(value: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value === 'ready') return 'success';
  if (value === 'blocked') return 'danger';
  if (value === 'warning' || value === 'review') return 'warning';
  return 'neutral';
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

function payoutStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    PENDING: 'готовится',
    PROCESSING: 'в обработке',
    PAID: 'выплачено',
    CANCELLED: 'отменено',
    FAILED: 'ошибка',
  };
  return labels[value] || value;
}

function legalStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    REVIEW: 'на проверке',
    APPROVED: 'проверено',
    REJECTED: 'нужны правки',
  };
  if (!value) return 'не заполнено';
  return labels[value] || value;
}

function roleLabel(value: string): string {
  const labels: Record<string, string> = {
    OWNER: 'владелец',
    MANAGER: 'менеджер',
    CONTENT: 'контент',
    ACCOUNTANT: 'бухгалтер',
    VIEWER: 'просмотр',
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

function ledgerReferenceLabel(value: string | null): string {
  if (!value) return '-';
  const labels: Record<string, string> = {
    CHECKOUT_ORDER: 'заказ',
    CHECKOUT_ITEM: 'позиция заказа',
    PAYOUT: 'выплата',
    REFUND: 'возврат',
    REFUND_REQUEST: 'заявка на возврат',
    ADJUSTMENT: 'корректировка',
  };
  return labels[value] || 'операция';
}

function validityLabel(value: string): string {
  const labels: Record<string, string> = {
    OPEN_DATE: 'Открытая дата',
    FIXED_WINDOW: 'Период',
    VALID_DAYS_AFTER_PURCHASE: 'После покупки',
  };
  return labels[value] || value;
}

function validityPeriod(product: {
  validFrom: string | null;
  validTo: string | null;
  validDaysAfterPurchase: number | null;
}): string {
  if (product.validDaysAfterPurchase) return `${product.validDaysAfterPurchase} дн. после покупки`;
  const from = product.validFrom ? formatDateTime(product.validFrom) : null;
  const to = product.validTo ? formatDateTime(product.validTo) : null;
  if (from && to) return `${from} — ${to}`;
  if (from) return `с ${from}`;
  if (to) return `до ${to}`;
  return 'без ограничения';
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
