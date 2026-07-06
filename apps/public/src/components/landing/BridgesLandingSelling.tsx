import { ArrowRight, Clock, Compass, Heart, MapPin, Sparkles, Star, Wallet } from 'lucide-react';

import { BRIDGES_LANDING } from '@/data/bridges-landing';
import { formatMoney } from '@/data';
import type { BridgesScheduleRow } from '@/lib/bridges-session-utils';

type BridgesQuickFilters = {
  onToday: () => void;
  onTomorrow: () => void;
  onWeekend: () => void;
  onWithGuide: () => void;
  onOpenDeck: () => void;
};

export function BridgesHeroActions({
  priceFrom,
  onPickTour,
  onCompare,
  quickFilters,
}: {
  priceFrom: number | null;
  onPickTour: () => void;
  onCompare: () => void;
  quickFilters: BridgesQuickFilters;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onPickTour} className="inline-btn rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-primary-50">
          Выбрать рейс
        </button>
        <button
          type="button"
          onClick={onCompare}
          className="inline-btn rounded-lg border border-primary-foreground/30 bg-primary-foreground/10 px-6 py-3 text-sm font-semibold text-primary-foreground backdrop-blur-sm hover:bg-primary-foreground/20"
        >
          Сравнить маршруты
        </button>
        {priceFrom ? (
          <span className="inline-flex items-center rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium text-primary-foreground backdrop-blur-sm">
            от {formatMoney(priceFrom).replace(/^от\s+/i, '')}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Сегодня', action: quickFilters.onToday },
          { label: 'Завтра', action: quickFilters.onTomorrow },
          { label: 'Выходные', action: quickFilters.onWeekend },
          { label: 'С гидом', action: quickFilters.onWithGuide },
          { label: 'Открытая палуба', action: quickFilters.onOpenDeck },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={chip.action}
            className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm hover:bg-primary-foreground/20"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BridgesTonightTips() {
  const tips = [
    'Берите тёплую одежду — на воде холоднее',
    'Приходите на причал за 20–30 минут',
    'Рейсы 23:30–00:30 успевают к разводке Дворцового',
    'Бронируйте заранее в сезон белых ночей',
    'После 02:00 проверьте, на какой берег вернётесь',
  ];

  return (
    <section className="container mx-auto px-4 pt-6">
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 md:p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-900">Что важно знать ночью</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-amber-950/90">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {tip}
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
    <section id="bridges-scenarios" className="container mx-auto px-4 py-10">
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
        <span className="text-lg font-bold text-foreground">{row.priceFrom ? formatMoney(row.priceFrom) : 'Цена в карточке'}</span>
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
      <section id="bridges-featured" className="container mx-auto px-4 py-8">
        <h2 className="mb-4 text-2xl font-bold text-foreground">Ближайшие рейсы</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!rows.length) return null;

  const cheapest = [...rows].sort((a, b) => (a.priceFrom ?? 99999) - (b.priceFrom ?? 99999))[0];
  const best = [...rows].sort((a, b) => a.score - b.score)[0];
  const featured = rows.slice(0, 5);

  return (
    <section id="bridges-featured" className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Ближайшие рейсы</h2>
          <p className="mt-1 text-muted-foreground">Лучшие варианты для быстрого выбора — полный каталог ниже.</p>
        </div>
        <a href="#variants" className="text-sm font-semibold text-primary hover:text-primary/80">
          Все билеты →
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((row) => {
          let label: string | undefined;
          if (cheapest && row.key === cheapest.key) label = 'Самый бюджетный';
          else if (best && row.key === best.key) label = 'Лучший для первого раза';
          return <BridgesFeaturedCard key={row.key} row={row} label={label} />;
        })}
      </div>
    </section>
  );
}

export function BridgesComparisonTable({ rows }: { rows: BridgesScheduleRow[] }) {
  if (rows.length < 2) return null;

  return (
    <section id="bridges-compare" className="container mx-auto px-4 py-8">
      <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">Сравнение маршрутов</h2>
      <p className="mb-6 text-muted-foreground">Сопоставьте время, длительность, причал и цену перед покупкой.</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Рейс</th>
              <th className="px-4 py-3 font-medium">Время</th>
              <th className="px-4 py-3 font-medium">Длительность</th>
              <th className="px-4 py-3 font-medium">Мосты</th>
              <th className="px-4 py-3 font-medium">Причал</th>
              <th className="px-4 py-3 font-medium">Цена</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">
                  <a href={row.href} className="hover:text-primary">
                    {row.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-foreground">{row.timeLabel || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.duration || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.bridgeHint || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.venue || '—'}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.priceFrom ? formatMoney(row.priceFrom) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BridgesMobileStickyCta({ priceFrom, visible }: { priceFrom: number | null; visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur-md md:hidden">
      <a
        href="#variants"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
      >
        <Star className="h-4 w-4" />
        {priceFrom ? `Показать рейсы от ${formatMoney(priceFrom).replace(/^от\s+/i, '')}` : 'Выбрать рейс'}
      </a>
    </div>
  );
}

export function bridgesEditorialIntro() {
  return BRIDGES_LANDING.heroSubtitle;
}
