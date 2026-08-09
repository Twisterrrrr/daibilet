import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileText, RefreshCcw, Search, WalletCards } from 'lucide-react';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/admin-api';
import { formatDateTime, formatNumber } from '@/data';

const PAGE_SIZE = 100;

type AdminFinanceLedgerDto = {
  generatedAt: string;
  filters: { supplier: string | null; from: string | null; to: string | null };
  metrics: {
    saleKopecks: number;
    commissionKopecks: number;
    refundKopecks: number;
    payoutKopecks: number;
    adjustmentKopecks: number;
    netKopecks: number;
    openRefundRequests: number;
    failedReceipts: number;
    draftReports: number;
    openSettlements: number;
    pendingDocuments: number;
  };
  suppliers: Array<{ id: string; slug: string; title: string }>;
  ledger: Array<{
    id: string;
    supplierId: string;
    supplierTitle: string;
    type: string;
    amountKopecks: number;
    currency: string;
    referenceType: string | null;
    referenceId: string | null;
    checkoutOrderId: string | null;
    note: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    status: string;
    supplierTitle: string | null;
    orderPublicCode: string | null;
    amountKopecks: number;
    currency: string;
    reason: string;
    reasonNote: string | null;
    adminComment: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    supplierTitle: string;
    periodStart: string;
    periodEnd: string;
    basis: string;
    status: string;
    hasConflict: boolean;
    grossKopecks: number;
    commissionKopecks: number;
    refundKopecks: number;
    netKopecks: number;
    createdAt: string;
  }>;
  settlements: Array<{
    id: string;
    supplierTitle: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    grossKopecks: number;
    commissionKopecks: number;
    adjustmentKopecks: number;
    netKopecks: number;
    paidAt: string | null;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    supplierTitle: string;
    type: string;
    status: string;
    title: string;
    filesCount: number;
    createdAt: string;
  }>;
  reconcile: { readyToDraftReport: boolean; blockers: string[]; nextActions: string[] };
};

type AdminFinanceClosePeriodDto = {
  generatedAt: string;
  report: AdminFinanceLedgerDto['reports'][number];
  settlement: AdminFinanceLedgerDto['settlements'][number];
  documents: AdminFinanceLedgerDto['documents'];
  actions: string[];
};

function emptyPayload(): AdminFinanceLedgerDto {
  return {
    generatedAt: new Date().toISOString(),
    filters: { supplier: null, from: null, to: null },
    metrics: {
      saleKopecks: 0,
      commissionKopecks: 0,
      refundKopecks: 0,
      payoutKopecks: 0,
      adjustmentKopecks: 0,
      netKopecks: 0,
      openRefundRequests: 0,
      failedReceipts: 0,
      draftReports: 0,
      openSettlements: 0,
      pendingDocuments: 0,
    },
    suppliers: [],
    ledger: [],
    refunds: [],
    reports: [],
    settlements: [],
    documents: [],
    reconcile: { readyToDraftReport: false, blockers: ['no_sales_ledger'], nextActions: [] },
  };
}

export function FinancePage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<AdminFinanceLedgerDto>(emptyPayload);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [closing, setClosing] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string | null>(null);
  const [closeResult, setCloseResult] = React.useState<AdminFinanceClosePeriodDto | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);

  const supplier = params.get('supplier') ?? 'all';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      setParams(next);
    },
    [params, setParams],
  );
  const refresh = React.useCallback(() => setReloadTick((value) => value + 1), []);
  const canClosePeriod = Boolean(
    payload.reconcile.readyToDraftReport &&
    payload.filters.supplier &&
    from &&
    to &&
    !closing,
  );

  const closePeriod = React.useCallback(() => {
    if (!payload.filters.supplier || !from || !to) {
      setCloseError('Выберите поставщика и период');
      return;
    }
    setClosing(true);
    setCloseError(null);
    setCloseResult(null);
    adminFetch('/api/admin/finance/close-period', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        supplierId: payload.filters.supplier,
        periodStart: `${from}T00:00:00.000Z`,
        periodEnd: `${to}T23:59:59.999Z`,
        basis: 'SOLD',
        issueDocuments: true,
      }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const blockers = Array.isArray(body?.blockers) ? body.blockers.map(financeBlockerLabel).join(', ') : null;
          throw new Error(blockers || body?.message || body?.error || `HTTP ${response.status}`);
        }
        return body as AdminFinanceClosePeriodDto;
      })
      .then((result) => {
        setCloseResult(result);
        refresh();
      })
      .catch((error) => setCloseError(error instanceof Error ? error.message : String(error)))
      .finally(() => setClosing(false));
  }, [from, payload.filters.supplier, refresh, to]);

  React.useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(params);
    query.set('limit', String(PAGE_SIZE));
    setLoading(true);
    adminFetch(`/api/admin/finance/ledger?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
        return body as AdminFinanceLedgerDto;
      })
      .then((data) => {
        setPayload({
          ...emptyPayload(),
          ...data,
          suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
          ledger: Array.isArray(data.ledger) ? data.ledger : [],
          refunds: Array.isArray(data.refunds) ? data.refunds : [],
          reports: Array.isArray(data.reports) ? data.reports : [],
          settlements: Array.isArray(data.settlements) ? data.settlements : [],
          documents: Array.isArray(data.documents) ? data.documents : [],
        });
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
  }, [params, reloadTick]);

  return (
    <div>
      <PageHeader
        title="Финансы"
        description="Ledger, возвраты, сверка, отчеты агента, расчеты и документы по внутренним продажам Daibilet."
        meta={
          <>
            <Badge variant="outline">close-period</Badge>
            <Badge variant={payload.reconcile.readyToDraftReport ? 'default' : 'outline'}>{payload.reconcile.readyToDraftReport ? 'готово к сверке' : 'есть blockers'}</Badge>
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <Card className="mt-4 border-border p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto] lg:items-center">
          <select value={supplier} onChange={(event) => setParam('supplier', event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Все поставщики</option>
            {payload.suppliers.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={from} onChange={(event) => setParam('from', event.target.value)} className="h-9 border-border bg-background pl-8 text-sm" />
          </div>
          <Input type="date" value={to} onChange={(event) => setParam('to', event.target.value)} className="h-9 border-border bg-background text-sm" />
          <div className="text-xs text-muted-foreground">{loading ? 'загрузка...' : `${formatNumber(payload.ledger.length)} операций`}</div>
        </div>
        {loadError ? <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">Сервер недоступен: {loadError}</div> : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <MetricCard label="продажи" value={formatMoneyKopecks(payload.metrics.saleKopecks)} icon={WalletCards} />
        <MetricCard label="комиссия" value={formatMoneyKopecks(payload.metrics.commissionKopecks)} icon={FileText} />
        <MetricCard label="возвраты" value={formatMoneyKopecks(payload.metrics.refundKopecks)} icon={AlertTriangle} />
        <MetricCard label="к расчету" value={formatMoneyKopecks(payload.metrics.netKopecks)} icon={CheckCircle2} />
        <MetricCard label="open refunds" value={formatNumber(payload.metrics.openRefundRequests)} icon={AlertTriangle} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Ledger</h2>
              <p className="mt-1 text-xs text-muted-foreground">Источник правды для сверки, отчетов и расчетов с поставщиками.</p>
            </div>
            <Badge variant="outline">{formatNumber(payload.ledger.length)} строк</Badge>
          </div>
          <div className="mt-3">
            <DataTableShell
              loading={loading}
              columns={['Дата', 'Поставщик', 'Тип', 'Сумма', 'Связь', 'Комментарий']}
              empty={!loading && !payload.ledger.length ? <EmptyState icon={WalletCards} title="Ledger пуст" description="Операции появятся после внутренних продаж Daibilet." /> : null}
            >
              {payload.ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{entry.supplierTitle}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{ledgerTypeLabel(entry.type)}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm">{formatMoneyKopecks(entry.amountKopecks, entry.currency)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{entry.referenceType || entry.checkoutOrderId || '-'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{entry.note || '-'}</td>
                </tr>
              ))}
            </DataTableShell>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-border p-4">
            <h2 className="text-sm font-semibold">Reconcile dry-run</h2>
            {!payload.filters.supplier ? (
              <div className="mt-3 rounded-md bg-secondary p-3 text-xs text-muted-foreground">Для закрытия периода выберите одного поставщика.</div>
            ) : null}
            {payload.reconcile.blockers.length ? (
              <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
                <div className="font-semibold">Blockers</div>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {payload.reconcile.blockers.map((blocker) => <li key={blocker}>{financeBlockerLabel(blocker)}</li>)}
                </ul>
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-success/20 bg-success/10 p-3 text-xs text-success">Период можно готовить к отчету и сверке.</div>
            )}
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {payload.reconcile.nextActions.map((action) => <li key={action}>{action}</li>)}
            </ul>
            {closeError ? <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{closeError}</div> : null}
            {closeResult ? (
              <div className="mt-3 rounded-md border border-success/20 bg-success/10 p-3 text-xs text-success">
                <div className="font-semibold">Период закрыт</div>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {closeResult.actions.map((action) => <li key={action}>{action}</li>)}
                </ul>
              </div>
            ) : null}
            <Button type="button" className="mt-3 w-full" size="sm" disabled={!canClosePeriod} onClick={closePeriod}>
              {closing ? 'Закрываем...' : 'Закрыть период и выпустить документы'}
            </Button>
          </Card>

          <SideList title="Открытые возвраты" empty="Открытых возвратов нет">
            {payload.refunds.map((refund) => (
              <SideRow
                key={refund.id}
                title={`${refund.supplierTitle || 'Поставщик'} - №${refund.orderPublicCode || refund.id.slice(-6)}`}
                value={formatMoneyKopecks(refund.amountKopecks, refund.currency)}
                meta={`${refundReasonLabel(refund.reason)} - ${refundStatusLabel(refund.status)}`}
              />
            ))}
          </SideList>

          <SideList title="Отчеты и документы" empty="Документов пока нет">
            {payload.reports.slice(0, 4).map((report) => (
              <SideRow
                key={report.id}
                title={`${report.supplierTitle} - ${reportStatusLabel(report.status)}`}
                value={formatMoneyKopecks(report.netKopecks)}
                meta={`${formatDateTime(report.periodStart)} - ${formatDateTime(report.periodEnd)}`}
              />
            ))}
            {payload.documents.slice(0, 4).map((document) => (
              <SideRow
                key={document.id}
                title={document.title}
                value={documentStatusLabel(document.status)}
                meta={`${documentTypeLabel(document.type)} - файлов ${formatNumber(document.filesCount)}`}
              />
            ))}
          </SideList>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof WalletCards }) {
  return (
    <Card className="border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-info" />
      </div>
    </Card>
  );
}

function SideList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Card className="border-border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length ? items : <div className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">{empty}</div>}
      </div>
    </Card>
  );
}

function SideRow({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <div className="rounded-md border border-border p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-foreground">{title}</span>
        <span className="shrink-0 font-mono">{value}</span>
      </div>
      <div className="mt-1 text-muted-foreground">{meta}</div>
    </div>
  );
}

function financeBlockerLabel(code: string) {
  if (code === 'open_refund_requests') return 'Есть открытые заявки на возврат';
  if (code === 'failed_fiscal_receipts') return 'Есть ошибки чеков';
  if (code === 'no_sales_ledger') return 'Нет продаж в ledger за период';
  return code;
}

function ledgerTypeLabel(type: string) {
  if (type === 'SALE') return 'продажа';
  if (type === 'COMMISSION') return 'комиссия';
  if (type === 'REFUND') return 'возврат';
  if (type === 'PAYOUT') return 'выплата';
  if (type === 'ADJUSTMENT') return 'корректировка';
  return type;
}

function refundReasonLabel(reason: string) {
  if (reason === 'USER_REQUEST') return 'запрос покупателя';
  if (reason === 'EVENT_CANCELLED') return 'отмена события';
  if (reason === 'SUPPORT') return 'поддержка';
  return 'другое';
}

function refundStatusLabel(status: string) {
  if (status === 'CREATED') return 'создан';
  if (status === 'APPROVED') return 'одобрен';
  if (status === 'PROCESSING') return 'в обработке';
  if (status === 'COMPLETED') return 'завершен';
  if (status === 'REJECTED') return 'отклонен';
  if (status === 'FAILED') return 'ошибка';
  return status;
}

function reportStatusLabel(status: string) {
  if (status === 'DRAFT') return 'черновик';
  if (status === 'FINAL') return 'финальный';
  return status;
}

function documentTypeLabel(type: string) {
  if (type === 'AGENT_REPORT') return 'отчет агента';
  if (type === 'SERVICE_ACT') return 'акт услуг';
  if (type === 'PAYOUT_STATEMENT') return 'реестр выплат';
  return type;
}

function documentStatusLabel(status: string) {
  if (status === 'DRAFT') return 'черновик';
  if (status === 'GENERATED') return 'сформирован';
  if (status === 'ISSUED') return 'выставлен';
  if (status === 'SIGNED') return 'подписан';
  if (status === 'FAILED') return 'ошибка';
  return status;
}

function formatMoneyKopecks(value?: number | null, currency = 'RUB') {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const rub = amount / 100;
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rub);
  return `${formatted} ${currency === 'RUB' ? 'руб.' : currency}`;
}
