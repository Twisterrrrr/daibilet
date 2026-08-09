'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Route } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CityDayRoutePreset, CityMustSeeItem } from '@/lib/cityInfo';
import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { mustSeePlacesForDefaultPreset } from '@/lib/must-see-filters';
import { formatDayRouteTransitTipLine, replaceDayRouteFromVenues } from '@/lib/day-route';

type Props = {
  places: CityMustSeeItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  editorial?: boolean;
  /** Именованные шаблоны из cityInfo.dayRoutePresets */
  namedPresets?: CityDayRoutePreset[];
  /**
   * /my-day progressive catalog: keep a single skeleton until locations+venues settle,
   * so name-matched presets do not «pop in» after editorial-only ones.
   */
  catalogPending?: boolean;
  /** Hub CTA navigates to /my-day; on /my-day keep false (event sync updates panel). */
  navigateToMyDay?: boolean;
  /** Copy when block is already on /my-day. */
  inMyDay?: boolean;
  /**
   * Inside DayRoutePanel accordion: no outer card/title (chrome is the accordion row).
   * Named presets always use suburb-like chips + one detail panel (hub + my-day).
   */
  embedded?: boolean;
};

type NamedRow = {
  preset: CityDayRoutePreset;
  items: ReturnType<typeof buildCityDayRoutePreset>;
  available: boolean;
};

/** Russian plural for «N главных мест(а/о)» in preset copy. */
function mainPlacesPhrase(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} главное место`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} главных места`;
  }
  return `${count} главных мест`;
}

export function CityDayPresetBlock({
  places,
  venues,
  city,
  editorial = false,
  namedPresets = [],
  catalogPending = false,
  navigateToMyDay = true,
  inMyDay = false,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  /** First scenario open by default (like suburbs chips). */
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const namedResolved = useMemo(() => {
    return (namedPresets || [])
      .map((preset) => ({
        preset,
        items: buildCityDayRoutePreset(preset.stops, venues, city),
        available: cityDayRoutePresetAvailable(preset.stops, venues, city),
      }))
      // Сценарий обязан собирать план: гид без resolvable stops не маскируем
      // под готовый маршрут.
      .filter((row) => row.available);
  }, [namedPresets, venues, city]);

  const fallbackPreset = useMemo(() => {
    const source = mustSeePlacesForDefaultPreset(places);
    return buildCityDayRoutePreset(source, venues, city);
  }, [places, venues, city]);
  const fallbackAvailable = useMemo(() => {
    const source = mustSeePlacesForDefaultPreset(places);
    return cityDayRoutePresetAvailable(source, venues, city);
  }, [places, venues, city]);

  const apply = (id: string, items: ReturnType<typeof buildCityDayRoutePreset>) => {
    setBusyId(id);
    replaceDayRouteFromVenues(items, city.id || null);
    if (navigateToMyDay) {
      router.push('/my-day');
      return;
    }
    window.setTimeout(() => setBusyId(null), 400);
  };

  const namedLead = inMyDay
    ? 'Выберите готовый маршрут или откройте подробный гид.'
    : 'Откройте подробный гид или соберите доступные точки в «Собери свой день».';
  const fallbackLead = inMyDay
    ? `Собрать за минуту: ${mainPlacesPhrase(fallbackPreset.length)} в маршруте.`
    : `Собрать за минуту: ${mainPlacesPhrase(fallbackPreset.length)} в «Собери свой день».`;
  const namedCta = (busy: boolean) => (busy ? 'Собираем…' : 'В маршрут');

  const shellClass = embedded
    ? ''
    : `mt-5 rounded-2xl border p-4 sm:p-5 ${
        editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
      }`;

  const borderClass = editorial ? 'border-zinc-200' : 'border-slate-200';
  const titleClass = editorial ? 'text-zinc-950' : 'text-slate-950';
  const softClass = editorial ? 'text-zinc-600' : 'text-slate-600';
  const mutedClass = editorial ? 'text-zinc-500' : 'text-slate-500';
  const chipIdle = editorial
    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400';
  const chipActive = editorial
    ? 'border-zinc-900 bg-zinc-900 text-white'
    : 'border-slate-900 bg-slate-900 text-white';
  const skeletonTone = editorial ? 'bg-zinc-200/80' : 'bg-slate-200/90';
  /** Match suburb AddManyToDayRouteButton compact look (Route + slate chip). */
  const routeCtaClass =
    'inline-flex min-h-9 min-w-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50';

  // Named presets that still need catalog name-match must wait for match sources;
  // otherwise editorial-ready chips paint first and the rest «pop in» later (SPB).
  // Hub + my-day share the same chips skeleton (no hub card-list path).
  if ((namedPresets || []).length > 0 && catalogPending) {
    const skeletonCount = Math.max(3, Math.min(8, namedPresets.length));
    return (
      <div
        className={shellClass || undefined}
        data-day-presets={inMyDay ? 'my-day' : 'hub'}
        data-day-presets-mode="chips"
        data-day-presets-pending="1"
        aria-busy="true"
        aria-label="Загружаем готовые сценарии"
      >
        {embedded ? null : (
          <>
            <p className={`text-sm font-semibold ${titleClass}`}>Готовые сценарии</p>
            <p className={`mt-1 text-sm leading-6 ${softClass}`}>Подбираем маршруты по каталогу города…</p>
          </>
        )}
        <div
          className={`${embedded ? '' : 'mt-4 '}flex flex-wrap gap-2`}
          data-day-preset-chips
        >
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div
              key={`preset-skel-chip-${index}`}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 ${borderClass} ${skeletonTone} animate-pulse`}
              style={{ width: `${9.5 + (index % 3) * 1.25}rem` }}
            />
          ))}
        </div>
        <div
          className={`mt-3 h-[5.5rem] animate-pulse rounded-xl border ${borderClass} ${skeletonTone}`}
          data-day-preset-panel-skeleton
        />
      </div>
    );
  }

  const renderScenarioCard = (row: NamedRow, opts?: { panel?: boolean }) => {
    const { preset, items, available } = row;
    const panel = Boolean(opts?.panel);
    return (
      <div
        className={`flex flex-col gap-3 rounded-xl border bg-white px-4 py-3.5 ${borderClass} ${
          panel ? 'mt-3' : ''
        }`}
        data-day-preset-card={preset.id}
        {...(panel
          ? {
              id: `day-preset-panel-${preset.id}`,
              role: 'tabpanel' as const,
              'aria-label': preset.title,
            }
          : {})}
      >
        <div className="min-w-0 w-full">
          <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-0.5">
            <p className={`text-sm font-semibold ${titleClass}`}>{preset.title}</p>
            {preset.blogSlug ? (
              <Link
                href={`/blog/${preset.blogSlug}`}
                className={`inline-flex items-center gap-0.5 text-xs font-medium underline underline-offset-2 transition-colors ${
                  editorial
                    ? 'text-sky-700 hover:text-sky-800'
                    : 'text-primary-600 hover:text-primary-700'
                }`}
              >
                Читать об этом в блоге
                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              </Link>
            ) : null}
          </div>
          {preset.timingNote?.trim() ? (
            <p className={`mt-1 text-[12px] leading-4 ${mutedClass}`} data-day-preset-timing>
              {preset.timingNote.trim()}
            </p>
          ) : null}
          {available ? (
            <ol className="mt-3 list-none space-y-2 p-0" data-day-preset-stops>
              {items.map((item, stopIndex) => {
                const tip = formatDayRouteTransitTipLine(
                  item.transitTip || preset.stops?.[stopIndex]?.transitTip,
                );
                return (
                  <li key={`${item.id}:${stopIndex}`} className="list-none" data-day-preset-stop>
                    {tip ? (
                      <div className="mb-0.5 flex items-start gap-3">
                        <span className="w-6 shrink-0" aria-hidden />
                        <p
                          className={`min-w-0 flex-1 text-[11px] leading-snug ${mutedClass}`}
                          data-day-preset-transit-tip
                        >
                          {tip}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-3 text-sm leading-snug">
                      <span className={`w-6 shrink-0 text-left tabular-nums ${mutedClass}`}>
                        {stopIndex + 1}.
                      </span>
                      <span className={`min-w-0 flex-1 ${softClass}`}>{item.title}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
        {available ? (
          <div className="flex justify-start">
            <button
              type="button"
              disabled={busyId != null}
              onClick={() => apply(preset.id, items)}
              className={routeCtaClass}
            >
              <Route className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{namedCta(busyId === preset.id)}</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  if (namedResolved.length > 0) {
    // Chips + light detail (stops line); not suburb canon card.
    const selectedIndex =
      activeIndex == null || activeIndex < 0 || activeIndex >= namedResolved.length
        ? null
        : activeIndex;
    const selected = selectedIndex == null ? null : namedResolved[selectedIndex];

    return (
      <div
        className={shellClass || undefined}
        data-day-presets={inMyDay ? 'my-day' : 'hub'}
        data-day-presets-mode="chips"
      >
        {embedded ? null : (
          <>
            <p className={`text-sm font-semibold ${titleClass}`}>Готовые сценарии</p>
            <p className={`mt-1 text-sm leading-6 ${softClass}`}>{namedLead}</p>
          </>
        )}
        {/* Mobile: horizontal chip carousel (как пригороды compact). sm+: wrap как hub suburbs. */}
        <div
          className={`${embedded ? '' : 'mt-4 '}flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin] sm:flex-wrap sm:overflow-x-visible sm:pb-0`}
          role="tablist"
          aria-label="Готовые сценарии"
          data-day-preset-chips
          data-day-preset-chips-scroll="mobile"
        >
          {namedResolved.map((row, index) => {
            const active = selectedIndex === index;
            return (
              <button
                key={row.preset.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={active ? `day-preset-panel-${row.preset.id}` : undefined}
                data-day-preset-chip={row.preset.id}
                data-active={active ? '1' : '0'}
                onClick={() => setActiveIndex((prev) => (prev === index ? null : index))}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? chipActive : chipIdle
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                    active
                      ? 'bg-white/20 text-white'
                      : editorial
                        ? 'bg-zinc-100 text-zinc-700'
                        : 'bg-primary-50 text-primary-700'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="max-w-[14rem] truncate sm:max-w-none sm:whitespace-normal">
                  {row.preset.title}
                </span>
              </button>
            );
          })}
        </div>
        {selected ? renderScenarioCard(selected, { panel: true }) : null}
        {selectedIndex == null ? (
          <p className={`mt-3 text-sm ${mutedClass}`} data-day-preset-hint>
            Нажмите на сценарий, чтобы открыть точки и собрать день.
          </p>
        ) : null}
      </div>
    );
  }

  if (!fallbackAvailable || fallbackPreset.length < 3) return null;

  const titles = fallbackPreset.map((item) => item.title).join(' · ');

  return (
    <div className={shellClass || undefined} data-day-presets={inMyDay ? 'my-day' : 'hub'}>
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0 flex-1">
          {embedded ? null : (
            <p className={`text-sm font-semibold ${titleClass}`}>Готовый сценарий</p>
          )}
          <p className={`${embedded ? '' : 'mt-1 '}text-sm leading-6 ${softClass}`}>{fallbackLead}</p>
          <p
            className={`mt-1.5 line-clamp-3 text-[13px] leading-5 md:mt-1 md:line-clamp-2 md:text-xs md:leading-4 ${mutedClass}`}
            title={titles}
          >
            {titles}
          </p>
        </div>
        <button
          type="button"
          disabled={busyId != null}
          onClick={() => apply('default', fallbackPreset)}
          className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 md:w-auto ${
            editorial
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {busyId === 'default' ? 'Собираем…' : 'Собрать за минуту'}
        </button>
      </div>
    </div>
  );
}
