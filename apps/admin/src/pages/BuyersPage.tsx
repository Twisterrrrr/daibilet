import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Mail, Phone, Receipt, Search, Ticket, UserRound } from 'lucide-react';

import { DataTableShell, EmptyState, InfoNote, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/data';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

type BuyerStatusTone = 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error';

type AdminBuyerRow = {
  id: string;
  displayName: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  lookup?: string | null;
  orders: number;
  tickets: number;
  activeOrders: number;
  canceledOrders: number;
  needsAttention: number;
  amountRub?: number | null;
  lastOrderAt?: string | null;
  lastOrderNumber?: string | null;
  lastOrderStatusLabel?: string | null;
  lastOrderTone?: BuyerStatusTone | null;
  providers: string[];
  eventTitles: string[];
  orderNumbers: string[];
  hasContact: boolean;
  statusTone: BuyerStatusTone;
  statusLabel: string;
};

type AdminBuyersPayload = {
  generatedAt: string;
  total: number;
  rows: AdminBuyerRow[];
  metrics: {
    buyers: number;
    withContacts: number;
    orders: number;
    tickets: number;
    needsAttention: number;
  };
};

export function BuyersPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<AdminBuyersPayload>(() => emptyPayload());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const q = params.get('q') || '';

  React.useEffect(() => {
    const controller = new AbortController();
    const queryParams = new URLSearchParams({ limit: '160' });
    if (q.trim()) queryParams.set('q', q.trim());
    setLoading(true);

    fetch(`${API_BASE_URL}/api/admin/buyers?${queryParams.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminBuyersPayload;
      })
      .then((data) => {
        setPayload(normalizePayload(data));
        setError(null);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setPayload(emptyPayload());
          setError(requestError instanceof Error ? requestError.message : String(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [q]);

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value.trim()) next.set('q', value);
    else next.delete('q');
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        title="Покупатели"
        description="Сводка по людям из заказов: контакты, последние покупки, билеты и быстрый переход к заказам."
        meta={
          <>
            <Badge variant="outline">MVP без регистрации</Badge>
            <Badge variant="outline">данные из заказов</Badge>
          </>
        }
      />

      <InfoNote>
        Это не полноценный личный кабинет и не CRM. Пока здесь только операционная сводка по данным, которые пришли от билетных систем или были добавлены вручную в заказ.
      </InfoNote>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <MetricCard label="покупателей" value={payload.metrics.buyers} icon={UserRound} />
        <MetricCard label="с контактами" value={payload.metrics.withContacts} icon={Mail} />
        <MetricCard label="заказов" value={payload.metrics.orders} icon={Receipt} />
        <MetricCard label="билетов" value={payload.metrics.tickets} icon={Ticket} />
        <MetricCard label="требуют внимания" value={payload.metrics.needsAttention} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по имени, email, телефону или заказу" className="pl-9" />
        </label>
        <div className="text-xs text-muted-foreground">{formatNumber(payload.rows.length)} строк в выдаче</div>
      </div>

      {error ? <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        loading={loading}
        columns={['Покупатель', 'Контакты', 'Заказы', 'Последний заказ', 'События', 'Действия']}
        empty={!loading && payload.rows.length === 0 ? <EmptyState icon={UserRound} title="Покупатели не найдены" description="Попробуйте изменить поиск или синхронизировать заказы." /> : null}
      >
        {payload.rows.map((buyer) => (
          <tr key={buyer.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
            <td className="min-w-[260px] px-4 py-3 align-top">
              <div className="font-medium text-foreground">{buyer.displayName}</div>
              {buyer.notes ? <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{buyer.notes}</div> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {buyer.providers.map((provider) => (
                  <Badge key={provider} variant="outline">{provider}</Badge>
                ))}
              </div>
            </td>
            <td className="min-w-[220px] px-4 py-3 align-top text-sm">
              <ContactLine icon={Mail} value={buyer.email} />
              <ContactLine icon={Phone} value={buyer.phone} />
              {!buyer.hasContact ? <div className="text-xs text-muted-foreground">контакты не переданы</div> : null}
            </td>
            <td className="px-4 py-3 align-top">
              <StatusBadge status={buyer.statusTone} label={buyer.statusLabel} />
              <div className="mt-2 text-xs text-muted-foreground">
                {formatNumber(buyer.orders)} зак. · {formatNumber(buyer.tickets)} бил.
              </div>
              {buyer.amountRub ? <div className="mt-1 text-xs text-muted-foreground">{formatMoneyRub(buyer.amountRub)}</div> : null}
            </td>
            <td className="min-w-[180px] px-4 py-3 align-top text-sm">
              <div className="font-mono text-xs text-foreground">№{buyer.lastOrderNumber || '-'}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDate(buyer.lastOrderAt)}</div>
              {buyer.lastOrderStatusLabel ? <Badge variant="outline" className="mt-2">{buyer.lastOrderStatusLabel}</Badge> : null}
            </td>
            <td className="min-w-[280px] px-4 py-3 align-top">
              <div className="space-y-1">
                {buyer.eventTitles.slice(0, 3).map((title) => (
                  <div key={title} className="line-clamp-1 text-sm text-foreground">{title}</div>
                ))}
                {!buyer.eventTitles.length ? <span className="text-xs text-muted-foreground">события не связаны</span> : null}
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              <Button variant="outline" size="sm" onClick={() => openOrders(buyer)}>
                Заказы
              </Button>
            </td>
          </tr>
        ))}
      </DataTableShell>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: typeof Receipt; tone?: 'default' | 'warning' }) {
  return (
    <Card className="border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(value)}</div>
        </div>
        <Icon className={`h-5 w-5 ${tone === 'warning' ? 'text-warning-foreground' : 'text-info'}`} />
      </div>
    </Card>
  );
}

function ContactLine({ icon: Icon, value }: { icon: typeof Mail; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="max-w-[190px] truncate">{value}</span>
    </div>
  );
}

function openOrders(buyer: AdminBuyerRow) {
  const lookup = buyer.email || buyer.phone || buyer.lastOrderNumber || buyer.lookup || '';
  window.location.href = `/orders${lookup ? `?q=${encodeURIComponent(lookup)}` : ''}`;
}

function normalizePayload(payload: AdminBuyersPayload): AdminBuyersPayload {
  const empty = emptyPayload();
  return {
    ...empty,
    ...payload,
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    metrics: { ...empty.metrics, ...(payload.metrics || {}) },
  };
}

function emptyPayload(): AdminBuyersPayload {
  return {
    generatedAt: new Date().toISOString(),
    total: 0,
    rows: [],
    metrics: {
      buyers: 0,
      withContacts: 0,
      orders: 0,
      tickets: 0,
      needsAttention: 0,
    },
  };
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoneyRub(value?: number | null) {
  if (!value) return '-';
  return `${formatNumber(value)} ₽`;
}
