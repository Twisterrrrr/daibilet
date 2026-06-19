import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Layers,
  MapPin,
  Megaphone,
  PlayCircle,
  Plus,
  Receipt,
  RefreshCw,
  Search,
} from 'lucide-react';

import { PageHeader, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { adminData, formatNumber } from '@/data';
import type { AdminData, AdminSourceRow } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

type OrderMetrics = {
  imported: number;
  confirmed: number;
  processing: number;
  failedIntegration: number;
};

export function DashboardPage() {
  const [sources, setSources] = React.useState<AdminSourceRow[]>([]);
  const [orderMetrics, setOrderMetrics] = React.useState<OrderMetrics>({ imported: 0, confirmed: 0, processing: 0, failedIntegration: 0 });
  const [dashboardMetrics, setDashboardMetrics] = React.useState<AdminData['metrics']>(adminData.metrics);
  const sourceRows = sources.length ? sources : fallbackSourceRows();
  const sourceEvents = sources.length ? sources.reduce((sum, source) => sum + source.events, 0) : 0;
  const liveSources = sourceRows.filter((source) => source.status === 'live').length;
  const sessions = sourceRows.reduce((sum, source) => sum + source.sessions, 0);
  const launch = dashboardMetrics.launch || adminData.metrics.launch || fallbackLaunchMetrics();
  const events = sourceEvents || launch.groupedEvents || dashboardMetrics.events || adminData.metrics.events;
  const landingHits = launch.landingMatched || adminData.eventRows.filter((event) => event.landingHits.length > 0).length;
  const venues = sourceRows.length ? sourceRows.reduce((sum, source) => sum + source.venues, 0) : dashboardMetrics.venues || adminData.metrics.venues;

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/admin/dashboard`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as Pick<AdminData, 'metrics'>;
      })
      .then((payload) => setDashboardMetrics(payload.metrics || adminData.metrics))
      .catch(() => {
        if (!controller.signal.aborted) setDashboardMetrics(adminData.metrics);
      });

    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/admin/sources`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { sources?: AdminSourceRow[] };
      })
      .then((payload) => setSources(payload.sources || []))
      .catch(() => {
        if (!controller.signal.aborted) setSources([]);
      });

    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/admin/orders?limit=1`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { metrics?: Partial<OrderMetrics> };
      })
      .then((payload) =>
        setOrderMetrics({
          imported: payload.metrics?.imported ?? 0,
          confirmed: payload.metrics?.confirmed ?? 0,
          processing: payload.metrics?.processing ?? 0,
          failedIntegration: payload.metrics?.failedIntegration ?? 0,
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setOrderMetrics({ imported: 0, confirmed: 0, processing: 0, failedIntegration: 0 });
      });

    return () => controller.abort();
  }, []);

  return (
    <div>
      <PageHeader
        title="Готовность к продажам"
        description="Что мешает импортированным событиям продаваться и что уже можно выпускать в SEO-трафик. Контур оплат остается на стороне Ticketscloud и Teplohod.info."
        meta={
          <>
            <SourceBadge source="ticketscloud" />
            <SourceBadge source="teplohod" />
            <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Imported Sales MVP
            </Badge>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sources">
                <RefreshCw className="mr-2 h-4 w-4" />
                Источники
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/events?view=ready_publish">
                <PlayCircle className="mr-2 h-4 w-4" />
                Готовые события
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <TopMetric label="Можно продавать" value={launch.readyForSales} tone="success" to="/events" />
        <TopMetric label="Карточек событий" value={events} tone="default" to="/events" />
        <TopMetric label="Активных источников" value={liveSources} tone="success" to="/sources" />
        <TopMetric label="Площадок" value={venues} tone="info" to="/venues" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Block title="Контроль каталога" icon={Layers} href="/events" hrefLabel="К событиям">
          <LaunchReadiness metrics={launch} />
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={CheckCircle2} label="Можно продавать" value={launch.readyForSales} tone="success" to="/events" />
            <Metric icon={AlertTriangle} label="Без цены" value={launch.priceBlocked} tone="warning" to="/events?q=проверить%20цену" />
            <Metric icon={Receipt} label="Без покупки" value={launch.purchaseBlocked} tone={launch.purchaseBlocked ? 'destructive' : 'success'} to="/events?view=purchase_blocked" />
            <Metric icon={ImageIcon} label="Без фото" value={launch.noImage} tone="warning" to="/events?view=no_image" />
          </div>
        </Block>

        <Block title="Двигатель SEO-трафика" icon={Megaphone} href="/landings" hrefLabel="К лендингам">
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={Megaphone} label="Лендингов" value={dashboardMetrics.landingRules || adminData.metrics.landingRules} tone="info" to="/landings" />
            <Metric icon={Layers} label="Событий в выборках" value={landingHits} tone="success" to="/events?view=landing_match" />
            <Metric icon={Building2} label="Хабы площадок" value={venues} to="/venues" />
            <Metric icon={MapPin} label="Городов/регионов" value={dashboardMetrics.destinations || adminData.metrics.destinations} to="/cities" />
          </div>
        </Block>

        <Block title="Состояние импортов" icon={RefreshCw} href="/sources" hrefLabel="К источникам">
          <div className="space-y-2">
            {sourceRows.map((source) => (
              <ImportRow
                key={source.code}
                source={source.name}
                status={source.status}
                mode={`${formatNumber(source.events)} карточек · ${formatNumber(source.sessions)} сеансов`}
                live={source.status === 'live'}
              />
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Metric icon={Layers} label="Категорий" value={adminData.importJob.categories} to="/taxonomy" />
              <Metric icon={MapPin} label="Городов" value={adminData.importJob.cities} to="/cities" />
            </div>
          </div>
        </Block>

        <Block title="Заказы" icon={Receipt} href="/orders" hrefLabel="К заказам">
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={Receipt} label="Импортировано" value={orderMetrics.imported} to="/orders" />
            <Metric icon={CheckCircle2} label="Подтверждено" value={orderMetrics.confirmed} tone="success" to="/orders" />
            <Metric icon={Clock} label="В обработке" value={orderMetrics.processing} tone="info" to="/orders?view=attention" />
            <Metric icon={AlertTriangle} label="Проблемы" value={orderMetrics.failedIntegration} tone="warning" to="/orders?view=failed_integration" />
          </div>
          <div className="mt-3 rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
            Зеркало заказов из источников без внутреннего checkout и платежного контура Дайбилета.
          </div>
        </Block>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Быстрые действия</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/sources">
              <RefreshCw className="mr-2 h-4 w-4" />
              Запустить импорт
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/events?view=ready_publish">
              <PlayCircle className="mr-2 h-4 w-4" />
              Проверить готовые
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/landings">
              <Plus className="mr-2 h-4 w-4" />
              Лендинги
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/venues">
              <Search className="mr-2 h-4 w-4" />
              Кандидаты площадок
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Block({
  title,
  href,
  hrefLabel,
  children,
  icon: Icon,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  icon: typeof Layers;
}) {
  return (
    <Card className="flex flex-col border-border p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {href ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to={href}>
              {hrefLabel ?? 'Открыть'}
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </Card>
  );
}

type LaunchMetrics = NonNullable<(typeof adminData.metrics)['launch']>;

function LaunchReadiness({ metrics }: { metrics: LaunchMetrics }) {
  const total = Math.max(0, metrics.groupedEvents || 0);
  const ready = Math.max(0, metrics.readyForSales || 0);
  const percent = total ? Math.round((ready / total) * 100) : 0;

  return (
    <div className="mb-4 rounded-md border border-border bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Запуск продаж</div>
          <div className="mt-1 text-sm text-foreground">
            {formatNumber(ready)} из {formatNumber(total)} карточек готовы к переходу в покупку
          </div>
        </div>
        <Badge variant="outline" className={percent >= 80 ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning-foreground'}>
          {percent}%
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Для первых продаж держим в public только карточки с ценой от 100 ₽ и рабочей покупкой.
      </div>
    </div>
  );
}

function TopMetric({ label, value, tone, to }: { label: string; value: number; tone: 'default' | 'success' | 'warning' | 'info'; to: string }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning-foreground' : tone === 'info' ? 'text-info' : 'text-foreground';
  return (
    <Link to={to} className="rounded-lg border border-border bg-card p-4 transition hover:bg-secondary/40">
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{formatNumber(value)}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

function fallbackLaunchMetrics(): LaunchMetrics {
  const events = adminData.eventRows || [];
  const readyForSales = events.filter((event) => event.purchaseReady && event.priceFrom != null && event.priceFrom >= 100 && event.startsAt).length;
  return {
    groupedEvents: adminData.metrics.events || events.length,
    readyForSales,
    readyForSeo: adminData.metrics.readyEvents || 0,
    needsAttention: adminData.metrics.reviewEvents || 0,
    priceBlocked: events.filter((event) => event.priceFrom == null).length,
    purchaseBlocked: events.filter((event) => !event.purchaseReady && !String(event.offerStatus || '').toLowerCase().includes('widget')).length,
    noImage: events.filter((event) => !event.hasImage).length,
    landingMatched: events.filter((event) => event.landingHits.length > 0).length,
  };
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = 'default',
  to,
}: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  to?: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning-foreground'
        : tone === 'destructive'
          ? 'text-destructive'
          : tone === 'info'
            ? 'text-info'
            : 'text-foreground';
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2.5 transition hover:bg-secondary">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${toneClass}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-sm font-semibold tabular-nums ${toneClass}`}>{typeof value === 'number' ? formatNumber(value) : value}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function ImportRow({ source, status, mode, live }: { source: string; status: string; mode: string; live?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2.5">
      <div>
        <div className="text-sm font-medium">{source}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{mode}</div>
      </div>
      {live ? <StatusBadge status="live" label={status} /> : <StatusBadge status="incomplete" label={status} />}
    </div>
  );
}

function fallbackSourceRows(): AdminSourceRow[] {
  const grouped = new Map<string, AdminSourceRow>();
  for (const event of adminData.eventRows) {
    const code = String(event.sourceCode || event.offerSourceCode || event.source || 'TICKETSCLOUD').toUpperCase().includes('TEPLOHOD') ? 'TEPLOHOD' : 'TICKETSCLOUD';
    const current =
      grouped.get(code) ||
      ({
        id: code,
        code,
        name: code === 'TEPLOHOD' ? 'Teplohod.info' : 'Ticketscloud',
        enabled: true,
        status: 'live',
        purchaseReady: true,
        events: 0,
        venues: 0,
        cities: 0,
        sessions: 0,
        offers: 0,
      } satisfies AdminSourceRow);
    current.events += 1;
    current.sessions += event.slotCount || 1;
    grouped.set(code, current);
  }
  return Array.from(grouped.values());
}
