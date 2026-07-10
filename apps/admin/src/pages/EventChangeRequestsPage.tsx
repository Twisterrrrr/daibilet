import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, FileJson, Loader2, RefreshCcw, Search, Send, XCircle } from 'lucide-react';

import type {
  AdminEventChangeRequestDetailDto,
  AdminEventChangeRequestDiffItemDto,
  AdminEventChangeRequestRowDto,
  AdminEventChangeRequestsListDto,
} from '@daibilet/contracts/admin';
import { DataTableShell, EmptyState, InfoNote, PageHeader, QuickFilterBar, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AdminEventChangeRequestDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

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

  const loadDetail = React.useCallback((requestId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    fetch(`${API_BASE_URL}/api/admin/event-change-requests/${encodeURIComponent(requestId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
        return body as AdminEventChangeRequestDetailDto;
      })
      .then((data) => setDetail(data))
      .catch((error) => {
        setDetail(null);
        setDetailError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setDetailLoading(false));
  }, []);

  const openDetail = React.useCallback(
    (request: AdminEventChangeRequestRowDto) => {
      setSelectedRequestId(request.id);
      setDetail(null);
      loadDetail(request.id);
    },
    [loadDetail],
  );

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
        .then(() => {
          if (selectedRequestId === request.id) loadDetail(request.id);
        })
        .catch((error) => setActionError(error instanceof Error ? error.message : String(error)))
        .finally(() => setActingId(null));
    },
    [loadDetail, refresh, selectedRequestId],
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
                  onClick={() => openDetail(request)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Открыть
                </Button>
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

      <RequestDetailSheet
        open={Boolean(selectedRequestId)}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        actingId={actingId}
        onRefresh={() => selectedRequestId && loadDetail(selectedRequestId)}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedRequestId(null);
          setDetail(null);
          setDetailError(null);
        }}
        onAction={runAction}
      />

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

function RequestDetailSheet({
  open,
  detail,
  loading,
  error,
  actingId,
  onRefresh,
  onOpenChange,
  onAction,
}: {
  open: boolean;
  detail: AdminEventChangeRequestDetailDto | null;
  loading: boolean;
  error: string | null;
  actingId: string | null;
  onRefresh: () => void;
  onOpenChange: (open: boolean) => void;
  onAction: (request: AdminEventChangeRequestRowDto, action: ActionName) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[min(980px,96vw)] flex-col overflow-y-auto sm:max-w-[980px]">
        <div className="pr-8">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загружаем заявку...
            </div>
          ) : error ? (
            <Card className="border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={statusTone(detail.status)} label={requestStatusLabel(detail.status)} />
                <Badge variant="outline">{requestTypeLabel(detail.type)}</Badge>
                {detail.event?.scheduleLocked ? <Badge variant="outline">расписание закрыто</Badge> : null}
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold leading-snug">{detail.title || detail.event?.title || requestTypeLabel(detail.type)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail.event?.title || 'Новое событие'} · {detail.supplier?.title || 'поставщик не указан'}
                  </p>
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">{detail.id}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={onRefresh}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Обновить
                  </Button>
                  <Button variant="outline" size="sm" disabled={!detail.actions.canApprove || actingId !== null} onClick={() => onAction(detail, 'approve')}>
                    {actingId === `${detail.id}:approve` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                    Одобрить
                  </Button>
                  <Button variant="outline" size="sm" disabled={!detail.actions.canReject || actingId !== null} onClick={() => onAction(detail, 'reject')}>
                    {actingId === `${detail.id}:reject` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
                    Отклонить
                  </Button>
                  <Button variant="default" size="sm" disabled={!detail.actions.canApply || actingId !== null} onClick={() => onAction(detail, 'apply')}>
                    {actingId === `${detail.id}:apply` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    Применить
                  </Button>
                </div>
              </div>

              {detail.diff.warnings.length ? (
                <div className="mt-5 space-y-2">
                  {detail.diff.warnings.map((warning) => (
                    <div key={warning} className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <Card className="mt-5 border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Что изменится</h3>
                  <Badge variant="outline">{formatNumber(detail.diff.items.length)} полей</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Поле</th>
                        <th className="px-3 py-2 font-medium">Сейчас</th>
                        <th className="px-3 py-2 font-medium">Будет</th>
                        <th className="py-2 pl-3 font-medium">Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.diff.items.map((item) => (
                        <tr key={item.path} className="border-b border-border last:border-0">
                          <td className="min-w-[180px] py-3 pr-3 align-top">
                            <div className="font-medium text-foreground">{item.label}</div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{item.path}</div>
                          </td>
                          <td className="max-w-[280px] px-3 py-3 align-top text-xs text-muted-foreground">
                            <DiffValue value={item.currentValue} />
                          </td>
                          <td className="max-w-[280px] px-3 py-3 align-top text-xs text-foreground">
                            <DiffValue value={item.proposedValue} />
                          </td>
                          <td className="py-3 pl-3 align-top">
                            <ChangeTypeBadge item={item} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!detail.diff.items.length ? (
                  <div className="rounded-md bg-secondary p-4 text-sm text-muted-foreground">Для этой заявки нет вычисленного diff. Проверь payload preview ниже.</div>
                ) : null}
              </Card>

              <div className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Card className="border-border p-4">
                  <h3 className="text-sm font-semibold">Контекст</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <DetailTerm label="Событие" value={detail.event?.title || 'Новое событие'} />
                    <DetailTerm label="Slug" value={detail.event?.slug || '-'} mono />
                    <DetailTerm label="Поставщик" value={detail.supplier?.title || '-'} />
                    <DetailTerm label="Создал" value={detail.createdBy?.email || '-'} />
                    <DetailTerm label="Проверил" value={detail.reviewedBy?.email || '-'} />
                    <DetailTerm label="Создано" value={formatDateTime(detail.createdAt)} />
                    <DetailTerm label="Обновлено" value={formatDateTime(detail.updatedAt)} />
                  </dl>
                </Card>

                <Card className="border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Payload preview</h3>
                  </div>
                  {detail.payloadPreview.baseSnapshot ? (
                    <PayloadBlock title="Base snapshot" value={detail.payloadPreview.baseSnapshot} />
                  ) : null}
                  <div className="mt-3 space-y-3">
                    {detail.payloadPreview.sections.map((section) => (
                      <PayloadBlock key={section.id} title={section.title} value={section.value} />
                    ))}
                    {!detail.payloadPreview.sections.length ? (
                      <div className="rounded-md bg-secondary p-4 text-sm text-muted-foreground">Payload пустой.</div>
                    ) : null}
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailTerm({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'break-all font-mono text-xs text-foreground' : 'text-foreground'}>{value}</dd>
    </div>
  );
}

function PayloadBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      <pre className="max-h-72 overflow-auto rounded-md bg-secondary p-3 text-xs leading-relaxed text-foreground">
        {formatJson(value)}
      </pre>
    </div>
  );
}

function DiffValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>;
  if (typeof value === 'object') {
    return <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-secondary p-2">{formatJson(value)}</pre>;
  }
  return <span className="whitespace-pre-wrap">{String(value)}</span>;
}

function ChangeTypeBadge({ item }: { item: AdminEventChangeRequestDiffItemDto }) {
  const labels: Record<AdminEventChangeRequestDiffItemDto['changeType'], string> = {
    added: 'добавлено',
    changed: 'изменено',
    removed: 'удалено',
    unchanged: 'без изменений',
  };
  const className =
    item.changeType === 'added'
      ? 'border-success/20 bg-success/10 text-success'
      : item.changeType === 'removed'
        ? 'border-destructive/20 bg-destructive/10 text-destructive'
        : item.changeType === 'unchanged'
          ? 'border-border text-muted-foreground'
          : 'border-info/20 bg-info/10 text-info';
  return <Badge variant="outline" className={className}>{labels[item.changeType]}</Badge>;
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

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
