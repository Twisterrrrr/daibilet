'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, MapPin, Route } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CollectRouteCtaHint } from '@/components/CollectRouteCtaHint.client';
import { SafeImage } from '@/components/SafeImage.client';
import type { CityDayRoutePreset, CityMustSeeItem } from '@/lib/cityInfo';
import { blogCoverUrl } from '@/lib/blog-cover';
import { isLabelCardVenueStub } from '@/lib/city-place-images';
import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { mustSeePlacesForDefaultPreset } from '@/lib/must-see-filters';
import { formatDayRouteTransitTipLine, replaceDayRouteFromVenues } from '@/lib/day-route';
import { MY_DAY_COLLECT_CTA_ARIA, MY_DAY_COLLECT_CTA_LABEL, formatMyDayCollectTooltip } from '@/lib/my-day-collect-cta';

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
   * Named presets always use snap cards + one detail panel (hub + my-day).
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

/**
 * Scenarios have no hanging title number (unlike DayTripCanonCard).
 * Stops stay flush with the title column - no empty gutter on the left.
 * Outer card inset (SCENARIO_CARD_PAD) is separate: title-flush must never
 * remove horizontal padding from the white rounded panel.
 */
const SCENARIO_CARD_PAD = 'px-5 py-5 sm:px-6 sm:py-6';
const STOP_ROW = 'flex items-start gap-1.5 text-sm leading-snug';
const STOP_NUM = 'w-[1.25rem] shrink-0 tabular-nums';

const SCENARIO_GRADIENTS = [
  'from-slate-700 via-slate-500 to-primary-400',
  'from-sky-800 via-sky-600 to-cyan-400',
  'from-emerald-800 via-teal-600 to-lime-400',
  'from-indigo-800 via-violet-600 to-fuchsia-400',
  'from-amber-800 via-orange-600 to-rose-400',
] as const;

/**
 * Scenario magazine cover: explicit preset cover → companion blog cover →
 * first real stop photo (skip label-card gradient stubs).
 */
function presetCoverUrl(
  preset: CityDayRoutePreset,
  items: NamedRow['items'],
): string | null {
  const explicit = String(preset.coverImageUrl || '').trim();
  if (explicit) return explicit;
  const blogSlug = String(preset.blogSlug || '').trim();
  if (blogSlug) return blogCoverUrl(blogSlug);
  for (const item of items) {
    const url = String(item.imageUrl || '').trim();
    if (url && !isLabelCardVenueStub(url)) return url;
  }
  return null;
}

function scrollToDayConstructor() {
  if (typeof window === 'undefined') return;
  const el = document.getElementById('day-constructor');
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(() => {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, 40);
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

  /** Hub magazine covers: large cards (not tiny chips). My-day / embedded keep compact chips. */
  const hubMagazine = !inMyDay && !embedded;

  const apply = (id: string, items: ReturnType<typeof buildCityDayRoutePreset>) => {
    setBusyId(id);
    replaceDayRouteFromVenues(items, city.id || null);
    if (navigateToMyDay) {
      router.push('/my-day');
      return;
    }
    window.setTimeout(() => setBusyId(null), 400);
  };

  const selectNamed = (index: number, row: NamedRow) => {
    setActiveIndex(index);
    // Load scenario into guest day-route bucket so constructor timeline matches the card.
    replaceDayRouteFromVenues(row.items, city.id || null);
    if (hubMagazine) scrollToDayConstructor();
  };

  const namedLead = inMyDay
    ? 'Выберите готовый маршрут или откройте подробный гид.'
    : 'Выберите сценарий - точки откроются ниже, маршрут сразу в конструкторе.';
  const fallbackLead = inMyDay
    ? `Собрать за минуту: ${mainPlacesPhrase(fallbackPreset.length)} в маршруте.`
    : `Собрать за минуту: ${mainPlacesPhrase(fallbackPreset.length)} в «Собери свой день».`;
  const namedCta = (busy: boolean) => (busy ? 'Собираем…' : inMyDay ? 'В маршрут' : MY_DAY_COLLECT_CTA_LABEL);

  const shellClass = embedded
    ? ''
    : hubMagazine
      ? ''
      : `mt-5 rounded-2xl border p-4 sm:p-5 ${
          editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
        }`;

  const borderClass = editorial ? 'border-zinc-200' : 'border-slate-200';
  const titleClass = editorial ? 'text-zinc-950' : 'text-slate-950';
  const softClass = editorial ? 'text-zinc-600' : 'text-slate-600';
  const mutedClass = editorial ? 'text-zinc-500' : 'text-slate-500';
  const numClass = editorial ? 'text-zinc-400' : 'text-slate-400';
  const skeletonTone = editorial ? 'bg-zinc-200/80' : 'bg-slate-200/90';
  const routeCtaClass = inMyDay
    ? 'inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex min-h-9 min-w-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50';

  // Named presets that still need catalog name-match must wait for match sources;
  // otherwise editorial-ready chips paint first and the rest «pop in» later (SPB).
  if ((namedPresets || []).length > 0 && catalogPending) {
    const skeletonCount = Math.max(3, Math.min(8, namedPresets.length));
    return (
      <div
        className={shellClass || undefined}
        data-day-presets={inMyDay ? 'my-day' : 'hub'}
        data-day-presets-mode={hubMagazine ? 'magazine' : 'snap-cards'}
        data-day-presets-pending="1"
        aria-busy="true"
        aria-label="Загружаем готовые сценарии"
      >
        {embedded ? null : (
          <>
            <p className={`text-sm font-semibold ${titleClass}`}>
              {hubMagazine ? 'Готовые сценарии дня' : 'Готовые сценарии'}
            </p>
            <p className={`mt-1 text-sm leading-6 ${softClass}`}>Подбираем маршруты по каталогу города…</p>
          </>
        )}
        <div
          className={`${embedded || hubMagazine ? '' : 'mt-4 '}horizontal-snap-row flex snap-x snap-mandatory gap-3 overflow-x-auto px-1.5 pt-1.5 pb-2`}
          data-day-preset-chips
        >
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div
              key={`preset-skel-chip-${index}`}
              className={
                hubMagazine
                  ? `h-[17.5rem] w-[13rem] shrink-0 animate-pulse rounded-2xl sm:h-[19rem] sm:w-[15rem] ${skeletonTone}`
                  : `h-[7.5rem] w-[9.75rem] shrink-0 animate-pulse rounded-2xl ${skeletonTone}`
              }
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
    const useTwoCol = items.length >= 4;
    return (
      <div
        className={`flex flex-col justify-center rounded-xl border bg-white ${SCENARIO_CARD_PAD} ${borderClass} ${
          panel ? 'mt-3 min-h-[11rem] sm:min-h-[12.5rem]' : ''
        }`}
        data-day-preset-card={preset.id}
        data-day-preset-align="title-flush"
        {...(panel
          ? {
              id: `day-preset-panel-${preset.id}`,
              role: 'tabpanel' as const,
              'aria-label': preset.title,
            }
          : {})}
      >
        <div className="flex w-full min-w-0 flex-col justify-center gap-3">
          <div className="min-w-0" data-day-preset-head>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className={`min-w-0 text-sm font-semibold leading-snug ${titleClass}`}>{preset.title}</p>
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
              {available ? (
                inMyDay ? (
                  <button
                    type="button"
                    disabled={busyId != null}
                    onClick={() => apply(preset.id, items)}
                    className={routeCtaClass}
                    data-day-preset-cta
                  >
                    <Route className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{namedCta(busyId === preset.id)}</span>
                  </button>
                ) : (
                  <CollectRouteCtaHint
                    hint={formatMyDayCollectTooltip(items.length)}
                    className="w-full sm:w-auto"
                  >
                    <button
                      type="button"
                      disabled={busyId != null}
                      onClick={() => apply(preset.id, items)}
                      className={routeCtaClass}
                      data-day-preset-cta
                      aria-label={MY_DAY_COLLECT_CTA_ARIA}
                      title={formatMyDayCollectTooltip(items.length)}
                    >
                      <Route className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{namedCta(busyId === preset.id)}</span>
                    </button>
                  </CollectRouteCtaHint>
                )
              ) : null}
            </div>
            {preset.timingNote?.trim() ? (
              <p className={`mt-1.5 text-[12px] leading-4 ${mutedClass}`} data-day-preset-timing>
                {preset.timingNote.trim()}
              </p>
            ) : null}
          </div>
          {available ? (
            <ol
              className={`mt-0 list-none p-0 ${
                useTwoCol
                  ? 'columns-1 gap-y-0 md:columns-2 md:gap-x-8 lg:gap-x-10'
                  : ''
              }`}
              data-day-preset-stops
              data-day-preset-stops-layout={useTwoCol ? 'two-col' : 'one-col'}
            >
              {items.map((item, stopIndex) => {
                const tip = formatDayRouteTransitTipLine(
                  item.transitTip || preset.stops?.[stopIndex]?.transitTip,
                );
                return (
                  <li
                    key={`${item.id}:${stopIndex}`}
                    className="mb-2 list-none break-inside-avoid last:mb-0 md:mb-2.5"
                    data-day-preset-stop
                  >
                    {tip ? (
                      <p
                        className={`mb-0.5 min-w-0 pl-[calc(1.25rem+0.375rem)] text-[11px] leading-snug ${mutedClass}`}
                        data-day-preset-transit-tip
                      >
                        {tip}
                      </p>
                    ) : null}
                    <div className={STOP_ROW}>
                      <span className={`${STOP_NUM} ${numClass}`} data-day-preset-stop-num>
                        {stopIndex + 1}.
                      </span>
                      <span className={`min-w-0 ${softClass}`}>{item.title}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </div>
    );
  };

  if (namedResolved.length > 0) {
    const selectedIndex =
      activeIndex == null || activeIndex < 0 || activeIndex >= namedResolved.length
        ? null
        : activeIndex;
    const selected = selectedIndex == null ? null : namedResolved[selectedIndex];

    return (
      <div
        className={shellClass || undefined}
        data-day-presets={inMyDay ? 'my-day' : 'hub'}
        data-day-presets-mode={hubMagazine ? 'magazine' : 'snap-cards'}
      >
        {embedded ? null : hubMagazine ? null : (
          <>
            <p className={`text-sm font-semibold ${titleClass}`}>Готовые сценарии</p>
            <p className={`mt-1 text-sm leading-6 ${softClass}`}>{namedLead}</p>
          </>
        )}
        {hubMagazine && !embedded ? (
          <p className={`mb-4 max-w-2xl text-sm leading-6 ${softClass}`}>{namedLead}</p>
        ) : null}
        <div
          className={`${embedded || hubMagazine ? '' : 'mt-4 '}horizontal-snap-row -mx-1.5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1.5 pt-1.5 pb-2`}
          role="tablist"
          aria-label="Готовые сценарии дня"
          data-day-preset-chips
          data-day-preset-chips-scroll="1"
        >
          {namedResolved.map((row, index) => {
            const active = selectedIndex === index;
            const cover = presetCoverUrl(row.preset, row.items);
            const gradient = SCENARIO_GRADIENTS[index % SCENARIO_GRADIENTS.length];
            return (
              <button
                key={row.preset.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={active ? `day-preset-panel-${row.preset.id}` : undefined}
                data-day-preset-chip={row.preset.id}
                data-active={active ? '1' : '0'}
                onClick={() => selectNamed(index, row)}
                className={
                  hubMagazine
                    ? `relative h-[17.5rem] w-[13rem] shrink-0 snap-start overflow-hidden rounded-2xl text-left transition sm:h-[19rem] sm:w-[15rem] ${
                        active
                          ? 'ring-2 ring-primary-600 ring-offset-2'
                          : 'ring-1 ring-black/10 hover:ring-slate-300'
                      }`
                    : `relative h-[7.75rem] w-[10rem] shrink-0 snap-start overflow-hidden rounded-2xl text-left transition sm:h-[8.25rem] sm:w-[11rem] ${
                        active
                          ? 'ring-2 ring-primary-600 ring-offset-2'
                          : 'ring-1 ring-black/5 hover:ring-slate-300'
                      }`
                }
              >
                {cover ? (
                  <SafeImage
                    src={cover}
                    alt=""
                    fill
                    sizes={hubMagazine ? '15rem' : '11rem'}
                    className="object-cover"
                  />
                ) : (
                  <span
                    className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
                    aria-hidden
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/5" />
                <span className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                  <span
                    className={`line-clamp-3 font-bold leading-snug text-white drop-shadow ${
                      hubMagazine ? 'text-base sm:text-lg' : 'text-sm'
                    }`}
                  >
                    {row.preset.title}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-white/75">
                    {row.items.length} точек
                  </span>
                </span>
                {!cover ? (
                  <MapPin
                    className="absolute right-2.5 top-2.5 h-4 w-4 text-white/50"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <div id="day-constructor" className="scroll-mt-[calc(var(--site-header-height)+3.25rem)]">
          {selected ? renderScenarioCard(selected, { panel: true }) : null}
          {selectedIndex == null ? (
            <p className={`mt-3 text-sm ${mutedClass}`} data-day-preset-hint>
              Нажмите на сценарий, чтобы открыть точки и собрать день.
            </p>
          ) : null}
        </div>
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
