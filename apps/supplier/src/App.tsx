import * as React from 'react';
import { NavLink, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

import type {
  SupplierPortalDashboardDto,
  SupplierPortalAdmissionsListDto,
  SupplierPortalAdmissionStubPurchaseResultDto,
  SupplierPortalAdmissionYooKassaPurchaseResultDto,
  SupplierPortalBankAccountUpdateRequestDto,
  SupplierPortalAuthDto,
  SupplierPortalEventsListDto,
  SupplierPortalFinanceDto,
  SupplierPortalIdentityDto,
  SupplierPortalLegalProfileUpdateRequestDto,
  SupplierPortalMeDto,
  SupplierPortalOrdersListDto,
  SupplierPortalProfileDto,
  SupplierPortalReviewsListDto,
  SupplierPortalSessionSupplierDto,
} from '@daibilet/contracts/supplier';
import { SUPPLIER_ACCESS_TOKEN_STORAGE_KEY, supplierGet, supplierPatch, supplierPost } from '@/lib/api';

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
  const [accessToken, setAccessToken] = React.useState(() => window.localStorage.getItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY) || '');
  const [authSession, setAuthSession] = React.useState<SupplierPortalMeDto | null>(null);
  const [authLoading, setAuthLoading] = React.useState(Boolean(accessToken));
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

  const clearAuthSession = React.useCallback(() => {
    setAccessToken('');
    setAuthSession(null);
    window.localStorage.removeItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY);
  }, []);

  React.useEffect(() => {
    if (!accessToken) {
      setAuthLoading(false);
      return;
    }

    const controller = new AbortController();
    setAuthLoading(true);
    supplierGet<SupplierPortalMeDto>('/api/supplier/auth/me', supplierKey, controller.signal, accessToken)
      .then((session) => {
        setAuthSession(session);
        if (!supplierKey.trim()) setSupplierKey(session.currentSupplier.id);
      })
      .catch(() => {
        clearAuthSession();
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, clearAuthSession, setSupplierKey, supplierKey]);

  const handleLogin = React.useCallback((payload: SupplierPortalAuthDto) => {
    window.localStorage.setItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY, payload.accessToken);
    setAccessToken(payload.accessToken);
    setAuthSession({
      user: payload.user,
      suppliers: payload.suppliers,
      currentSupplier: payload.currentSupplier,
    });
    setSupplierKey(payload.currentSupplier.id);
  }, [setSupplierKey]);

  const handleLogout = React.useCallback(() => {
    const token = accessToken;
    clearAuthSession();
    setSupplierKey('');
    if (token) {
      void supplierPost('/api/supplier/auth/logout', {}, token).catch(() => undefined);
    }
  }, [accessToken, clearAuthSession, setSupplierKey]);

  const hasSupplierAccess = Boolean(supplierKey.trim());

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
            <span className="session-pill">{authSession ? authSession.user.email : 'Сеанс'}</span>
            <SupplierAccessControl
              session={authSession}
              value={supplierKey}
              onChange={setSupplierKey}
              onLogout={handleLogout}
            />
          </div>
        </header>

        <main className="content">
          {authLoading ? (
            <LoadingState label="Проверяем сеанс..." />
          ) : !hasSupplierAccess ? (
            <LoginSetup onLogin={handleLogin} onDevSupplier={setSupplierKey} />
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

function SupplierAccessControl({
  session,
  value,
  onChange,
  onLogout,
}: {
  session: SupplierPortalMeDto | null;
  value: string;
  onChange: (value: string) => void;
  onLogout: () => void;
}) {
  if (!session) return value.trim() ? <SupplierSelector value={value} onChange={onChange} /> : null;

  return (
    <div className="supplier-session-control">
      <label htmlFor="supplier-session-select">Поставщик</label>
      <div className="session-control-row">
        <select
          id="supplier-session-select"
          value={value || session.currentSupplier.id}
          onChange={(event) => onChange(event.target.value)}
        >
          {session.suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.title}
            </option>
          ))}
        </select>
        <button type="button" className="ghost-button" onClick={onLogout}>Выйти</button>
      </div>
    </div>
  );
}

function LoginSetup({
  onLogin,
  onDevSupplier,
}: {
  onLogin: (payload: SupplierPortalAuthDto) => void;
  onDevSupplier: (value: string) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      onLogin(await supplierPost<SupplierPortalAuthDto>('/api/supplier/auth/login', { email, password }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <section className="login-card">
        <div className="setup-mark">ЛК</div>
        <h2>Вход поставщика</h2>
        <p>Используйте email пользователя, которому администратор выдал доступ к поставщику.</p>
        <form className="login-form" onSubmit={submit}>
          <label>
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" type="email" required />
          </label>
          <label>
            <span>Пароль</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" type="password" required />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" disabled={loading}>{loading ? 'Проверяем...' : 'Войти'}</button>
        </form>
      </section>

      <section className="dev-access-card">
        <h3>Локальная проверка</h3>
        <p>Для dev smoke можно открыть кабинет по коду поставщика. В production этот путь закрывается backend.</p>
        <SupplierSelector value="" onChange={onDevSupplier} />
      </section>
    </div>
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

      <SaleReadinessPanel readiness={data.readiness} />

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

      <SaleReadinessPanel readiness={data.readiness} />

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
  const [smokeBusyProductId, setSmokeBusyProductId] = React.useState<string | null>(null);
  const [smokeResult, setSmokeResult] = React.useState<SupplierPortalAdmissionStubPurchaseResultDto | null>(null);
  const [smokeError, setSmokeError] = React.useState<string | null>(null);
  const [yooKassaBusyProductId, setYooKassaBusyProductId] = React.useState<string | null>(null);
  const [yooKassaResult, setYooKassaResult] = React.useState<SupplierPortalAdmissionYooKassaPurchaseResultDto | null>(null);
  const [yooKassaError, setYooKassaError] = React.useState<string | null>(null);

  async function createSmokePurchase(product: SupplierPortalAdmissionsListDto['items'][number]) {
    const offer = product.offers.find((item) => item.active && item.priceRub != null && item.priceRub >= 100) ||
      product.offers.find((item) => item.active) ||
      product.offers[0] ||
      null;
    if (!offer) {
      setSmokeError('У входного билета нет категории для тестовой продажи.');
      return;
    }

    setSmokeBusyProductId(product.id);
    setSmokeError(null);
    setSmokeResult(null);
    try {
      const result = await supplierPost<SupplierPortalAdmissionStubPurchaseResultDto>(
        `/api/supplier/admissions/${encodeURIComponent(product.id)}/stub-purchase`,
        {
          admissionOfferId: offer.id,
          quantity: 1,
          buyer: {
            email: `smoke+${Date.now()}@daibilet.ru`,
            name: 'Тестовый покупатель',
            phone: null,
          },
          idempotencyKey: `supplier-lc-admission-smoke-${product.id}-${Date.now()}`,
        },
        undefined,
        supplierKey,
      );
      setSmokeResult(result);
      reload();
    } catch (error) {
      setSmokeError(error instanceof Error ? error.message : String(error));
    } finally {
      setSmokeBusyProductId(null);
    }
  }

  async function createYooKassaSmokePurchase(product: SupplierPortalAdmissionsListDto['items'][number]) {
    const offer = product.offers.find((item) => item.active && item.priceRub != null && item.priceRub >= 100) ||
      product.offers.find((item) => item.active) ||
      product.offers[0] ||
      null;
    if (!offer) {
      setYooKassaError('У входного билета нет категории для проверки YooKassa.');
      return;
    }

    setYooKassaBusyProductId(product.id);
    setYooKassaError(null);
    setYooKassaResult(null);
    try {
      const result = await supplierPost<SupplierPortalAdmissionYooKassaPurchaseResultDto>(
        `/api/supplier/admissions/${encodeURIComponent(product.id)}/yookassa-purchase`,
        {
          admissionOfferId: offer.id,
          quantity: 1,
          buyer: {
            email: `yookassa+${Date.now()}@daibilet.ru`,
            name: 'Тестовый покупатель',
            phone: null,
          },
          idempotencyKey: `supplier-lc-admission-yookassa-${product.id}-${Date.now()}`,
        },
        undefined,
        supplierKey,
      );
      setYooKassaResult(result);
      reload();
    } catch (error) {
      setYooKassaError(error instanceof Error ? error.message : String(error));
    } finally {
      setYooKassaBusyProductId(null);
    }
  }

  const yooKassaCheckoutUrl = yooKassaResult?.order.checkoutUrl || yooKassaResult?.order.payment.confirmationUrl || null;

  return (
    <div className="page-stack">
      <PageTitle title="Входные билеты" description="Билеты с открытой датой и входные продукты площадок: музеи, арт-пространства, выставки, аттракционы. Можно проверить тестовую продажу без реальной оплаты." action={<RefreshButton onClick={reload} />} />
      {smokeResult ? (
        <div className="notice-panel success">
          <strong>Тестовая продажа создана: заказ {smokeResult.order.publicCode}</strong>
          <span>{smokeResult.order.subject.admissionProductTitle} · {smokeResult.order.item.ticketTitle || 'билет'} · {formatMoney(smokeResult.order.totals.totalKopecks)}</span>
        </div>
      ) : null}
      {smokeError ? (
        <div className="notice-panel error">
          <strong>Не удалось создать тестовую продажу</strong>
          <span>{smokeError}</span>
        </div>
      ) : null}
      {yooKassaResult ? (
        <div className="notice-panel success">
          <strong>YooKassa sandbox-заказ создан: {yooKassaResult.order.publicCode}</strong>
          <span>{yooKassaResult.order.subject.admissionProductTitle} · {formatMoney(yooKassaResult.order.totals.totalKopecks)}</span>
          {yooKassaCheckoutUrl ? (
            <div className="notice-actions">
              <a className="link-button" href={yooKassaCheckoutUrl} target="_blank" rel="noreferrer">Открыть оплату</a>
            </div>
          ) : null}
        </div>
      ) : null}
      {yooKassaError ? (
        <div className="notice-panel error">
          <strong>Не удалось создать YooKassa sandbox-заказ</strong>
          <span>{yooKassaError}</span>
        </div>
      ) : null}
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
            columns={['Билет', 'Площадка', 'Срок действия', 'Категории', 'Цена', 'Готовность', 'Действия']}
            rows={data.items.map((product) => [
              <div key="product"><strong>{product.title}</strong><small>{product.purchaseFlow === 'PLATFORM' ? 'внутренние продажи' : 'витрина'}</small></div>,
              <div key="venue"><span>{product.venue.title}</span><small>{product.city.title || '-'}</small></div>,
              <div key="validity"><span>{validityLabel(product.validityMode)}</span><small>{validityPeriod(product)}</small></div>,
              <div key="offers"><span>{product.offers.filter((offer) => offer.active).length} активных</span><small>{product.offers.map((offer) => offer.title || 'билет').join(', ') || '-'}</small></div>,
              formatRub(product.priceFromRub),
              <IssueList key="health" compact issues={[...product.health.blockers, ...product.health.warnings]} empty="готово" />,
              <div key="action" className="table-actions">
                <button
                  type="button"
                  className="table-action-button"
                  disabled={!product.readiness.canSell || smokeBusyProductId === product.id}
                  onClick={() => void createSmokePurchase(product)}
                  title={product.readiness.canSell ? 'Создать STUB-заказ без реальной оплаты' : 'Сначала закройте блокеры готовности'}
                >
                  {smokeBusyProductId === product.id ? 'Создаем...' : 'STUB'}
                </button>
                <button
                  type="button"
                  className="table-action-button secondary"
                  disabled={!product.readiness.canSell || yooKassaBusyProductId === product.id}
                  onClick={() => void createYooKassaSmokePurchase(product)}
                  title={product.readiness.canSell ? 'Создать sandbox-платеж YooKassa' : 'Сначала закройте блокеры готовности'}
                >
                  {yooKassaBusyProductId === product.id ? 'Создаем...' : 'YooKassa'}
                </button>
              </div>,
            ])}
          />
        ) : null}
      </DataState>
    </div>
  );
}

function OrdersPage({ supplierKey }: { supplierKey: string }) {
  const { data, loading, error, reload } = useSupplierResource<SupplierPortalOrdersListDto>('/api/supplier/orders?limit=50', supplierKey);
  const paidItems = data?.items.filter((order) => ['PAID', 'CONFIRMED', 'FULFILLED'].includes(order.status)).length ?? 0;
  const pendingItems = data?.items.filter((order) => order.status === 'PENDING_PAYMENT').length ?? 0;
  const grossKopecks = data?.items.reduce((sum, order) => sum + order.totalKopecks, 0) ?? 0;

  return (
    <div className="page-stack">
      <PageTitle title="Заказы" description="Покупки через внутренний контур Дайбилет: статус оплаты, покупатель, билет и сумма." action={<RefreshButton onClick={reload} />} />
      {data ? (
        <div className="stats-grid">
          <StatCard label="Позиции" value={data.total} hint={`на странице ${data.items.length}`} />
          <StatCard label="Оплачено" value={paidItems} hint="ожидают выдачи или уже выданы" />
          <StatCard label="Ожидают оплату" value={pendingItems} hint="можно сверить позже" />
          <StatCard label="Сумма" value={formatMoney(grossKopecks)} hint="по текущей выдаче" />
        </div>
      ) : null}
      <DataState loading={loading} error={error} onRetry={reload} hasData={Boolean(data?.items.length)}>
        {data ? (
          <Table
            columns={['Заказ', 'Покупка', 'Покупатель', 'Сумма / статус']}
            rows={data.items.map((order) => [
              <div key="order"><strong>№ {order.publicCode || compactCode(order.orderId || order.id)}</strong><small>{formatDateTime(order.createdAt)}</small></div>,
              <div key="event">
                <span>{order.eventTitle || order.admissionProductTitle || order.title}</span>
                <small>{order.subjectType === 'VENUE_ADMISSION' ? 'входной билет' : formatDateTime(order.startsAt)} · {order.quantity} шт. · {order.ticketTitle || 'билет'}</small>
              </div>,
              <div key="buyer"><span>{order.buyerName || order.buyerEmail || order.buyerPhone || '-'}</span><small>{[order.buyerEmail, order.buyerPhone].filter(Boolean).join(' · ')}</small></div>,
              <div key="status" className="order-status-cell">
                <strong>{formatMoney(order.totalKopecks)}</strong>
                <StatusPill tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</StatusPill>
                <small>{order.paidAt ? `оплачен ${formatDateTime(order.paidAt)}` : orderStatusLabel(order.itemStatus)}</small>
              </div>,
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
            <StatusPill tone={legalStatusTone(legal?.status)}>{legalStatusLabel(legal?.status)}</StatusPill>
          </div>
          <DefinitionList rows={[
            ['Поставщик', supplier?.title || '-'],
            ['Юрлицо', legal?.legalName || '-'],
            ['ИНН', legal?.inn || '-'],
            ['Email документов', legal?.docsEmail || legal?.financeEmail || '-'],
            ['Подписант', legal?.signerFullName || '-'],
            ['Проверено', legal?.verifiedAt ? formatDateTime(legal.verifiedAt) : '-'],
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
      <LegalProfileNotice profile={data} />
      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Юридический профиль</h2>
            <StatusPill tone={legalStatusTone(data.legal.status)}>{legalStatusLabel(data.legal.status)}</StatusPill>
          </div>
          <SupplierLegalProfileForm profile={data} supplierKey={supplierKey} onSaved={reload} />
        </section>
        <section className="panel">
          <div className="panel-header"><h2>Основной счет</h2></div>
          <SupplierBankAccountForm profile={data} supplierKey={supplierKey} onSaved={reload} />
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

type LegalFormState = {
  legalName: string;
  legalAddress: string;
  inn: string;
  kpp: string;
  ogrn: string;
  taxMode: SupplierPortalLegalProfileUpdateRequestDto['taxMode'];
  isVatPayer: boolean;
  defaultVatRate: string;
  signerFullName: string;
  signerPosition: string;
  financeEmail: string;
  docsEmail: string;
};

function SupplierLegalProfileForm({
  profile,
  supplierKey,
  onSaved,
}: {
  profile: SupplierPortalProfileDto;
  supplierKey: string;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<LegalFormState>(() => legalFormFromProfile(profile));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(legalFormFromProfile(profile));
  }, [profile.generatedAt]);

  function update<K extends keyof LegalFormState>(key: K, value: LegalFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await supplierPatch<SupplierPortalProfileDto>('/api/supplier/profile/legal', buildLegalProfilePayload(form), undefined, supplierKey);
      setMessage('Реквизиты сохранены и отправлены на проверку.');
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={(event) => void save(event)}>
      {message ? <div className="form-note success">{message}</div> : null}
      {error ? <div className="form-note error">{error}</div> : null}
      <label className="form-field span-2">
        <span>Юрлицо</span>
        <input value={form.legalName} onChange={(event) => update('legalName', event.target.value)} required />
      </label>
      <label className="form-field span-2">
        <span>Юридический адрес</span>
        <input value={form.legalAddress} onChange={(event) => update('legalAddress', event.target.value)} />
      </label>
      <label className="form-field">
        <span>ИНН</span>
        <input value={form.inn} onChange={(event) => update('inn', event.target.value)} inputMode="numeric" />
      </label>
      <label className="form-field">
        <span>КПП</span>
        <input value={form.kpp} onChange={(event) => update('kpp', event.target.value)} inputMode="numeric" />
      </label>
      <label className="form-field">
        <span>ОГРН</span>
        <input value={form.ogrn} onChange={(event) => update('ogrn', event.target.value)} inputMode="numeric" />
      </label>
      <label className="form-field">
        <span>Налоговый режим</span>
        <select value={form.taxMode || 'OSNO'} onChange={(event) => update('taxMode', event.target.value as LegalFormState['taxMode'])}>
          <option value="OSNO">ОСНО</option>
          <option value="USN_6">УСН 6%</option>
          <option value="USN_15">УСН 15%</option>
          <option value="AUSN">АУСН</option>
          <option value="NPD">НПД</option>
        </select>
      </label>
      <label className="form-field checkbox-field">
        <input type="checkbox" checked={form.isVatPayer} onChange={(event) => update('isVatPayer', event.target.checked)} />
        <span>Плательщик НДС</span>
      </label>
      <label className="form-field">
        <span>Ставка НДС</span>
        <input value={form.defaultVatRate} onChange={(event) => update('defaultVatRate', event.target.value)} inputMode="numeric" placeholder="20" />
      </label>
      <label className="form-field">
        <span>Подписант</span>
        <input value={form.signerFullName} onChange={(event) => update('signerFullName', event.target.value)} />
      </label>
      <label className="form-field">
        <span>Должность</span>
        <input value={form.signerPosition} onChange={(event) => update('signerPosition', event.target.value)} />
      </label>
      <label className="form-field">
        <span>Email финансов</span>
        <input value={form.financeEmail} onChange={(event) => update('financeEmail', event.target.value)} type="email" />
      </label>
      <label className="form-field">
        <span>Email документов</span>
        <input value={form.docsEmail} onChange={(event) => update('docsEmail', event.target.value)} type="email" />
      </label>
      <div className="form-actions span-2">
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Сохраняем...' : 'Сохранить реквизиты'}</button>
      </div>
    </form>
  );
}

type BankFormState = {
  bankName: string;
  bik: string;
  accountNumber: string;
  correspondentAccount: string;
};

function SupplierBankAccountForm({
  profile,
  supplierKey,
  onSaved,
}: {
  profile: SupplierPortalProfileDto;
  supplierKey: string;
  onSaved: () => void;
}) {
  const primaryAccount = profile.bankAccounts.find((account) => account.isPrimary) || profile.bankAccounts[0] || null;
  const [form, setForm] = React.useState<BankFormState>(() => bankFormFromAccount(primaryAccount));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(bankFormFromAccount(primaryAccount));
  }, [profile.generatedAt, primaryAccount?.id]);

  function update<K extends keyof BankFormState>(key: K, value: BankFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await supplierPatch<SupplierPortalProfileDto>('/api/supplier/profile/bank-account', buildBankAccountPayload(form, primaryAccount?.id || null), undefined, supplierKey);
      setMessage('Основной счет сохранен и отправлен на проверку.');
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={(event) => void save(event)}>
      {message ? <div className="form-note success">{message}</div> : null}
      {error ? <div className="form-note error">{error}</div> : null}
      {primaryAccount ? (
        <div className="form-readonly span-2">
          <span>Сейчас в профиле</span>
          <strong>{primaryAccount.bankName || 'Банк не указан'} · {primaryAccount.accountMask || 'счет скрыт'}</strong>
        </div>
      ) : null}
      <label className="form-field span-2">
        <span>Банк</span>
        <input value={form.bankName} onChange={(event) => update('bankName', event.target.value)} />
      </label>
      <label className="form-field">
        <span>БИК</span>
        <input value={form.bik} onChange={(event) => update('bik', event.target.value)} inputMode="numeric" />
      </label>
      <label className="form-field">
        <span>Расчетный счет</span>
        <input value={form.accountNumber} onChange={(event) => update('accountNumber', event.target.value)} inputMode="numeric" placeholder={primaryAccount?.accountMask || ''} />
      </label>
      <label className="form-field span-2">
        <span>Корреспондентский счет</span>
        <input value={form.correspondentAccount} onChange={(event) => update('correspondentAccount', event.target.value)} inputMode="numeric" placeholder={primaryAccount?.correspondentMask || ''} />
      </label>
      <div className="form-actions span-2">
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Сохраняем...' : 'Сохранить счет'}</button>
      </div>
    </form>
  );
}

function legalFormFromProfile(profile: SupplierPortalProfileDto): LegalFormState {
  return {
    legalName: profile.legal.legalName || profile.supplier.legalName || profile.supplier.title,
    legalAddress: profile.legal.legalAddress || '',
    inn: profile.legal.inn || '',
    kpp: profile.legal.kpp || '',
    ogrn: profile.legal.ogrn || '',
    taxMode: (profile.legal.taxMode as LegalFormState['taxMode']) || 'OSNO',
    isVatPayer: Boolean(profile.legal.isVatPayer),
    defaultVatRate: profile.legal.defaultVatRate == null ? '' : String(profile.legal.defaultVatRate),
    signerFullName: profile.legal.signerFullName || '',
    signerPosition: profile.legal.signerPosition || '',
    financeEmail: profile.legal.financeEmail || profile.supplier.email || '',
    docsEmail: profile.legal.docsEmail || '',
  };
}

function bankFormFromAccount(account: SupplierPortalProfileDto['bankAccounts'][number] | null): BankFormState {
  return {
    bankName: account?.bankName || '',
    bik: account?.bik || '',
    accountNumber: '',
    correspondentAccount: '',
  };
}

function buildLegalProfilePayload(form: LegalFormState): SupplierPortalLegalProfileUpdateRequestDto {
  return {
    legalName: form.legalName.trim(),
    legalAddress: cleanFormString(form.legalAddress),
    inn: cleanFormString(form.inn),
    kpp: cleanFormString(form.kpp),
    ogrn: cleanFormString(form.ogrn),
    taxMode: form.taxMode || 'OSNO',
    isVatPayer: form.isVatPayer,
    defaultVatRate: form.defaultVatRate.trim() ? Math.trunc(Number(form.defaultVatRate)) : null,
    signerFullName: cleanFormString(form.signerFullName),
    signerPosition: cleanFormString(form.signerPosition),
    financeEmail: cleanFormString(form.financeEmail),
    docsEmail: cleanFormString(form.docsEmail),
  };
}

function buildBankAccountPayload(
  form: BankFormState,
  bankAccountId: string | null,
): SupplierPortalBankAccountUpdateRequestDto {
  const payload: SupplierPortalBankAccountUpdateRequestDto = {
    bankAccountId,
    isPrimary: true,
    bankName: cleanFormString(form.bankName),
    bik: cleanFormString(form.bik),
  };
  if (form.accountNumber.trim()) payload.accountNumber = form.accountNumber.trim();
  if (form.correspondentAccount.trim()) payload.correspondentAccount = form.correspondentAccount.trim();
  return payload;
}

function cleanFormString(value: string): string | null {
  const text = value.trim();
  return text || null;
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

function SaleReadinessPanel({ readiness }: { readiness: SupplierPortalDashboardDto['readiness'] }) {
  const issues = [...readiness.blockers, ...readiness.warnings];
  const tone = readinessTone(readiness.status);

  return (
    <section className={`panel sale-readiness-panel ${tone}`}>
      <div className="sale-readiness-copy">
        <span className="eyebrow">Готовность к продаже</span>
        <h2>{readinessHeadline(readiness)}</h2>
        <p>{readinessNextStep(readiness)}</p>
      </div>
      <div className="sale-readiness-side">
        <StatusPill tone={tone}>{readinessStatusLabel(readiness.status)}</StatusPill>
        <IssueList issues={issues} empty="Блокеров нет. Можно готовить включение продаж." />
      </div>
    </section>
  );
}

function LegalProfileNotice({ profile }: { profile: SupplierPortalProfileDto }) {
  const legal = profile.legal;
  const primaryAccount = profile.bankAccounts.find((account) => account.isPrimary) || null;

  if (legal.status === 'VERIFIED') {
    return (
      <div className="notice-panel success">
        <strong>Реквизиты проверены</strong>
        <span>Внутренние продажи можно включать, если товары, комиссия и YooKassa тоже готовы. Любое изменение реквизитов снова отправит профиль на проверку.</span>
      </div>
    );
  }

  if (legal.status === 'REJECTED') {
    return (
      <div className="notice-panel error">
        <strong>Нужны правки</strong>
        <span>{legal.rejectionComment || 'Администратор вернул реквизиты на доработку.'}</span>
      </div>
    );
  }

  if (legal.status === 'INCOMPLETE') {
    return (
      <div className="notice-panel warning">
        <strong>Реквизиты на проверке</strong>
        <span>{primaryAccount ? `Основной счет: ${primaryAccount.bankName || 'банк не указан'} · ${primaryAccount.accountMask || 'счет скрыт'}.` : 'Добавьте основной счет, чтобы администратор мог одобрить профиль.'}</span>
      </div>
    );
  }

  return (
    <div className="notice-panel neutral">
      <strong>Заполните юридический профиль</strong>
      <span>После сохранения реквизитов и банковского счета профиль уйдет на проверку администратору.</span>
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
    SUPPLIER_DRAFTS: 'черновики поставщика',
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

function readinessHeadline(readiness: SupplierPortalDashboardDto['readiness']): string {
  if (readiness.canEnableInternalCheckout && readiness.warnings.length === 0) return 'Продажи можно включать';
  if (readiness.canEnableInternalCheckout) return 'Продажи можно включать после короткой проверки';
  if (readiness.blockers.length === 1) return readiness.blockers[0]?.label || 'Есть один блокер';
  return `Есть ${readiness.blockers.length} блокера`;
}

function readinessNextStep(readiness: SupplierPortalDashboardDto['readiness']): string {
  const firstBlocker = readiness.blockers[0];
  if (firstBlocker) return `Следующий шаг: ${firstBlocker.label.toLowerCase()}.`;
  const firstWarning = readiness.warnings[0];
  if (firstWarning) return `Можно продолжать, но лучше проверить: ${firstWarning.label.toLowerCase()}.`;
  return 'Все базовые условия выполнены. Осталось провести smoke оплаты и открыть продажу на нужных карточках.';
}

function orderStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    RESERVED: 'зарезервирован',
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

function orderStatusTone(value: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (['PAID', 'CONFIRMED', 'FULFILLED'].includes(value)) return 'success';
  if (['PENDING_PAYMENT', 'RESERVED', 'DRAFT'].includes(value)) return 'warning';
  if (['FAILED', 'EXPIRED'].includes(value)) return 'danger';
  return 'neutral';
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
    INCOMPLETE: 'на проверке',
    VERIFIED: 'проверено',
    REJECTED: 'нужны правки',
  };
  if (!value) return 'не заполнено';
  return labels[value] || value;
}

function legalStatusTone(value?: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value === 'VERIFIED') return 'success';
  if (value === 'REJECTED') return 'danger';
  if (value === 'INCOMPLETE') return 'warning';
  return 'neutral';
}

function compactCode(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 6) return digits.slice(-7);
  return value.slice(-7) || '-';
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
