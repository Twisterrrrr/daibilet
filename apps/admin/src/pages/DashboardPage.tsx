import * as React from 'react';
import type { AdminDashboardDto, AdminDashboardLaunchMetrics, AdminDashboardMetrics } from '@daibilet/contracts/admin';
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
import { formatNumber } from '@/data';
import type { AdminSourceRow } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

type OrderMetrics = {
  imported: number;
  confirmed: number;
  processing: number;
  failedIntegration: number;
};

const EMPTY_DASHBOARD_METRICS: AdminDashboardMetrics = {
  events: 0,
  sourceEvents: 0,
  readyEvents: 0,
  reviewEvents: 0,
  blockedEvents: 0,
  sources: 0,
  venues: 0,
  cities: 0,
  categories: 0,
  tags: 0,
  landingRules: 0,
  destinations: 0,
  orders: 0,
  launch: emptyLaunchMetrics(),
};

export function DashboardPage() {
  const [sources, setSources] = React.useState<AdminSourceRow[]>([]);
  const [orderMetrics, setOrderMetrics] = React.useState<OrderMetrics>({ imported: 0, confirmed: 0, processing: 0, failedIntegration: 0 });
  const [dashboardMetrics, setDashboardMetrics] = React.useState<AdminDashboardMetrics>(EMPTY_DASHBOARD_METRICS);
  const [dashboardError, setDashboardError] = React.useState(false);
  const [sourcesError, setSourcesError] = React.useState(false);
  const [ordersError, setOrdersError] = React.useState(false);
  const sourceRows = sources;
  const sourceEvents = sources.reduce((sum, source) => sum + source.counts.groupedEvents, 0);
  const liveSources = sourceRows.filter((source) => source.catalogState === 'live').length;
  const sessions = sourceRows.reduce((sum, source) => sum + source.counts.sessions, 0);
  const launch = dashboardMetrics.launch || emptyLaunchMetrics();
  const events = sourceRows.length ? sourceEvents : dashboardMetrics.events;
  const landingHits = launch.landingMatched;
  const venues = sourceRows.length ? sourceRows.reduce((sum, source) => sum + source.counts.venues, 0) : dashboardMetrics.venues;
  const unavailableSections = [
    dashboardError ? 'метрики каталога' : null,
    sourcesError ? 'источники' : null,
    ordersError ? 'заказы' : null,
  ].filter((value): value is string => Boolean(value));

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/admin/dashboard`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminDashboardDto;
      })
      .then((payload) => {
        setDashboardMetrics(payload.metrics || EMPTY_DASHBOARD_METRICS);
        setDashboardError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDashboardMetrics(EMPTY_DASHBOARD_METRICS);
          setDashboardError(true);
        }
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
      .then((payload) => {
        setSources(payload.sources || []);
        setSourcesError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSources([]);
          setSourcesError(true);
        }
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
      .then((payload) => {
        setOrderMetrics({
          imported: payload.metrics?.imported ?? 0,
          confirmed: payload.metrics?.confirmed ?? 0,
          processing: payload.metrics?.processing ?? 0,
          failedIntegration: payload.metrics?.failedIntegration ?? 0,
        });
        setOrdersError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setOrderMetrics({ imported: 0, confirmed: 0, processing: 0, failedIntegration: 0 });
          setOrdersError(true);
        }
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

      {unavailableSections.length ? (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Backend не отдал: {unavailableSections.join(', ')}. Значения этих разделов не подменяются моками.
        </div>
      ) : null}

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
            <Metric icon={Megaphone} label="Лендингов" value={dashboardMetrics.landingRules} tone="info" to="/landings" />
            <Metric icon={Layers} label="Событий в выборках" value={landingHits} tone="success" to="/events?view=landing_match" />
            <Metric icon={Building2} label="Хабы площадок" value={venues} to="/venues" />
            <Metric icon={MapPin} label="Городов/регионов" value={dashboardMetrics.destinations} to="/cities" />
          </div>
        </Block>

        <Block title="Состояние импортов" icon={RefreshCw} href="/sources" hrefLabel="К источникам">
          <div className="space-y-2">
            {sourceRows.map((source) => (
              <ImportRow
                key={source.sourceCode}
                source={source.label}
                status={source.catalogState}
                mode={`${formatNumber(source.counts.groupedEvents)} карточек · ${formatNumber(source.counts.sessions)} сеансов`}
                live={source.catalogState === 'live'}
              />
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Metric icon={Layers} label="Категорий" value={dashboardMetrics.categories} to="/taxonomy" />
              <Metric icon={MapPin} label="Городов" value={dashboardMetrics.destinations} to="/cities" />
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

type LaunchMetrics = AdminDashboardLaunchMetrics;

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

function emptyLaunchMetrics(): LaunchMetrics {
  return {
    groupedEvents: 0,
    readyForSales: 0,
    readyForSeo: 0,
    needsAttention: 0,
    priceBlocked: 0,
    purchaseBlocked: 0,
    noImage: 0,
    landingMatched: 0,
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
