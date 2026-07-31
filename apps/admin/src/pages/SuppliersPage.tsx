import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, RefreshCcw, Search, WalletCards, XCircle } from 'lucide-react';

import type { AdminSupplierDetailDto, AdminSupplierRowDto, AdminSuppliersListDto } from '@daibilet/contracts/admin';
import { DataTableShell, EmptyState, PageHeader, QuickFilterBar, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { adminFetch } from '@/lib/admin-api';
import { formatDateTime, formatNumber } from '@/data';

const PAGE_SIZE = 50;

const STATUS_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'ACTIVE', label: 'Активные' },
  { id: 'REVIEW', label: 'Проверка' },
  { id: 'DRAFT', label: 'Черновики' },
  { id: 'PAUSED', label: 'Пауза' },
];

function emptyPayload(): AdminSuppliersListDto {
  return {
    generatedAt: new Date().toISOString(),
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
    filters: {},
    metrics: {
      total: 0,
      active: 0,
      review: 0,
      draft: 0,
      paused: 0,
      checkoutReady: 0,
      needsAttention: 0,
    },
    items: [],
  };
}

export function SuppliersPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<AdminSuppliersListDto>(emptyPayload);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<AdminSupplierDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [legalActionBusy, setLegalActionBusy] = React.useState<'approve' | 'reject' | null>(null);
  const [legalActionError, setLegalActionError] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const page = Math.max(1, Number(params.get('page') || 1) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(payload.total / PAGE_SIZE));

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      next.delete('page');
      setParams(next);
    },
    [params, setParams],
  );

  const setPage = React.useCallback(
    (nextPage: number) => {
      const next = new URLSearchParams(params);
      if (nextPage <= 1) next.delete('page');
      else next.set('page', String(nextPage));
      setParams(next);
    },
    [params, setParams],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (q.trim()) query.set('q', q.trim());
    if (status !== 'all') query.set('status', status);

    setLoading(true);
    adminFetch(`/api/admin/suppliers?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
        return body as AdminSuppliersListDto;
      })
      .then((data) => {
        setPayload({ ...emptyPayload(), ...data, items: Array.isArray(data.items) ? data.items : [] });
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(emptyPayload());
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [q, status, offset, reloadTick]);

  const openSupplier = React.useCallback((supplier: AdminSupplierRowDto) => {
    setDetailLoading(true);
    adminFetch(`/api/admin/suppliers/${encodeURIComponent(supplier.id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
        return body as AdminSupplierDetailDto;
      })
      .then((detail) => {
        setLegalActionError(null);
        setSelected(detail);
      })
      .catch((error) => {
        window.alert(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setDetailLoading(false));
  }, []);

  const reviewLegalProfile = React.useCallback(async (supplierId: string, action: 'approve' | 'reject') => {
    let adminComment: string | null = null;
    if (action === 'reject') {
      const value = window.prompt('Комментарий для поставщика: что нужно исправить в реквизитах?');
      if (value === null) return;
      adminComment = value.trim();
      if (!adminComment) {
        window.alert('Для отклонения нужен короткий комментарий.');
        return;
      }
    }

    setLegalActionBusy(action);
    setLegalActionError(null);
    try {
      const response = await adminFetch(`/api/admin/suppliers/${encodeURIComponent(supplierId)}/legal/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(adminComment ? { adminComment } : {}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
      setSelected(body as AdminSupplierDetailDto);
      setReloadTick((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLegalActionError(message);
      window.alert(message);
    } finally {
      setLegalActionBusy(null);
    }
  }, []);

  const quickFilters = STATUS_FILTERS.map((item) => ({
    ...item,
    count: item.id === 'all' ? payload.metrics.total : statusCount(payload, item.id),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Поставщики"
        description="Юридическая готовность, режим продаж, события, заказы и финсводка. Реальные платежи не включаются без readiness."
        meta={
          <>
            <Badge variant="outline">{formatNumber(payload.metrics.total)} всего</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.checkoutReady)} готовы к продаже</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.needsAttention)} требуют внимания</Badge>
          </>
        }
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadTick((value) => value + 1)}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <div className="grid gap-2 lg:grid-cols-4">
        <Counter title="Активные" value={payload.metrics.active} tone="success" />
        <Counter title="На проверке" value={payload.metrics.review} tone="warning" />
        <Counter title="Готовы к продаже" value={payload.metrics.checkoutReady} tone="info" />
        <Counter title="Блокеры" value={payload.metrics.needsAttention} tone="danger" />
      </div>

      <QuickFilterBar items={quickFilters} activeId={status} onChange={(id) => setParam('status', id)} />

      <Card className="border-border p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="Название, юрлицо, ИНН, email или телефон"
              className="h-9 border-border bg-background pl-8 text-sm"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {loading ? 'загрузка...' : `${formatNumber(payload.total)} найдено`}
          </div>
        </div>
        {loadError ? (
          <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            Backend недоступен: {loadError}
          </div>
        ) : null}
      </Card>

      <DataTableShell
        loading={loading}
        columns={['Поставщик', 'Статус', 'События', 'Заказы', 'Финансы', 'Готовность', '']}
        empty={
          !loading && payload.items.length === 0 ? (
            <EmptyState icon={Building2} title="Поставщиков пока нет" description="Добавим первого поставщика после подключения внутреннего checkout." />
          ) : null
        }
      >
        {payload.items.map((supplier) => (
          <tr key={supplier.id} className="border-b border-border align-top last:border-0 hover:bg-secondary/40">
            <td className="min-w-[260px] px-4 py-3">
              <button type="button" className="text-left" onClick={() => openSupplier(supplier)}>
                <div className="font-medium text-foreground">{supplier.title}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{supplier.slug}</div>
                {supplier.legalName ? <div className="mt-1 text-xs text-muted-foreground">{supplier.legalName}</div> : null}
              </button>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={supplierStatusTone(supplier.status)} label={supplierStatusLabel(supplier.status)} />
              <div className="mt-2 text-xs text-muted-foreground">{catalogModeLabel(supplier.defaultCatalogMode)}</div>
            </td>
            <td className="px-4 py-3 text-sm">
              <div>{formatNumber(supplier.events.total)} всего</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatNumber(supplier.events.internalCheckout + supplier.events.hybrid)} с checkout
              </div>
              {supplier.admissions.total ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(supplier.admissions.total)} входных билетов
                </div>
              ) : null}
            </td>
            <td className="px-4 py-3 text-sm">
              <div>{formatNumber(supplier.orders.totalItems)} позиций</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatMoney(supplier.orders.grossKopecks)}</div>
            </td>
            <td className="px-4 py-3 text-sm">
              <div>{formatMoney(supplier.finance.ledgerBalanceKopecks)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                комиссия {formatMoney(supplier.finance.commissionKopecks)}
              </div>
            </td>
            <td className="min-w-[220px] px-4 py-3">
              <ReadinessPills supplier={supplier} />
            </td>
            <td className="px-4 py-3 text-right">
              <Button type="button" size="sm" variant="outline" disabled={detailLoading} onClick={() => openSupplier(supplier)}>
                Открыть
              </Button>
            </td>
          </tr>
        ))}
      </DataTableShell>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Стр. {formatNumber(page)} / {formatNumber(pages)}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            Назад
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!payload.hasMore || loading} onClick={() => setPage(page + 1)}>
            Вперед
          </Button>
        </div>
      </div>

      <SupplierDetailSheet
        supplier={selected}
        legalActionBusy={legalActionBusy}
        legalActionError={legalActionError}
        onLegalAction={reviewLegalProfile}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function SupplierDetailSheet({
  supplier,
  legalActionBusy,
  legalActionError,
  onLegalAction,
  onOpenChange,
}: {
  supplier: AdminSupplierDetailDto | null;
  legalActionBusy: 'approve' | 'reject' | null;
  legalActionError: string | null;
  onLegalAction: (supplierId: string, action: 'approve' | 'reject') => void;
  onOpenChange: (open: boolean) => void;
}) {
  const hasLegalProfile = Boolean(supplier?.legal.legalName || supplier?.legal.inn);

  return (
    <Sheet open={Boolean(supplier)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(920px,96vw)] overflow-y-auto sm:max-w-[920px]">
        {supplier ? (
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={supplierStatusTone(supplier.status)} label={supplierStatusLabel(supplier.status)} />
              <Badge variant="outline">{catalogModeLabel(supplier.defaultCatalogMode)}</Badge>
              <Badge variant="outline">{paymentModeLabel(supplier.paymentMode)}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold">{supplier.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{supplier.legalName || 'Юрлицо не указано'}</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Card className="border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Юридический контур</h3>
                    <StatusBadge status={legalStatusTone(supplier.legal.status)} label={legalStatusLabel(supplier.legal.status)} />
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <DetailTerm label="Статус" value={legalStatusLabel(supplier.legal.status)} />
                    <DetailTerm label="ИНН" value={supplier.legal.inn || '-'} />
                    <DetailTerm label="Налоговый режим" value={taxModeLabel(supplier.legal.taxMode)} />
                    <DetailTerm label="Основной счет" value={supplier.legal.hasPrimaryBankAccount ? 'есть' : 'нет'} />
                    <DetailTerm label="YooKassa" value={supplier.yookassaShopId || '-'} />
                    <DetailTerm label="Комиссия по умолчанию" value={`${supplier.defaultCommissionBps / 100}%`} />
                    {supplier.legal.verifiedAt ? <DetailTerm label="Проверено" value={formatDateTime(supplier.legal.verifiedAt)} /> : null}
                  </dl>
                  {supplier.legal.rejectionComment ? (
                    <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {supplier.legal.rejectionComment}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!hasLegalProfile || legalActionBusy !== null || supplier.legal.status === 'VERIFIED'}
                      onClick={() => onLegalAction(supplier.id, 'approve')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {legalActionBusy === 'approve' ? 'Одобряем...' : 'Одобрить реквизиты'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!hasLegalProfile || legalActionBusy !== null}
                      onClick={() => onLegalAction(supplier.id, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      {legalActionBusy === 'reject' ? 'Отклоняем...' : 'Отклонить'}
                    </Button>
                  </div>
                  {legalActionError ? <div className="mt-3 text-xs text-destructive">{legalActionError}</div> : null}
                </Card>

                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Команда</h3>
                  <div className="mt-3 space-y-2">
                    {supplier.users.length ? (
                      supplier.users.map((user) => (
                        <div key={user.id} className="rounded-md bg-secondary px-3 py-2 text-sm">
                          <div className="font-medium">{user.email || user.name || user.id}</div>
                          <div className="text-xs text-muted-foreground">{user.role}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Пользователи не привязаны.</div>
                    )}
                  </div>
                </Card>

                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Последние события</h3>
                  <div className="mt-3 space-y-2">
                    {supplier.eventsSample.length ? (
                      supplier.eventsSample.slice(0, 8).map((event) => (
                        <div key={event.id} className="rounded-md bg-secondary px-3 py-2 text-sm">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {supplierStatusLabel(event.status)} · {purchaseFlowLabel(event.purchaseFlow)} · {managementModeLabel(event.managementMode)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Событий пока нет.</div>
                    )}
                  </div>
                </Card>

                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Входные билеты</h3>
                  <div className="mt-3 space-y-2">
                    {supplier.admissionProductsSample.length ? (
                      supplier.admissionProductsSample.slice(0, 8).map((product) => (
                        <div key={product.id} className="rounded-md bg-secondary px-3 py-2 text-sm">
                          <div className="font-medium">{product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {supplierStatusLabel(product.status)} · {purchaseFlowLabel(product.purchaseFlow)} · {product.priceFromRub != null ? `от ${formatMoney(product.priceFromRub * 100)}` : 'цена не задана'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Входных билетов пока нет.</div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Готовность checkout</h3>
                  <ReadinessPills supplier={supplier} />
                  <div className="mt-3 space-y-2">
                    {[...supplier.readiness.blockers, ...supplier.readiness.warnings].map((issue) => (
                      <div key={issue.code} className="flex items-start gap-2 text-sm">
                        {issue.severity === 'high' ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-warning-foreground" />
                        )}
                        <span>{issue.label}</span>
                      </div>
                    ))}
                    {supplier.readiness.blockers.length === 0 && supplier.readiness.warnings.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Блокеров нет.</div>
                    ) : null}
                  </div>
                </Card>

                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Финсводка</h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <DetailTerm label="Баланс ledger" value={formatMoney(supplier.finance.ledgerBalanceKopecks)} />
                    <DetailTerm label="Продажи" value={formatMoney(supplier.finance.saleKopecks)} />
                    <DetailTerm label="Комиссия" value={formatMoney(supplier.finance.commissionKopecks)} />
                    <DetailTerm label="Возвраты" value={formatMoney(supplier.finance.refundKopecks)} />
                    <DetailTerm label="Выплачено" value={formatMoney(supplier.finance.paidPayoutsKopecks)} />
                  </dl>
                </Card>

                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Отзывы</h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <DetailTerm label="Всего" value={formatNumber(supplier.reviews.total)} />
                    <DetailTerm label="Одобрено" value={formatNumber(supplier.reviews.approved)} />
                    <DetailTerm label="На модерации" value={formatNumber(supplier.reviews.pendingModeration)} />
                    <DetailTerm label="Средняя оценка" value={supplier.reviews.averageRating ? supplier.reviews.averageRating.toFixed(1) : '-'} />
                  </dl>
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ReadinessPills({ supplier }: { supplier: AdminSupplierRowDto }) {
  if (supplier.readiness.canEnableInternalCheckout) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
          продажи можно
        </Badge>
        {supplier.readiness.warnings.map((issue) => (
          <Badge key={issue.code} variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
            {issue.label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {supplier.readiness.blockers.slice(0, 3).map((issue) => (
        <Badge key={issue.code} variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
          {issue.label}
        </Badge>
      ))}
      {supplier.readiness.blockers.length > 3 ? <Badge variant="outline">+{supplier.readiness.blockers.length - 3}</Badge> : null}
    </div>
  );
}

function Counter({ title, value, tone }: { title: string; value: number; tone: 'success' | 'warning' | 'info' | 'danger' }) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning-foreground' : tone === 'danger' ? 'text-destructive' : 'text-info';
  return (
    <Card className="border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(value)}</div>
        </div>
        <WalletCards className={`h-5 w-5 ${toneClass}`} />
      </div>
    </Card>
  );
}

function DetailTerm({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function statusCount(payload: AdminSuppliersListDto, status: string): number {
  if (status === 'ACTIVE') return payload.metrics.active;
  if (status === 'REVIEW') return payload.metrics.review;
  if (status === 'DRAFT') return payload.metrics.draft;
  if (status === 'PAUSED') return payload.metrics.paused;
  return 0;
}

function supplierStatusTone(status: string): 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error' {
  if (status === 'ACTIVE') return 'live';
  if (status === 'REVIEW') return 'ready';
  if (status === 'PUBLISHED') return 'live';
  if (status === 'HIDDEN') return 'paused';
  if (status === 'PAUSED') return 'paused';
  if (status === 'ARCHIVED') return 'archived';
  return 'draft';
}

function supplierStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Черновик',
    REVIEW: 'На проверке',
    READY: 'Готово',
    PUBLISHED: 'Опубликовано',
    HIDDEN: 'Скрыто',
    ACTIVE: 'Активен',
    PAUSED: 'Пауза',
    ARCHIVED: 'Архив',
  };
  return labels[status] || status;
}

function legalStatusTone(status?: string | null): 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error' {
  if (status === 'VERIFIED') return 'live';
  if (status === 'REJECTED') return 'error';
  if (status === 'INCOMPLETE') return 'incomplete';
  return 'draft';
}

function legalStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: 'Черновик',
    INCOMPLETE: 'На проверке',
    VERIFIED: 'Проверено',
    REJECTED: 'Нужны правки',
  };
  if (!status) return 'Не заполнено';
  return labels[status] || status;
}

function taxModeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    OSNO: 'ОСНО',
    USN_6: 'УСН 6%',
    USN_15: 'УСН 15%',
    AUSN: 'АУСН',
    NPD: 'Самозанятый',
  };
  if (!value) return '-';
  return labels[value] || value;
}

function purchaseFlowLabel(value: string): string {
  const labels: Record<string, string> = {
    WIDGET: 'Виджет',
    PLATFORM: 'Daibilet',
    HYBRID: 'Гибрид',
  };
  return labels[value] || value;
}

function managementModeLabel(value: string): string {
  const labels: Record<string, string> = {
    SOURCE_MANAGED: 'Источник',
    DAIBILET_MANAGED: 'Daibilet',
    SUPPLIER_DRAFTS: 'Черновики поставщика',
    SUPPLIER_SELF_SERVICE: 'Поставщик',
  };
  return labels[value] || value;
}

function catalogModeLabel(value: string): string {
  const labels: Record<string, string> = {
    WIDGET_ONLY: 'Только виджеты',
    INTERNAL_CHECKOUT: 'Внутренний checkout',
    HYBRID: 'Гибрид',
  };
  return labels[value] || value;
}

function paymentModeLabel(value: string): string {
  const labels: Record<string, string> = {
    SINGLE_MERCHANT: 'Daibilet как продавец',
    AGENT_SINGLE_PAYOUT: 'Агентская схема',
    SPLIT_MERCHANT: 'Split-платежи',
  };
  return labels[value] || value;
}

function formatMoney(kopecks: number): string {
  return `${formatNumber(Math.round((kopecks || 0) / 100))} ₽`;
}
