import * as React from 'react';
import { ADMIN_API_BASE } from '@/lib/admin-api';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Copy, Plus, Receipt, RefreshCcw, Search, Ticket } from 'lucide-react';

import { DataTableShell, EmptyState, InfoNote, PageHeader, QuickFilterBar, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { formatNumber } from '@/data';

const API_BASE_URL = ADMIN_API_BASE;
const PAGE_SIZE = 50;

const QUICK_FILTER_LABELS: Record<string, string> = {
  all: 'Все',
  attention: 'Требуют внимания',
  pending_refunds: 'Возвраты',
  missing_artifact: 'Без билетов',
  failed_integration: 'Проблемы',
  unlinked: 'Без связи',
};

type OrderStatusTone = 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error';

type AdminOrderRow = {
  id: string;
  externalOrderId: string;
  publicCode?: string | null;
  status: string;
  displayStatus: string;
  statusTone: OrderStatusTone;
  sourceCode: string;
  sourceName: string;
  sourceLabel: string;
  buyer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  };
  purchasedAt?: string | null;
  updatedAt?: string | null;
  ticketCount: number;
  unlinkedTickets: number;
  eventTitle?: string | null;
  eventTitles: string[];
  eventDateLabel?: string | null;
  amountRub?: number | null;
  artifactStatus: 'missing' | 'tickets' | 'not_required' | string;
  refundRequestsCount: number;
  hasPendingRefundRequests: boolean;
  needsAttention: boolean;
  problems: string[];
  tickets: Array<{
    id: string;
    externalTicketId: string;
    status: string;
    displayStatus?: string;
    origin?: 'source' | 'manual' | string;
    eventId?: string | null;
    sessionId?: string | null;
    eventTitle?: string | null;
    eventSlug?: string | null;
    startsAt?: string | null;
  }>;
};

type AdminOrderEventCandidate = {
  id: string;
  slug?: string | null;
  title: string;
  city?: string | null;
  venue?: string | null;
  category?: string | null;
  sourceCode?: string | null;
  sourceName?: string | null;
  startsAt?: string | null;
  priceFrom?: number | null;
  sessionCount: number;
  groupEventIds: string[];
  sessions: Array<{
    id: string;
    eventId: string;
    startsAt?: string | null;
    endsAt?: string | null;
    sourceStatus?: string | null;
    priceFrom?: number | null;
    vacant?: number | null;
  }>;
};

type AdminOrdersPayload = {
  generatedAt: string;
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminOrderRow[];
  sources: string[];
  statuses: string[];
  quickFilters: Array<{ id: string; count: number }>;
  metrics: {
    imported: number;
    confirmed: number;
    processing: number;
    canceled: number;
    tickets: number;
    missingArtifacts: number;
    failedIntegration: number;
    needsAttention: number;
  };
};

export function ExternalOrdersPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<AdminOrdersPayload>(() => emptyPayload(params));
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [reloadTick, setReloadTick] = React.useState(0);
  const [selectedOrder, setSelectedOrder] = React.useState<AdminOrderRow | null>(null);
  const [isSavingTicket, setIsSavingTicket] = React.useState(false);
  const [ticketSaveError, setTicketSaveError] = React.useState<string | null>(null);

  const view = params.get('view') ?? 'all';
  const q = params.get('q') ?? '';
  const provider = params.get('provider') ?? 'all';
  const status = params.get('status') ?? 'all';

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
    (page: number) => {
      const next = new URLSearchParams(params);
      if (page <= 1) next.delete('page');
      else next.set('page', String(page));
      setParams(next);
    },
    [params, setParams],
  );

  const refresh = React.useCallback(() => setReloadTick((value) => value + 1), []);

  const openOrder = React.useCallback((order: AdminOrderRow) => {
    setSelectedOrder(order);
    setTicketSaveError(null);
    fetch(`${API_BASE_URL}/api/admin/orders/${encodeURIComponent(order.id)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminOrderRow;
      })
      .then((detail) => setSelectedOrder(detail))
      .catch(() => undefined);
  }, []);

  const saveTicket = React.useCallback(
    (order: AdminOrderRow, patch: { id?: string; externalTicketId: string; status: string; eventId?: string | null; sessionId?: string | null }) => {
      setIsSavingTicket(true);
      setTicketSaveError(null);
      return fetch(`${API_BASE_URL}/api/admin/orders/${encodeURIComponent(order.id)}/tickets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
        .then(async (response) => {
          const body = await response.json().catch(() => null);
          if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
          return body as { order?: AdminOrderRow };
        })
        .then((body) => {
          if (body.order) setSelectedOrder(body.order);
          refresh();
        })
        .catch((error) => {
          setTicketSaveError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setIsSavingTicket(false));
    },
    [refresh],
  );

  const syncTicketscloudOrders = React.useCallback(() => {
    setSyncing(true);
    fetch(`${API_BASE_URL}/api/admin/orders/sync`, { method: 'POST' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(() => {
        setLoadError(null);
        refresh();
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? `Синхронизация не прошла: ${error.message}` : String(error));
      })
      .finally(() => setSyncing(false));
  }, [refresh]);

  React.useEffect(() => {
    const controller = new AbortController();
    const nextParams = new URLSearchParams(params);
    nextParams.set('limit', String(PAGE_SIZE));
    setLoading(true);

    fetch(`${API_BASE_URL}/api/admin/orders?${nextParams.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminOrdersPayload;
      })
      .then((data) => {
        setPayload(normalizePayload(data, params));
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(emptyPayload(params));
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [params, reloadTick]);

  const quickFilters = React.useMemo(
    () =>
      payload.quickFilters.map((item) => ({
        ...item,
        label: QUICK_FILTER_LABELS[item.id] || item.id,
      })),
    [payload.quickFilters],
  );
  const hasBuyerColumn = React.useMemo(() => payload.rows.some(hasBuyerData), [payload.rows]);
  const hasTicketsColumn = React.useMemo(() => payload.rows.some((order) => order.ticketCount > 0 || order.unlinkedTickets > 0), [payload.rows]);
  const hasProblemsColumn = React.useMemo(() => payload.rows.some((order) => order.problems.length > 0), [payload.rows]);
  const tableColumns = React.useMemo(
    () => [
      'Заказ',
      'Событие',
      ...(hasBuyerColumn ? ['Покупатель'] : []),
      'Статус',
      ...(hasTicketsColumn ? ['Билеты'] : []),
      ...(hasProblemsColumn ? ['Проблемы'] : []),
      'Действия',
    ],
    [hasBuyerColumn, hasProblemsColumn, hasTicketsColumn],
  );

  return (
    <div>
      <PageHeader
        title="Заказы"
        description="Заказы из билетных систем: факт покупки, статус билета, покупатель и связь с событием. Деньги, чеки и основной возврат остаются у источника."
        meta={
          <>
            <SourceBadge source="ticketscloud" />
            <SourceBadge source="teplohod" />
            <Badge variant="outline">оплата у источника</Badge>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Обновить
            </Button>
            <Button variant="default" size="sm" onClick={syncTicketscloudOrders} disabled={syncing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Синхронизация...' : 'Синхронизировать TC'}
            </Button>
          </div>
        }
      />

      <InfoNote>
        Для покупателя это будет раздел "Мои заказы". В админке оставляем рабочие поля: номер заказа, покупатель, событие, статус и билеты.
      </InfoNote>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Counter label="заказов" value={payload.metrics.imported} icon={Receipt} tone="info" />
        <Counter label="подтверждены" value={payload.metrics.confirmed} icon={CheckCircle2} tone="success" />
        <Counter label="в обработке" value={payload.metrics.processing} icon={Clock} tone="warning" />
        <Counter label="требуют внимания" value={payload.metrics.needsAttention} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="mt-4">
        <QuickFilterBar items={quickFilters} activeId={view} onChange={(id) => setParam('view', id)} />
      </div>

      <Card className="mt-4 border-border p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="ID заказа, событие, e-mail или телефон"
              className="h-9 border-border bg-background pl-8 text-sm"
            />
          </div>
          <select value={provider} onChange={(event) => setParam('provider', event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Все источники</option>
            {payload.sources.map((source) => (
              <option key={source} value={source}>
                {sourceLabel(source)}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setParam('status', event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Все статусы</option>
            {payload.statuses.map((item) => (
              <option key={item} value={item}>
                {ticketStatusLabel(item)}
              </option>
            ))}
          </select>
          <div className="text-xs text-muted-foreground">
            {loading ? 'загрузка...' : `${formatNumber(payload.total)} найдено`}
          </div>
        </div>
        {loadError ? <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">Backend недоступен: {loadError}</div> : null}
      </Card>

      <div className="mt-4">
        <DataTableShell
          loading={loading}
          columns={tableColumns}
          empty={!loading && payload.rows.length === 0 ? <OrdersEmptyState /> : null}
        >
          {payload.rows.map((order) => (
            <tr key={order.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
              <td className="min-w-[190px] px-4 py-3 align-top">
                <div className="flex items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">№{order.publicCode || order.externalOrderId || order.id}</span>
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] leading-4 text-muted-foreground">{sourceShortLabel(order.sourceCode)}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(order.purchasedAt || order.updatedAt)}</div>
                  </div>
                  <button
                    type="button"
                    className="mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Скопировать номер заказа"
                    onClick={() => void navigator.clipboard?.writeText(order.publicCode || order.externalOrderId || order.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
              <td className="min-w-[260px] px-4 py-3 align-top">
                <div className="font-medium text-foreground">{order.eventTitle || '-'}</div>
                {order.eventDateLabel ? <div className="mt-1 text-xs text-muted-foreground">{formatDate(order.eventDateLabel)}</div> : null}
                {order.amountRub ? <div className="mt-1 text-xs text-muted-foreground">{formatMoneyRub(order.amountRub)}</div> : null}
              </td>
              {hasBuyerColumn ? (
                <td className="min-w-[190px] px-4 py-3 align-top text-sm">
                  {hasBuyerData(order) ? (
                    <>
                      <div className="font-medium text-foreground">{order.buyer.name || '-'}</div>
                      {order.buyer.email ? <div className="mt-1 text-xs text-muted-foreground">{order.buyer.email}</div> : null}
                      {order.buyer.phone ? <div className="mt-1 text-xs text-muted-foreground">{order.buyer.phone}</div> : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3 align-top">
                <StatusBadge status={order.statusTone} label={order.displayStatus} />
              </td>
              {hasTicketsColumn ? (
                <td className="px-4 py-3 align-top">
                  {order.ticketCount > 0 ? (
                    <>
                      <Badge variant="outline">{formatNumber(order.ticketCount)} бил.</Badge>
                      {order.unlinkedTickets ? <div className="mt-2 text-xs text-muted-foreground">{formatNumber(order.unlinkedTickets)} без связи</div> : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              ) : null}
              {hasProblemsColumn ? (
                <td className="min-w-[220px] px-4 py-3 align-top">
                  {order.problems.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {order.problems.map((problem) => (
                        <Badge key={problem} variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                          {problem}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3 align-top">
                <Button variant="outline" size="sm" onClick={() => openOrder(order)}>
                  Открыть
                </Button>
              </td>
            </tr>
          ))}
        </DataTableShell>
      </div>

      <OrderDetailSheet
        order={selectedOrder}
        isSaving={isSavingTicket}
        saveError={ticketSaveError}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onSaveTicket={saveTicket}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Страница {formatNumber(payload.page)} из {formatNumber(payload.pages)}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={payload.page <= 1} onClick={() => setPage(payload.page - 1)}>
            Назад
          </Button>
          <Button variant="outline" size="sm" disabled={payload.page >= payload.pages} onClick={() => setPage(payload.page + 1)}>
            Вперед
          </Button>
        </div>
      </div>

    </div>
  );
}

function OrdersEmptyState() {
  return (
    <div className="px-4 py-12">
      <EmptyState
        icon={Ticket}
        title="Заказы пока не загружены"
        description="Нужно запустить импорт заказов от Ticketscloud и Teplohod.info. Вручную выдуманные продажи здесь не показываем."
      />
    </div>
  );
}

function OrderDetailSheet({
  order,
  isSaving,
  saveError,
  onOpenChange,
  onSaveTicket,
}: {
  order: AdminOrderRow | null;
  isSaving: boolean;
  saveError: string | null;
  onOpenChange: (open: boolean) => void;
  onSaveTicket: (order: AdminOrderRow, patch: { id?: string; externalTicketId: string; status: string; eventId?: string | null; sessionId?: string | null }) => Promise<void>;
}) {
  const [editingTicket, setEditingTicket] = React.useState<AdminOrderRow['tickets'][number] | null>(null);
  const [ticketNumber, setTicketNumber] = React.useState('');
  const [ticketStatus, setTicketStatus] = React.useState('issued');
  const [eventId, setEventId] = React.useState('');
  const [sessionId, setSessionId] = React.useState('');
  const [eventQuery, setEventQuery] = React.useState('');
  const [eventCandidates, setEventCandidates] = React.useState<AdminOrderEventCandidate[]>([]);
  const [eventCandidatesLoading, setEventCandidatesLoading] = React.useState(false);
  const [eventCandidatesError, setEventCandidatesError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEditingTicket(null);
    setTicketNumber('');
    setTicketStatus('issued');
    setEventId('');
    setSessionId('');
    setEventQuery(order?.eventTitle || '');
    setEventCandidates([]);
    setEventCandidatesError(null);
  }, [order?.id]);

  React.useEffect(() => {
    if (!order) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams({ limit: '12' });
      if (eventQuery.trim()) nextParams.set('q', eventQuery.trim());
      setEventCandidatesLoading(true);
      fetch(`${API_BASE_URL}/api/admin/order-event-candidates?${nextParams.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return (await response.json()) as { rows?: AdminOrderEventCandidate[] };
        })
        .then((payload) => {
          setEventCandidates(Array.isArray(payload.rows) ? payload.rows : []);
          setEventCandidatesError(null);
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setEventCandidates([]);
            setEventCandidatesError(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setEventCandidatesLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [order, eventQuery]);

  const edit = (ticket: AdminOrderRow['tickets'][number]) => {
    setEditingTicket(ticket);
    setTicketNumber(ticket.externalTicketId || '');
    setTicketStatus(ticket.status || 'issued');
    setEventId(ticket.eventId || '');
    setSessionId(ticket.sessionId || '');
    setEventQuery(ticket.eventTitle || order?.eventTitle || '');
  };

  const resetForm = () => {
    setEditingTicket(null);
    setTicketNumber('');
    setTicketStatus('issued');
    setEventId('');
    setSessionId('');
  };

  const selectCandidate = (candidate: AdminOrderEventCandidate) => {
    setEventId(candidate.id);
    setSessionId(candidate.sessions[0]?.id || '');
    setEventQuery(candidate.title);
  };

  const selectSession = (candidate: AdminOrderEventCandidate, session: AdminOrderEventCandidate['sessions'][number]) => {
    setEventId(session.eventId || candidate.id);
    setSessionId(session.id);
    setEventQuery(candidate.title);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!order || !ticketNumber.trim()) return;
    void onSaveTicket(order, {
      id: editingTicket?.id,
      externalTicketId: ticketNumber.trim(),
      status: ticketStatus,
      eventId: eventId.trim() || null,
      sessionId: sessionId.trim() || null,
    }).then(resetForm);
  };

  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[min(920px,96vw)] flex-col overflow-y-auto sm:max-w-[920px]">
        {order ? (
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={sourceBadge(order.sourceCode)} />
              <StatusBadge status={order.statusTone} label={order.displayStatus} />
            </div>
            <h2 className="mt-3 text-xl font-semibold leading-snug">Заказ №{order.publicCode || order.externalOrderId}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{order.eventTitle || 'Событие не связано'} · {formatDate(order.purchasedAt || order.updatedAt)}</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="border-border p-4">
                <h3 className="text-sm font-semibold">Билеты</h3>
                <div className="mt-3 space-y-2">
                  {order.tickets.length ? (
                    order.tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-foreground">{ticket.externalTicketId}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{ticket.eventTitle || order.eventTitle || 'событие уточняется'}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{formatDate(ticket.startsAt)}</div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {ticket.origin === 'manual' ? <Badge variant="outline" className="border-info/20 bg-info/10 text-info">ручной</Badge> : null}
                            <Badge variant="outline">{ticket.displayStatus || ticketStatusLabel(ticket.status)}</Badge>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={() => edit(ticket)}>
                          Редактировать
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
                      Билеты от источника не пришли. Можно добавить номер вручную, чтобы он появился в "Моих заказах" у покупателя.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-border p-4">
                <h3 className="text-sm font-semibold">{editingTicket ? 'Редактировать билет' : 'Добавить билет'}</h3>
                <form className="mt-3 space-y-3" onSubmit={submit}>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Номер билета
                    <Input value={ticketNumber} onChange={(event) => setTicketNumber(event.target.value)} placeholder="например, A-12345" className="h-9 bg-background" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Статус
                    <select value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="issued">Выпущен</option>
                      <option value="paid">Оплачен</option>
                      <option value="confirmed">Подтвержден</option>
                      <option value="used">Использован</option>
                      <option value="cancelled">Отменен</option>
                      <option value="refunded">Возвращен</option>
                      <option value="unknown">Неизвестно</option>
                    </select>
                  </label>
                  <div className="space-y-2">
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Связь с событием
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} placeholder="название, город, площадка" className="h-9 bg-background pl-9" />
                      </div>
                    </label>
                    <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-secondary/60 p-2">
                      {eventCandidatesLoading ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground">Ищем кандидаты...</div>
                      ) : eventCandidatesError ? (
                        <div className="px-2 py-3 text-xs text-destructive">Поиск не работает: {eventCandidatesError}</div>
                      ) : eventCandidates.length ? (
                        eventCandidates.map((candidate) => (
                          <div key={candidate.id} className="rounded-md bg-background p-2 text-xs shadow-sm">
                            <button type="button" className="block w-full text-left" onClick={() => selectCandidate(candidate)}>
                              <div className="line-clamp-2 font-medium text-foreground">{candidate.title}</div>
                              <div className="mt-1 text-muted-foreground">
                                {[candidate.city, candidate.venue, candidate.sourceCode].filter(Boolean).join(' · ') || 'каталог'}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge variant="outline">{formatNumber(candidate.sessionCount)} слот.</Badge>
                                {candidate.priceFrom ? <Badge variant="outline">от {formatMoneyRub(candidate.priceFrom)}</Badge> : null}
                              </div>
                            </button>
                            {candidate.sessions.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {candidate.sessions.slice(0, 5).map((session) => (
                                  <button
                                    key={session.id}
                                    type="button"
                                    className={`rounded-full px-2 py-1 text-[11px] ${
                                      sessionId === session.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                                    onClick={() => selectSession(candidate, session)}
                                  >
                                    {formatDate(session.startsAt)}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-xs text-muted-foreground">Совпадений нет. Можно ввести ID вручную ниже.</div>
                      )}
                    </div>
                  </div>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Event ID, если нужно связать
                    <Input value={eventId} onChange={(event) => setEventId(event.target.value)} placeholder="evt_..." className="h-9 bg-background" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Session ID, если нужно связать
                    <Input value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="опционально" className="h-9 bg-background" />
                  </label>
                  {saveError ? <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</div> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={isSaving || !ticketNumber.trim()}>
                      <Plus className="mr-2 h-4 w-4" />
                      {isSaving ? 'Сохраняем...' : editingTicket ? 'Сохранить' : 'Добавить'}
                    </Button>
                    {editingTicket ? (
                      <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                        Новый билет
                      </Button>
                    ) : null}
                  </div>
                </form>
              </Card>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Counter({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Receipt; tone: 'info' | 'success' | 'warning' | 'destructive' }) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning-foreground' : tone === 'destructive' ? 'text-destructive' : 'text-info';
  return (
    <Card className="border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(value)}</div>
        </div>
        <Icon className={`h-5 w-5 ${toneClass}`} />
      </div>
    </Card>
  );
}

function normalizePayload(payload: AdminOrdersPayload, params: URLSearchParams): AdminOrdersPayload {
  return {
    ...emptyPayload(params),
    ...payload,
    metrics: { ...emptyPayload(params).metrics, ...(payload.metrics || {}) },
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    quickFilters: Array.isArray(payload.quickFilters) ? payload.quickFilters : emptyPayload(params).quickFilters,
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    statuses: Array.isArray(payload.statuses) ? payload.statuses : [],
  };
}

function emptyPayload(params: URLSearchParams): AdminOrdersPayload {
  const page = Math.max(1, Number(params.get('page') || 1) || 1);
  return {
    generatedAt: new Date().toISOString(),
    page,
    pages: 1,
    limit: PAGE_SIZE,
    total: 0,
    rows: [],
    sources: [],
    statuses: [],
    quickFilters: Object.keys(QUICK_FILTER_LABELS).map((id) => ({ id, count: 0 })),
    metrics: {
      imported: 0,
      confirmed: 0,
      processing: 0,
      canceled: 0,
      tickets: 0,
      missingArtifacts: 0,
      failedIntegration: 0,
      needsAttention: 0,
    },
  };
}

function hasBuyerData(order: AdminOrderRow) {
  return Boolean(order.buyer.name || order.buyer.email || order.buyer.phone);
}

function sourceShortLabel(sourceCode: string) {
  const code = String(sourceCode || '').toUpperCase();
  if (code.includes('TEPLOHOD')) return 'TEP';
  if (code.includes('TICKETSCLOUD') || code.includes('TC')) return 'TC';
  if (code.includes('MANUAL')) return 'MAN';
  return code.slice(0, 3) || '-';
}

function sourceBadge(sourceCode: string): 'ticketscloud' | 'teplohod' | 'manual' {
  const code = String(sourceCode || '').toUpperCase();
  if (code.includes('TEPLOHOD')) return 'teplohod';
  if (code.includes('TICKETSCLOUD') || code.includes('TC')) return 'ticketscloud';
  return 'manual';
}

function sourceLabel(sourceCode: string) {
  const code = String(sourceCode || '').toUpperCase();
  if (code === 'TEPLOHOD') return 'Teplohod.info';
  if (code === 'TICKETSCLOUD') return 'Ticketscloud';
  return code || 'Источник';
}

function ticketStatusLabel(status?: string | null) {
  const value = String(status || '').toLowerCase();
  if (value.includes('refund') || value.includes('return')) return 'Возвращен';
  if (value.includes('cancel') || value.includes('expired')) return 'Отменен';
  if (value.includes('used') || value.includes('redeemed') || value.includes('checked')) return 'Использован';
  if (value.includes('paid') || value.includes('confirm')) return 'Подтвержден';
  if (value.includes('issued') || value.includes('ticketed') || value.includes('generated')) return 'Выпущен';
  return status || 'Неизвестно';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoneyRub(value?: number | null) {
  if (!value) return '-';
  return `${formatNumber(value)} ₽`;
}
