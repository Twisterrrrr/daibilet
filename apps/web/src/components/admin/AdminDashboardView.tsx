import type { ReactNode } from 'react';
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
  Receipt,
  RefreshCw,
} from 'lucide-react';

import type { AdminDashboardPageData, AdminSourceRow } from '@/server/admin-dashboard-data';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(value || 0)));
}

function importStatusLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'ok' || normalized === 'live') return 'в работе';
  if (normalized === 'warning') return 'есть вопросы';
  if (normalized === 'error') return 'ошибка';
  if (normalized === 'paused') return 'пауза';
  if (normalized === 'incomplete') return 'неполно';
  return status || 'статус';
}

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

function toneClass(tone: Tone) {
  if (tone === 'success') return 'text-emerald-700';
  if (tone === 'warning') return 'text-amber-700';
  if (tone === 'destructive') return 'text-rose-700';
  if (tone === 'info') return 'text-sky-700';
  return 'text-slate-900';
}

export function AdminDashboardView({ data }: { data: AdminDashboardPageData }) {
  const { metrics, sources, orders, errors, generatedAt, apiBase } = data;
  const launch = metrics.launch;
  const events = launch.groupedEvents || metrics.events;
  const liveSources = sources.filter((source) => source.status === 'live').length;
  const venues =
    sources.length > 0
      ? sources.reduce((sum, source) => sum + source.venues, 0)
      : metrics.venues;
  const landingHits = launch.landingMatched;
  const readyPercent = events ? Math.round((launch.readyForSales / events) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Готовность к продажам</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Live-метрики с API. Контур оплат остаётся на стороне Ticketscloud и Teplohod.info.
              Операции админки - в Next (F4.6, без `/legacy`).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/sources"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Источники
            </a>
            <a
              href="/admin/events?view=ready_publish"
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Готовые события
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          API: <code className="rounded bg-slate-100 px-1 py-0.5">{apiBase}</code>
          {generatedAt ? ` · обновлено ${new Date(generatedAt).toLocaleString('ru-RU')}` : null}
        </p>
      </header>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Часть live-данных недоступна</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Нужны ADMIN_* в env процесса Next (для middleware) и доступ к legacy API
            (`DAIBILET_ADMIN_API_URL`, по умолчанию http://127.0.0.1:4000). Basic Auth браузера
            пробрасывается на API.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TopMetric label="Можно продавать" value={launch.readyForSales} tone="success" href={'/admin/events'} />
        <TopMetric label="Карточек событий" value={events} tone="default" href={'/admin/events'} />
        <TopMetric label="Активных источников" value={liveSources} tone="success" href={'/admin/sources'} />
        <TopMetric label="Площадок" value={venues} tone="info" href={'/admin/venues'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Block title="Контроль каталога" href={'/admin/events'} hrefLabel="К событиям" icon={Layers}>
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase text-slate-500">Запуск продаж</div>
                <div className="mt-1 text-sm text-slate-800">
                  {formatNumber(launch.readyForSales)} из {formatNumber(events)} карточек готовы к переходу в покупку
                </div>
              </div>
              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                  readyPercent >= 80
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {readyPercent}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, Math.max(0, readyPercent))}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={CheckCircle2} label="Можно продавать" value={launch.readyForSales} tone="success" href={'/admin/events'} />
            <Metric icon={AlertTriangle} label="Без цены" value={launch.priceBlocked} tone="warning" href={'/admin/events'} />
            <Metric
              icon={Receipt}
              label="Без покупки"
              value={launch.purchaseBlocked}
              tone={launch.purchaseBlocked ? 'destructive' : 'success'}
              href={'/admin/events?view=purchase_blocked'}
            />
            <Metric icon={ImageIcon} label="Без фото" value={launch.noImage} tone="warning" href={'/admin/events?view=no_image'} />
          </div>
        </Block>

        <Block title="Двигатель SEO-трафика" href={'/admin/landings'} hrefLabel="К лендингам" icon={Megaphone}>
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={Megaphone} label="Лендингов" value={metrics.landingRules} tone="info" href={'/admin/landings'} />
            <Metric icon={Layers} label="Событий в выборках" value={landingHits} tone="success" href={'/admin/events?view=landing_match'} />
            <Metric icon={Building2} label="Хабы площадок" value={venues} href={'/admin/venues'} />
            <Metric icon={MapPin} label="Городов/регионов" value={metrics.destinations} href={'/admin/cities'} />
          </div>
        </Block>

        <Block title="Состояние импортов" href={'/admin/sources'} hrefLabel="К источникам" icon={RefreshCw}>
          <div className="space-y-2">
            {sources.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Нет данных источников. Проверьте `/api/admin/sources`.
              </p>
            ) : (
              sources.map((source) => (
                <ImportRow key={source.id || source.code} source={source} />
              ))
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Metric icon={Layers} label="Категорий" value={metrics.categories || 0} href={'/admin/events'} />
              <Metric icon={MapPin} label="Городов" value={metrics.cities || metrics.destinations} href={'/admin/cities'} />
            </div>
          </div>
        </Block>

        <Block title="Заказы" href={'/admin/orders'} hrefLabel="К заказам" icon={Receipt}>
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={Receipt} label="Импортировано" value={orders.imported} href={'/admin/orders'} />
            <Metric icon={CheckCircle2} label="Подтверждено" value={orders.confirmed} tone="success" href={'/admin/orders'} />
            <Metric icon={Clock} label="В обработке" value={orders.processing} tone="info" href={'/admin/orders?view=attention'} />
            <Metric
              icon={AlertTriangle}
              label="Проблемы"
              value={orders.failedIntegration}
              tone="warning"
              href={'/admin/orders?view=failed_integration'}
            />
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Зеркало заказов из источников без внутреннего checkout и платежного контура Дайбилета.
          </div>
        </Block>
      </div>

      <p className="text-xs text-slate-500">
        Канон операторки до cutover:{' '}
        <a href={VITE_ADMIN} className="underline hover:text-slate-800">
          {VITE_ADMIN}
        </a>
        . Next `/admin` - миграционный read-only контур F4.
      </p>
    </div>
  );
}

function TopMetric({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: Tone;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-slate-50"
    >
      <div className={`text-2xl font-semibold tabular-nums ${toneClass(tone)}`}>{formatNumber(value)}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </a>
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
  children: ReactNode;
  icon: typeof Layers;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {href ? (
          <a href={href} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
            {hrefLabel ?? 'Открыть'}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = 'default',
  href,
}: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  tone?: Tone;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100">
      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${toneClass(tone)}`} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-sm font-semibold tabular-nums ${toneClass(tone)}`}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}

function ImportRow({ source }: { source: AdminSourceRow }) {
  const live = source.status === 'live';
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div>
        <div className="text-sm font-medium text-slate-900">{source.name}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {formatNumber(source.events)} карточек · {formatNumber(source.sessions)} сеансов
        </div>
      </div>
      <span
        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
          live
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        {importStatusLabel(source.healthStatus || source.status)}
      </span>
    </div>
  );
}
