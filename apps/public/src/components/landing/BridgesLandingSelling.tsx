import { ArrowRight, Clock, Compass, Heart, MapPin, Sparkles, Star, Wallet } from 'lucide-react';
import * as React from 'react';

import { BRIDGES_LANDING } from '@/data/bridges-landing';
import { formatMoneyRange, formatNumber, formatPriceFrom, moneyRangeStatLabel } from '@/data';
import type { BridgesScheduleRow } from '@/lib/bridges-session-utils';

const PALACE_BRIDGE_LIFT_HOUR = 1;
const PALACE_BRIDGE_LIFT_MINUTE = 10;
const NAVIGATION_SEASON_START_MONTH = 3;
const NAVIGATION_SEASON_END_MONTH = 10;

function isBridgeNavigationSeason(date: Date): boolean {
  const month = date.getMonth();
  return month >= NAVIGATION_SEASON_START_MONTH && month <= NAVIGATION_SEASON_END_MONTH;
}

function getNextPalaceBridgeLift(from = new Date()): Date | null {
  if (!isBridgeNavigationSeason(from)) return null;

  const next = new Date(from);
  next.setHours(PALACE_BRIDGE_LIFT_HOUR, PALACE_BRIDGE_LIFT_MINUTE, 0, 0);
  if (from.getTime() >= next.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  if (!isBridgeNavigationSeason(next)) return null;
  return next;
}

function usePalaceBridgeCountdown() {
  const [state, setState] = React.useState({ hours: 0, minutes: 0, inSeason: true });

  React.useEffect(() => {
    const tick = () => {
      const next = getNextPalaceBridgeLift();
      if (!next) {
        setState({ hours: 0, minutes: 0, inSeason: false });
        return;
      }
      const diff = Math.max(0, next.getTime() - Date.now());
      const totalMinutes = Math.floor(diff / 60_000);
      setState({
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        inSeason: true,
      });
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}

function BridgesCountdownCard({ hours, minutes, inSeason }: { hours: number; minutes: number; inSeason: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-4 shadow-lg backdrop-blur-md">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
        <Clock className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">До разводки Дворцового</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-primary-foreground">
          {inSeason ? `${hours}ч ${String(minutes).padStart(2, '0')}м` : 'вне сезона'}
        </p>
      </div>
    </div>
  );
}

export function BridgesHeroBlock({
  priceFrom,
  priceTo,
  visibleCount,
  sessionsReady,
  onPickTour,
  onViewSchedule,
}: {
  priceFrom: number | null;
  priceTo?: number | null;
  visibleCount: number;
  sessionsReady: boolean;
  onPickTour: () => void;
  onViewSchedule: () => void;
}) {
  const countdown = usePalaceBridgeCountdown();
  // CTA: only «от min»; min–max lives in the «диапазон цен» stat cell
  const priceCtaLabel = priceFrom ? formatPriceFrom(priceFrom) : null;
  const priceRangeLabel = priceFrom ? formatMoneyRange(priceFrom, priceTo) : null;
  const priceStatLabel = moneyRangeStatLabel(priceFrom, priceTo);

  return (
    <div className="space-y-0">
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <BridgesCountdownCard hours={countdown.hours} minutes={countdown.minutes} inSeason={countdown.inSeason} />
        <div className="hidden h-px bg-gradient-to-r from-primary-foreground/25 to-transparent md:block" aria-hidden />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPickTour}
            className="inline-btn inline-flex items-center gap-2 rounded-full bridges-cta-gradient px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
          >
            {priceCtaLabel ? `Выбрать рейс · ${priceCtaLabel}` : 'Выбрать рейс'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onViewSchedule}
            className="inline-btn rounded-full border border-primary-foreground/25 px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10 active:scale-[0.98]"
          >
            Смотреть график разводки
          </button>
        </div>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-4 border-t border-primary-foreground/15 pt-6 md:grid-cols-2 md:max-w-lg">
        {sessionsReady ? (
          <>
            {[
              { value: formatNumber(visibleCount), label: 'рейсов ночью', nowrap: false },
              { value: priceRangeLabel || '—', label: priceStatLabel, nowrap: true },
            ].map((item) => (
              <div key={item.label}>
                <dt
                  className={`text-2xl font-semibold tracking-tight text-primary-foreground md:text-3xl${item.nowrap ? ' whitespace-nowrap' : ''}`}
                >
                  {item.value}
                </dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/60">{item.label}</dd>
              </div>
            ))}
          </>
        ) : (
          <p className="col-span-full text-sm text-primary-foreground/80">Загружаем актуальное расписание…</p>
        )}
      </dl>
    </div>
  );
}

export function BridgesScheduleStrip() {
  return (
    <section id="bridges-lift-schedule" className="scroll-mt-24 border-y border-border/60 bg-card/40">
      <div className="container-page py-10 md:py-14">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[oklch(0.72_0.17_55)]">График разводки</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Когда мосты откроются сегодня</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{BRIDGES_LANDING.liftScheduleNote}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BRIDGES_LANDING.liftSchedule.map((bridge) => {
            const isHero = bridge.shortName === 'Дворцовый';
            return (
              <div
                key={bridge.shortName}
                className={`rounded-2xl border p-5 transition ${
                  isHero ? 'border-primary/50 bg-primary/5 shadow-gold' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">{bridge.shortName}</div>
                  {isHero ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Главное
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="text-3xl font-semibold tabular-nums text-foreground">{bridge.lift}</div>
                  <div className="text-xs text-muted-foreground">развод</div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  сведение в <span className="tabular-nums text-foreground/80">{bridge.lower}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function BridgesTonightTips() {
  const tips = [
    { id: 'warm' as const, text: 'Берите тёплую одежду — на воде холоднее' },
    { id: 'pier' as const, text: 'Приходите на причал за 20–30 минут' },
    { id: 'book' as const, text: 'Бронируйте заранее в сезон белых ночей' },
    { id: 'shore' as const, text: 'Проверьте в описании рейса, на какой берег вернётесь после разводки' },
  ];

  return (
    <section className="container-page py-10 md:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[oklch(0.72_0.17_55)]">Советы</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Что важно знать ночью</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Мелочи, которые делают ночную прогулку комфортнее и безопаснее.
        </p>
      </div>
      <div className="rounded-2xl border border-[oklch(0.72_0.17_55/0.2)] bg-[oklch(0.72_0.17_55/0.05)] p-6 md:p-8">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 sm:gap-y-4">
          {tips.map((tip) => (
            <li
              key={tip.id}
              className={`flex items-start gap-3 text-sm text-foreground/90 ${
                tip.id === 'warm'
                  ? 'sm:col-start-1 sm:row-start-1'
                  : tip.id === 'pier'
                    ? 'sm:col-start-2 sm:row-start-1'
                    : tip.id === 'book'
                      ? 'sm:col-start-2 sm:row-start-2'
                      : 'sm:col-start-1 sm:row-start-2'
              }`}
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.72_0.17_55)]" />
              {tip.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const SCENARIOS = [
  {
    icon: Compass,
    title: 'Первый раз в Петербурге',
    text: 'Берите маршрут с Дворцовым и Троицким мостами. Старт около полуночи.',
    filter: 'classic',
  },
  {
    icon: Wallet,
    title: 'Хочу дешевле',
    text: 'Смотрите ближайший причал и короткие маршруты без расширенной программы.',
    filter: 'budget',
  },
  {
    icon: Heart,
    title: 'Хочу красиво',
    text: 'Выбирайте рейс по Большой Неве с открытой палубой в белые ночи.',
    filter: 'scenic',
  },
  {
    icon: MapPin,
    title: 'Не хочу далеко идти',
    text: 'Фильтруйте по причалу: Дворцовая, Фонтанка, Английская набережная.',
    filter: 'pier',
  },
] as const;

export function BridgesScenarioPicker({ onScrollToSchedule }: { onScrollToSchedule: (hint?: string) => void }) {
  return (
    <section id="bridges-scenarios" className="container-page py-10">
      <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">Какой рейс выбрать?</h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">Не все ночные прогулки одинаковы — выберите сценарий, затем сравните конкретные рейсы в расписании.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {SCENARIOS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onScrollToSchedule(item.filter)}
            className="rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-sm"
          >
            <item.icon className="mb-3 h-6 w-6 text-primary" />
            <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function BridgesFeaturedCard({ row, label }: { row: BridgesScheduleRow; label?: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm">
      {label ? (
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{label}</span>
      ) : null}
      <h3 className="line-clamp-2 text-base font-semibold text-foreground">
        <a href={row.href} className="hover:text-primary">
          {row.title}
        </a>
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {row.timeLabel ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {row.timeLabel}
            {row.dateLabel ? ` · ${row.dateLabel}` : ''}
          </span>
        ) : null}
        {row.duration ? <span>{row.duration}</span> : null}
        {row.venue ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {row.venue}
          </span>
        ) : null}
      </p>
      {row.badges.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {row.badges.map((badge) => (
            <span key={badge} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-lg font-bold text-foreground">
          {row.priceFrom ? formatMoneyRange(row.priceFrom, row.priceTo) : 'Цена в карточке'}
        </span>
        <a href={row.href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
          Выбрать дату
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export function BridgesFeaturedSection({
  rows,
  loading,
}: {
  rows: BridgesScheduleRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section id="bridges-featured" className="container-page py-8">
        <h2 className="mb-4 text-2xl font-bold text-foreground">Популярные рейсы</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!rows.length) return null;

  return (
    <section id="bridges-featured" className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Популярные рейсы</h2>
          <p className="mt-1 text-muted-foreground">Проверенные варианты для быстрого выбора — полный каталог ниже.</p>
        </div>
        <a href="#variants" className="text-sm font-semibold text-primary hover:text-primary/80">
          Все билеты →
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {rows.map((row) => (
          <BridgesFeaturedCard key={row.key} row={row} />
        ))}
      </div>
    </section>
  );
}

export function BridgesComparisonTable({ rows }: { rows: BridgesScheduleRow[] }) {
  if (rows.length < 2) return null;

  return (
    <section id="bridges-compare" className="container-page py-8">
      <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">Сравнение маршрутов</h2>
      <p className="mb-6 text-muted-foreground">Сопоставьте время, берег Невы, причал и цену перед покупкой.</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Рейс</th>
              <th className="px-4 py-3 font-medium">Время</th>
              <th className="px-4 py-3 font-medium">Длительность</th>
              <th className="px-4 py-3 font-medium">Берег</th>
              <th className="px-4 py-3 font-medium">Мосты</th>
              <th className="px-4 py-3 font-medium">Причал</th>
              <th className="px-4 py-3 font-medium">Цена</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="max-w-[220px] px-4 py-3 font-medium text-foreground">
                  <a href={row.href} className="hover:text-[oklch(0.55_0.17_55)]">
                    {row.title}
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.timeLabel || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.duration || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.nevaBank}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.bridgeHint || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.pierLabel || row.venue || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                  {row.priceFrom ? formatMoneyRange(row.priceFrom, row.priceTo) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BridgesMobileStickyCta({
  priceFrom,
  priceTo,
  visible,
}: {
  priceFrom: number | null;
  priceTo?: number | null;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur-md md:hidden">
      <a
        href="#variants"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
      >
        <Star className="h-4 w-4" />
        {priceFrom ? `Показать рейсы ${formatPriceFrom(priceFrom)}` : 'Выбрать рейс'}
      </a>
    </div>
  );
}

export function bridgesEditorialIntro() {
  return BRIDGES_LANDING.heroSubtitle;
}
