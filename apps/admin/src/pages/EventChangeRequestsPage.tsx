import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Loader2, RefreshCcw, Search, Send, XCircle } from 'lucide-react';

import type {
  AdminEventChangeRequestRowDto,
  AdminEventChangeRequestsListDto,
} from '@daibilet/contracts/admin';
import { DataTableShell, EmptyState, InfoNote, PageHeader, QuickFilterBar, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/data';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';
const PAGE_SIZE = 50;

type ActionName = 'approve' | 'reject' | 'apply';

export function EventChangeRequestsPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<AdminEventChangeRequestsListDto>(() => emptyPayload(params));
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);

  const status = params.get('status') ?? 'all';
  const type = params.get('type') ?? 'all';
  const q = params.get('q') ?? '';
  const offset = Math.max(0, Number(params.get('offset') || 0) || 0);

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      next.delete('offset');
      setParams(next);
    },
    [params, setParams],
  );

  const setOffset = React.useCallback(
    (nextOffset: number) => {
      const next = new URLSearchParams(params);
      if (nextOffset <= 0) next.delete('offset');
      else next.set('offset', String(nextOffset));
      setParams(next);
    },
    [params, setParams],
  );

  const refresh = React.useCallback(() => setReloadTick((value) => value + 1), []);

  React.useEffect(() => {
    const controller = new AbortController();
    const nextParams = new URLSearchParams();
    nextParams.set('limit', String(PAGE_SIZE));
    if (offset > 0) nextParams.set('offset', String(offset));
    if (status !== 'all') nextParams.set('status', status);
    if (type !== 'all') nextParams.set('type', type);
    if (q.trim()) nextParams.set('q', q.trim());

    setLoading(true);
    fetch(`${API_BASE_URL}/api/admin/event-change-requests?${nextParams.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
        return body as AdminEventChangeRequestsListDto;
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
  }, [offset, params, q, reloadTick, status, type]);

  const runAction = React.useCallback(
    (request: AdminEventChangeRequestRowDto, action: ActionName) => {
      const adminComment = action === 'reject' ? window.prompt('Комментарий для отклонения заявки') : null;
      if (action === 'reject' && !adminComment?.trim()) return;

      setActingId(`${request.id}:${action}`);
      setActionError(null);
      fetch(`${API_BASE_URL}/api/admin/event-change-requests/${encodeURIComponent(request.id)}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'apply' ? undefined : JSON.stringify({ adminComment: adminComment?.trim() || undefined }),
      })
        .then(async (response) => {
          const body = await response.json().catch(() => null);
          if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
          return body;
        })
        .then(() => refresh())
        .catch((error) => setActionError(error instanceof Error ? error.message : String(error)))
        .finally(() => setActingId(null));
    },
    [refresh],
  );

  const quickFilters = React.useMemo(() => buildQuickFilters(payload), [payload]);
  const typeOptions = React.useMemo(() => Object.keys(payload.facets.types).sort(), [payload.facets.types]);
  const canGoPrev = offset > 0;
  const canGoNext = payload.hasMore;

  return (
    <div>
      <PageHeader
        title="Заявки на изменения"
        description="Очередь правок от поставщиков и админских сценариев: контент, SEO, расписание, билеты и публикация."
        meta={
          <>
            <Badge variant="outline">{formatNumber(payload.total)} всего</Badge>
            <Badge variant="outline">{formatNumber(payload.facets.statuses.SUBMITTED || 0)} на проверке</Badge>
            <Badge variant="outline">{formatNumber(payload.facets.statuses.APPROVED || 0)} готовы к применению</Badge>
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <InfoNote>
        В таблице показываются безопасные поля заявки и ключи payload. Сырые изменения лучше выводить позже в отдельном diff-экране, чтобы случайно не подсветить технические поля источников.
      </InfoNote>

      <Card className="mt-4 border-border p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="Событие, поставщик, slug или комментарий"
              className="h-9 border-border bg-background pl-8 text-sm"
            />
          </div>
          <select value={type} onChange={(event) => setParam('type', event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Все типы</option>
            {typeOptions.map((item) => (
              <option key={item} value={item}>
                {requestTypeLabel(item)}
              </option>
            ))}
          </select>
          <div className="text-xs text-muted-foreground">
            {loading ? 'загрузка...' : `${formatNumber(payload.items.length)} на странице`}
          </div>
        </div>
        {loadError ? <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">Backend недоступен: {loadError}</div> : null}
        {actionError ? <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{actionError}</div> : null}
      </Card>

      <div className="mt-4">
        <QuickFilterBar items={quickFilters} activeId={status} onChange={(id) => setParam('status', id)} />
      </div>

      <DataTableShell
        loading={loading}
        columns={['Заявка', 'Событие', 'Поставщик', 'Изменение', 'Статус', 'Payload', 'Действия']}
        empty={!loading && payload.items.length === 0 ? <RequestsEmptyState /> : null}
      >
        {payload.items.map((request) => (
          <tr key={request.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
            <td className="min-w-[210px] px-4 py-3 align-top">
              <div className="font-medium text-foreground">{request.title || requestTypeLabel(request.type)}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{request.id}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</div>
            </td>
            <td className="min-w-[260px] px-4 py-3 align-top">
              <div className="font-medium text-foreground">{request.event?.title || 'Новое событие'}</div>
              {request.event?.slug ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{request.event.slug}</div> : null}
              {request.event ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{managementModeLabel(request.event.managementMode)}</Badge>
                  {request.event.scheduleLocked ? <Badge variant="outline">расписание закрыто</Badge> : null}
                </div>
              ) : null}
            </td>
            <td className="min-w-[180px] px-4 py-3 align-top">
              <div className="font-medium text-foreground">{request.supplier?.title || '-'}</div>
              {request.supplier?.slug ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{request.supplier.slug}</div> : null}
            </td>
            <td className="min-w-[220px] px-4 py-3 align-top">
              <Badge variant="outline">{requestTypeLabel(request.type)}</Badge>
              {request.summary ? <div className="mt-2 text-xs text-muted-foreground">{request.summary}</div> : null}
              {request.adminComment ? <div className="mt-2 rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">{request.adminComment}</div> : null}
            </td>
            <td className="px-4 py-3 align-top">
              <StatusBadge status={statusTone(request.status)} label={requestStatusLabel(request.status)} />
              {request.reviewedAt ? <div className="mt-1 text-xs text-muted-foreground">проверено {formatDateTime(request.reviewedAt)}</div> : null}
              {request.appliedAt ? <div className="mt-1 text-xs text-muted-foreground">применено {formatDateTime(request.appliedAt)}</div> : null}
            </td>
            <td className="max-w-[260px] px-4 py-3 align-top">
              {request.payloadKeys.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {request.payloadKeys.map((key) => (
                    <Badge key={key} variant="outline" className="font-mono text-[11px]">
                      {key}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </td>
            <td className="min-w-[230px] px-4 py-3 align-top">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!request.actions.canApprove || actingId !== null}
                  onClick={() => runAction(request, 'approve')}
                >
                  {actingId === `${request.id}:approve` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Одобрить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!request.actions.canReject || actingId !== null}
                  onClick={() => runAction(request, 'reject')}
                >
                  {actingId === `${request.id}:reject` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
                  Отклонить
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!request.actions.canApply || actingId !== null}
                  onClick={() => runAction(request, 'apply')}
                >
                  {actingId === `${request.id}:apply` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                  Применить
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </DataTableShell>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Показано {formatNumber(offset + 1)}-{formatNumber(offset + payload.items.length)} из {formatNumber(payload.total)}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!canGoPrev} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Назад
          </Button>
          <Button variant="outline" size="sm" disabled={!canGoNext} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Вперед
          </Button>
        </div>
      </div>
    </div>
  );
}

function RequestsEmptyState() {
  return (
    <div className="px-4 py-12">
      <EmptyState
        icon={ClipboardCheck}
        title="Заявок пока нет"
        description="Когда поставщик или администратор создаст черновик изменения, он появится здесь для проверки и применения."
      />
    </div>
  );
}

function buildQuickFilters(payload: AdminEventChangeRequestsListDto) {
  return [
    { id: 'all', label: 'Все', count: payload.total },
    { id: 'SUBMITTED', label: 'На проверке', count: payload.facets.statuses.SUBMITTED || 0 },
    { id: 'APPROVED', label: 'Одобрены', count: payload.facets.statuses.APPROVED || 0 },
    { id: 'APPLY_FAILED', label: 'Ошибка применения', count: payload.facets.statuses.APPLY_FAILED || 0 },
    { id: 'REJECTED', label: 'Отклонены', count: payload.facets.statuses.REJECTED || 0 },
  ];
}

function normalizePayload(payload: AdminEventChangeRequestsListDto, params: URLSearchParams): AdminEventChangeRequestsListDto {
  return {
    ...emptyPayload(params),
    ...payload,
    facets: {
      statuses: payload.facets?.statuses || {},
      types: payload.facets?.types || {},
    },
    items: Array.isArray(payload.items) ? payload.items : [],
  };
}

function emptyPayload(params: URLSearchParams): AdminEventChangeRequestsListDto {
  const offset = Math.max(0, Number(params.get('offset') || 0) || 0);
  return {
    generatedAt: new Date().toISOString(),
    total: 0,
    limit: PAGE_SIZE,
    offset,
    hasMore: false,
    filters: {
      status: params.get('status'),
      type: params.get('type'),
      supplierId: null,
      eventId: null,
      q: params.get('q'),
    },
    facets: {
      statuses: {},
      types: {},
    },
    items: [],
  };
}

function requestStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'черновик',
    SUBMITTED: 'на проверке',
    APPROVED: 'одобрено',
    REJECTED: 'отклонено',
    APPLIED: 'применено',
    APPLY_FAILED: 'ошибка применения',
    CANCELLED: 'отменено',
  };
  return labels[status] || status;
}

function requestTypeLabel(type: string) {
  const labels: Record<string, string> = {
    CREATE: 'создание',
    UPDATE: 'контент',
    CONTENT_UPDATE: 'контент',
    MEDIA_UPDATE: 'медиа',
    SEO_UPDATE: 'SEO',
    SCHEDULE_UPDATE: 'расписание',
    OFFER_UPDATE: 'билеты и цены',
    PUBLISH: 'публикация',
    UNPUBLISH: 'снять с публикации',
    ARCHIVE: 'архив',
    DELETE: 'удаление',
  };
  return labels[type] || type;
}

function managementModeLabel(mode: string) {
  const labels: Record<string, string> = {
    SOURCE_MANAGED: 'импорт',
    DAIBILET_MANAGED: 'ведет Daibilet',
    SUPPLIER_DRAFTS: 'черновики поставщика',
    SUPPLIER_SELF_SERVICE: 'самообслуживание',
  };
  return labels[mode] || mode;
}

function statusTone(status: string): 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error' {
  if (status === 'APPLIED') return 'live';
  if (status === 'APPROVED') return 'ready';
  if (status === 'SUBMITTED') return 'incomplete';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'archived';
  if (status === 'APPLY_FAILED') return 'error';
  return 'draft';
}

function formatDateTime(value?: string | null) {
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
