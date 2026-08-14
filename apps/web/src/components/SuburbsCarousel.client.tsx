'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { AddManyToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { CityHubSectionHeading } from '@/components/CityHubSectionHeading';
import {
  DayTripCanonCard,
  resolveCanonGastroStop,
} from '@/components/DayTripCanonCard.client';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { suburbMatchesSlugs } from '@/lib/city-hub-local-flavor';
import type { CityMustSeeItem, CitySuburbItem, CitySuburbPlace } from '@/lib/cityInfo';
import {
  dayRouteHookLine,
  dayRouteItemFromMustSee,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';

function buildBulkVenues(
  place: CitySuburbItem,
  venues: DayRouteVenueMatchSource[],
  city: DayRouteCityContext,
) {
  const nested = Array.isArray(place.places) ? place.places.filter((p) => p?.name) : [];
  const nestedRouteItems = nested
    .map((poi) => {
      const poiAsMustSee: CityMustSeeItem = {
        name: poi.name,
        desc: String(poi.desc || ''),
        href: poi.href,
        venueSlug: poi.venueSlug,
        locationSlug: poi.locationSlug,
        dayRouteId: poi.dayRouteId,
        latitude: poi.latitude,
        longitude: poi.longitude,
        visitMinutes: poi.visitMinutes,
      };
      return dayRouteItemFromMustSee(poiAsMustSee, venues, city, { isSuburb: true });
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (nestedRouteItems.length > 0) return nestedRouteItems;
  const root = dayRouteItemFromMustSee(place, venues, city, { isSuburb: true });
  return root ? [root] : [];
}

function suburbVectorTitle(place: CitySuburbItem): string {
  return place.travelVector
    ? `${place.travelVector}${place.stationHub ? ` - ${place.stationHub}` : ''}`
    : '';
}

/** Avoid rendering the same blurb twice when seed copied desc into travelVector. */
function suburbTitleLines(
  place: CitySuburbItem,
  compact: boolean,
): { subtitle?: string; lead?: string } {
  const desc = String(place.desc || '').trim();
  const vectorRaw = String(place.travelVector || '').trim();
  const vectorDistinct = Boolean(vectorRaw && vectorRaw !== desc);
  const vectorTitle = vectorDistinct ? suburbVectorTitle(place) : '';

  if (compact) {
    return {
      subtitle: vectorTitle || undefined,
      lead: desc || undefined,
    };
  }

  return {
    subtitle: (vectorTitle || desc) || undefined,
  };
}

function suburbExitLabel(place: CitySuburbItem, hasExit: boolean): string | undefined {
  const custom = String(place.logisticsExitLabel || '').trim();
  if (custom) return custom;
  // «Где выходить» only for boarding/station exit; otherwise general logistics.
  return hasExit ? 'Где выходить' : 'Логистика';
}

function suburbHeroImage(
  place: CitySuburbItem,
  venues: DayRouteVenueMatchSource[],
): string | null {
  const candidates: Array<string | null | undefined> = [
    place.venueSlug,
    place.locationSlug,
    ...(Array.isArray(place.places) ? place.places : []).flatMap((poi: CitySuburbPlace) => [
      poi.venueSlug,
      poi.locationSlug,
    ]),
  ];
  for (const raw of candidates) {
    const slug = String(raw || '').trim();
    if (!slug) continue;
    const matched = venues.find((venue) => String(venue.slug || '').trim() === slug);
    const resolved = resolveVenueHeroImage(slug, matched?.heroImageUrl);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * First ~2 routes stay as pills (Perm: Хохловка, Кунгур). Long names and the rest → «Ещё».
 * Same cap on mobile and desktop - do not squeeze 4 into one row.
 */
export const SUBURB_CHIP_VISIBLE_CAP = 2;

/**
 * Split suburb chip indices into visible row + overflow.
 * Active route is always promoted into the visible row when it would otherwise sit in «Ещё».
 */
export function splitSuburbChipIndices(
  total: number,
  activeIndex: number | null,
  visibleCap: number = SUBURB_CHIP_VISIBLE_CAP,
): { primary: number[]; overflow: number[] } {
  if (total <= 0) return { primary: [], overflow: [] };
  const cap = Math.max(1, visibleCap);
  if (total <= cap) {
    return {
      primary: Array.from({ length: total }, (_, i) => i),
      overflow: [],
    };
  }

  let primary = Array.from({ length: cap }, (_, i) => i);
  let overflow = Array.from({ length: total - cap }, (_, i) => i + cap);

  const activeOk =
    activeIndex != null && Number.isFinite(activeIndex) && activeIndex >= 0 && activeIndex < total;
  if (activeOk && !primary.includes(activeIndex as number)) {
    const displaced = primary[primary.length - 1];
    primary = [...primary.slice(0, -1), activeIndex as number];
    overflow = [displaced, ...overflow.filter((i) => i !== activeIndex)];
  }

  return { primary, overflow };
}

export type SuburbsCarouselProps = {
  places: CitySuburbItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  cityGenitive: string;
  /** Hub editorial typography; my-day keeps default slate. */
  editorial?: boolean;
  /**
   * My-day: magazine DayTripCanonCard (cover + short sights + primary CTA).
   */
  compact?: boolean;
  /** Hub: replace current day + open planner (avoid mixing old stops). */
  replaceDayOnApply?: boolean;
  navigateToMyDayOnApply?: boolean;
  /** Skip outer h2/intro when parent accordion provides the chrome. */
  hideHeader?: boolean;
  titleClass?: string;
  /** Outer wrapper class (hub `mt-10`, my-day `mt-5`). */
  className?: string;
  /** Hub hash target for identity tags / weather CTAs. */
  sectionId?: string;
  /** Select the first suburb that matches venue/location slugs. */
  focusSlugs?: string[];
};

/**
 * Significant-suburbs: chips + DayTripCanonCard. Bulk «В маршрут» adds nested points.
 */
export function SuburbsCarousel({
  places,
  venues,
  city,
  cityGenitive,
  editorial = false,
  compact = false,
  replaceDayOnApply = false,
  navigateToMyDayOnApply = false,
  hideHeader = false,
  className = 'mt-10',
  sectionId,
  focusSlugs,
}: SuburbsCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!focusSlugs?.length) return;
    const idx = places.findIndex((place) => suburbMatchesSlugs(place, focusSlugs));
    if (idx >= 0) setActiveIndex(idx);
  }, [focusSlugs, places]);

  React.useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  if (!places.length) return null;

  const selectedIndex =
    activeIndex == null || activeIndex < 0 || activeIndex >= places.length ? null : activeIndex;
  const selected = selectedIndex == null ? null : places[selectedIndex];
  const { primary: primaryIndices, overflow: overflowIndices } = splitSuburbChipIndices(
    places.length,
    selectedIndex,
    SUBURB_CHIP_VISIBLE_CAP,
  );
  const overflowActive =
    selectedIndex != null && overflowIndices.includes(selectedIndex);

  const chipIdle = editorial
    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400';
  const chipActive = editorial
    ? 'border-zinc-900 bg-zinc-900 text-white'
    : 'border-slate-900 bg-slate-900 text-white';

  const chipRowClass = 'flex flex-wrap items-center gap-2';

  const selectChip = (mode: 'tabs' | 'accordion', index: number) => {
    if (mode === 'accordion') {
      setActiveIndex((prev) => (prev === index ? null : index));
    } else {
      setActiveIndex(index);
    }
    setMoreOpen(false);
  };

  const renderChipButton = (mode: 'tabs' | 'accordion', index: number) => {
    const place = places[index];
    if (!place) return null;
    const active = selectedIndex === index;
    return (
      <button
        key={`chip:${place.name}:${index}`}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={mode === 'tabs' || active ? `city-suburb-panel-${index}` : undefined}
        data-city-suburb-chip
        data-active={active ? '1' : '0'}
        onClick={() => selectChip(mode, index)}
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
        <span>{place.name}</span>
        {mode === 'accordion' ? (
          <ChevronDown
            className={`h-3.5 w-3.5 opacity-70 transition-transform ${active ? 'rotate-180' : ''}`}
            aria-hidden
          />
        ) : null}
      </button>
    );
  };

  const renderChipRow = (mode: 'tabs' | 'accordion') => (
    <div
      className={chipRowClass}
      role="tablist"
      aria-label={`Пригороды ${cityGenitive}`}
      data-city-suburb-chips
      data-city-suburb-chips-overflow={overflowIndices.length ? '1' : '0'}
    >
      {primaryIndices.map((index) => renderChipButton(mode, index))}
      {overflowIndices.length ? (
        <div className="relative shrink-0" ref={moreRef}>
          <button
            type="button"
            role="tab"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-selected={overflowActive}
            data-city-suburb-chip-more
            data-active={overflowActive ? '1' : '0'}
            onClick={() => setMoreOpen((open) => !open)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              overflowActive || moreOpen ? chipActive : chipIdle
            }`}
          >
            <span>
              {overflowActive && selected
                ? `Ещё · ${selected.name}`
                : `Ещё`}
            </span>
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                overflowActive || moreOpen
                  ? 'bg-white/20 text-white'
                  : editorial
                    ? 'bg-zinc-100 text-zinc-600'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {overflowIndices.length}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 opacity-70 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {moreOpen ? (
            <div
              role="menu"
              data-city-suburb-chip-menu
              className={`absolute left-0 z-40 mt-1 min-w-[12rem] max-w-[min(100vw-2rem,18rem)] rounded-xl border py-1 shadow-lg sm:left-auto sm:right-0 ${
                editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white'
              }`}
            >
              {overflowIndices.map((index) => {
                const place = places[index];
                if (!place) return null;
                const active = selectedIndex === index;
                return (
                  <button
                    key={`more:${place.name}:${index}`}
                    type="button"
                    role="menuitem"
                    data-city-suburb-chip-menu-item
                    data-active={active ? '1' : '0'}
                    onClick={() => selectChip(mode, index)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      active
                        ? editorial
                          ? 'bg-zinc-900 font-semibold text-white'
                          : 'bg-slate-900 font-semibold text-white'
                        : editorial
                          ? 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : editorial
                            ? 'bg-zinc-100 text-zinc-700'
                            : 'bg-primary-50 text-primary-700'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 truncate">{place.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const renderSuburbPanel = (place: CitySuburbItem, index: number) => {
    const placeHref = resolveCityPlaceTitleHref(place, venues);
    const matchedVenue = venues.find((venue) => {
      const slug = String(place.venueSlug || place.locationSlug || '').trim();
      return slug && String(venue.slug || '').trim() === slug;
    });
    // Venue hook only - do not dump suburb `desc` into logistics (it belongs under the title).
    const blurb =
      !compact
        ? dayRouteHookLine({
            hookFact: matchedVenue?.hookFact,
            shortDescription: matchedVenue?.shortDescription,
            preferEditorial: true,
          }) || ''
        : '';
    const nested = Array.isArray(place.places) ? place.places.filter((p) => p?.name) : [];
    const bulkVenues = buildBulkVenues(place, venues, city);
    const heroImageUrl = suburbHeroImage(place, venues);
    const titleNode = placeHref ? (
      <Link
        href={placeHref}
        className="underline decoration-slate-300 underline-offset-2 hover:decoration-current"
      >
        {place.name}
      </Link>
    ) : (
      place.name
    );
    const titleLines = suburbTitleLines(place, compact);
    const logisticsExit =
      String(place.logisticsExit || place.stationName || '').trim() || undefined;

    return (
      <DayTripCanonCard
        id={`city-suburb-panel-${index}`}
        role="tabpanel"
        index={index}
        total={places.length}
        editorial={editorial}
        magazine={compact}
        heroImageUrl={heroImageUrl}
        lead={titleLines.lead}
        title={titleNode}
        subtitle={titleLines.subtitle}
        logisticsExit={logisticsExit}
        logisticsExitLabel={suburbExitLabel(place, Boolean(logisticsExit))}
        logisticsText={String(place.travelVectorBlurb || '').trim() || undefined}
        logisticsExtra={
          [String(place.timingNote || '').trim(), blurb].filter(Boolean).join(' ') || undefined
        }
        gastro={compact ? null : resolveCanonGastroStop(place)}
        sightDescFromMd={compact}
        sights={nested.map((poi) => ({
          name: poi.name,
          desc: String(poi.desc || '').trim() || undefined,
          href: resolveCityPlaceTitleHref(poi, venues),
          transitTip: String(poi.transitTip || '').trim() || undefined,
          dayLabel: String(poi.dayLabel || '').trim() || undefined,
          visitMinutes: poi.visitMinutes,
        }))}
        cta={
          bulkVenues.length > 0 ? (
            <AddManyToDayRouteButton
              compact
              variant={compact ? 'primary' : 'light'}
              mode={replaceDayOnApply ? 'replace' : 'append'}
              navigateToMyDay={navigateToMyDayOnApply}
              className={
                compact
                  ? 'w-full !min-h-11 !rounded-xl !px-4 !py-2.5 !text-sm'
                  : '!min-h-9 !px-3.5 !py-2 !text-xs'
              }
              venues={bulkVenues}
            />
          ) : null
        }
        dataAttrs={{
          'data-city-suburb-card': '1',
          'data-city-suburb-canon': '1',
          'data-city-suburb-compact': compact ? '1' : undefined,
          'data-city-suburb-expanded': '1',
        }}
      />
    );
  };

  return (
    <div
      className={`${className}${sectionId ? ' scroll-mt-[calc(var(--site-header-height)+3.25rem)]' : ''}`}
      data-city-significant-suburbs
      id={sectionId || undefined}
    >
      {hideHeader ? null : (
        <>
          <CityHubSectionHeading
            title={`Значимые пригороды ${cityGenitive}`}
            description={
              compact
                ? null
                : 'Поездка на день рядом с городом - отдельные мини-локации и точки внутри них.'
            }
            editorial={editorial}
          />
        </>
      )}

      <div className={hideHeader ? undefined : compact ? 'mt-4' : 'mt-5'}>
        {compact ? renderChipRow('accordion') : renderChipRow('tabs')}
        {selected && selectedIndex != null ? renderSuburbPanel(selected, selectedIndex) : null}
        {compact && selectedIndex == null ? (
          <p className="mt-3 text-sm text-slate-500" data-city-suburb-hint>
            Нажмите на пригород, чтобы открыть точки и добавить в маршрут.
          </p>
        ) : null}
      </div>
    </div>
  );
}
