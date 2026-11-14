import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, EyeOff, Loader2, MessageSquareQuote, RefreshCcw, XCircle } from 'lucide-react';

import type { AdminReviewRowDto, AdminReviewsListDto } from '@daibilet/contracts/admin';
import { adminFetch } from '@/lib/admin-api';
import { DataTableShell, EmptyState, InfoNote, PageHeader, QuickFilterBar, StatusBadge } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/data';

const PAGE_SIZE = 30;

const STATUS_FILTERS = [
  { id: 'PENDING_MODERATION', label: 'На модерации' },
  { id: 'APPROVED', label: 'Одобренные' },
  { id: 'REJECTED', label: 'Отклонённые' },
  { id: 'PENDING_EMAIL', label: 'Ждут email' },
  { id: 'HIDDEN', label: 'Скрытые' },
  { id: 'all', label: 'Все' },
];

function emptyPayload(): AdminReviewsListDto {
  return { items: [], total: 0, page: 1, pages: 1, pendingCount: 0 };
}

export function ReviewsPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<AdminReviewsListDto>(emptyPayload);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);

  const status = params.get('status') ?? 'PENDING_MODERATION';
  const page = Math.max(1, Number(params.get('page') || 1) || 1);

  const setStatus = React.useCallback(
    (next: string) => {
      const q = new URLSearchParams(params);
      if (!next || next === 'PENDING_MODERATION') q.delete('status');
      else q.set('status', next);
      q.delete('page');
      setParams(q);
    },
    [params, setParams],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams();
    q.set('limit', String(PAGE_SIZE));
    q.set('page', String(page));
    if (status !== 'all') q.set('status', status);

    setLoading(true);
    setLoadError(null);
    adminFetch(`/api/admin/reviews?${q}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
        return body as AdminReviewsListDto;
      })
      .then((data) => setPayload(data))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(emptyPayload());
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [status, page, reloadTick]);

  async function moderate(review: AdminReviewRowDto, action: 'approve' | 'reject' | 'hide') {
    setActingId(review.id);
    try {
      const comment =
        action === 'reject' ? window.prompt('Комментарий модератора (необязательно):', '') ?? undefined : undefined;
      const response = await adminFetch(`/api/admin/reviews/${encodeURIComponent(review.id)}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminComment: comment || null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
      setReloadTick((v) => v + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Отзывы"
        description="Модерация отзывов покупателей. Disputes / ЛК поставщика — вне scope."
        meta={
          payload.pendingCount > 0 ? (
            <span className="text-xs text-amber-700">В очереди: {formatNumber(payload.pendingCount)}</span>
          ) : null
        }
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadTick((v) => v + 1)}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <InfoNote>
        Верификация через ExternalOrder (TC) или deep-link из email. Публично: «Иван К.» + бейдж «Покупка подтверждена».
      </InfoNote>

      {loadError ? (
        <Card className="border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          Сервер недоступен: {loadError}
        </Card>
      ) : null}

      <QuickFilterBar items={STATUS_FILTERS} activeId={status} onChange={setStatus} />

      <DataTableShell
        loading={loading}
        columns={['Отзыв', 'Событие', 'Покупатель', 'Статус', 'Действия']}
        empty={
          !loading && payload.items.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="Очередь пуста"
              description="Новые отзывы появятся здесь после отправки с сайта или deep-link."
            />
          ) : null
        }
      >
        {payload.items.map((review) => (
          <tr key={review.id} className="border-b border-border align-top">
            <td className="px-4 py-3">
              <div className="text-amber-600">{'★'.repeat(review.rating)}</div>
              {review.title ? <div className="mt-1 text-sm font-medium text-foreground">{review.title}</div> : null}
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{review.text}</p>
              {review.purchaseRef ? <div className="mt-1 text-[11px] text-muted-foreground">Ref: {review.purchaseRef}</div> : null}
            </td>
            <td className="px-4 py-3 text-sm">
              <div className="font-medium text-foreground">{review.event?.title || '—'}</div>
              <div className="text-xs text-muted-foreground">{review.event?.slug}</div>
            </td>
            <td className="px-4 py-3 text-sm">
              <div className="font-medium">{review.authorName}</div>
              <div className="text-xs text-muted-foreground">{review.authorEmail}</div>
              {review.isVerified ? (
                <div className="mt-1 text-[11px] font-medium text-emerald-700">Покупка подтверждена</div>
              ) : null}
              <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(review.createdAt)}</div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={statusTone(review.status)} label={statusLabel(review.status)} />
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  disabled={actingId === review.id || review.status === 'APPROVED'}
                  onClick={() => void moderate(review, 'approve')}
                >
                  {actingId === review.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                  Одобрить
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={actingId === review.id || review.status === 'REJECTED'}
                  onClick={() => void moderate(review, 'reject')}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Отклонить
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={actingId === review.id || review.status === 'HIDDEN'}
                  onClick={() => void moderate(review, 'hide')}
                >
                  <EyeOff className="mr-1 h-3.5 w-3.5" />
                  Скрыть
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </DataTableShell>

      {payload.pages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Стр. {payload.page} / {payload.pages} · всего {formatNumber(payload.total)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const q = new URLSearchParams(params);
                q.set('page', String(page - 1));
                setParams(q);
              }}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= payload.pages}
              onClick={() => {
                const q = new URLSearchParams(params);
                q.set('page', String(page + 1));
                setParams(q);
              }}
            >
              Вперёд
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusTone(status: string): 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error' {
  if (status === 'APPROVED') return 'live';
  if (status === 'PENDING_MODERATION') return 'incomplete';
  if (status === 'PENDING_EMAIL') return 'paused';
  if (status === 'REJECTED' || status === 'HIDDEN') return 'archived';
  return 'draft';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_MODERATION: 'На модерации',
    PENDING_EMAIL: 'Ждёт email',
    APPROVED: 'Одобрен',
    REJECTED: 'Отклонён',
    HIDDEN: 'Скрыт',
  };
  return map[status] || status;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}
