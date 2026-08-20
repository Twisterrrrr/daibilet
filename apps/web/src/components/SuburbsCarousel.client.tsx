'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { AddManyToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { CityHubSectionHeading } from '@/components/CityHubSectionHeading';
import {
  DayTripCanonCard,
  resolveCanonGastroStop,
} from '@/components/DayTripCanonCard.client';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import { resolveDestinationRegionLinkForSuburb } from '@/lib/city-destination-registry';
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

  return {
    subtitle: (vectorTitle || (compact ? undefined : desc)) || undefined,
    lead: desc || undefined,
  };
}

function suburbExitLabel(place: CitySuburbItem, hasExit: boolean): string | undefined {
  const custom = String(place.logisticsExitLabel || '').trim();
  if (custom) return custom;
  // «Где выходить» only for boarding/station exit; otherwise general logistics.
  return hasExit ? 'Где выходить' : 'Логистика';
}

/**
 * Hub / my-day cover: editorial map by venue/location slug (same path as Khokhlovka).
 * Nested POI slugs are a fallback when the suburb hub itself has no map entry.
 */
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
 * Route chips stay visible (wrap / mobile horizontal scroll) - do not hide them in «Ещё».
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
  const searchParams = useSearchParams();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0);
  const urlSuburb = String(searchParams.get('suburb') || '').trim().toLowerCase();
  const resolvedFocusSlugs = urlSuburb ? [urlSuburb] : focusSlugs || [];

  React.useEffect(() => {
    if (!resolvedFocusSlugs.length) return;
    const idx = places.findIndex((place) => suburbMatchesSlugs(place, resolvedFocusSlugs));
    if (idx >= 0) setActiveIndex(idx);
  }, [urlSuburb, focusSlugs, places]);

  if (!places.length) return null;

  const selectedIndex =
    activeIndex == null || activeIndex < 0 || activeIndex >= places.length ? null : activeIndex;
  const selected = selectedIndex == null ? null : places[selectedIndex];

  const chipIdle = editorial
    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400';
  const chipActive = editorial
    ? 'border-zinc-900 bg-zinc-900 text-white'
    : 'border-slate-900 bg-slate-900 text-white';

  // Mobile: one-row horizontal carousel. sm+: wrap so all routes stay visible.
  const chipRowClass =
    'flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin] sm:flex-wrap sm:overflow-x-visible sm:pb-0';

  const renderChipRow = (mode: 'tabs' | 'accordion') => (
    <div
      className={chipRowClass}
      role="tablist"
      aria-label={`Пригороды ${cityGenitive}`}
      data-city-suburb-chips
      data-city-suburb-chips-scroll="mobile"
    >
      {places.map((place, index) => {
        const active = selectedIndex === index;
        return (
          <button
            key={`chip:${place.name}:${index}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={
              mode === 'tabs' || active ? `city-suburb-panel-${index}` : undefined
            }
            data-city-suburb-chip
            data-active={active ? '1' : '0'}
            onClick={() => {
              if (mode === 'accordion') {
                setActiveIndex((prev) => (prev === index ? null : index));
                return;
              }
              setActiveIndex(index);
            }}
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
      })}
    </div>
  );

  const renderSuburbPanel = (place: CitySuburbItem, index: number) => {
    const placeHref = resolveCityPlaceTitleHref(place, venues, { allowNameMatch: false });
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
    const regionLink = resolveDestinationRegionLinkForSuburb(city.slug || city.sourceSlug, place.name);

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
        titleExtra={
          regionLink ? (
            <Link
              href={regionLink.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
            >
              {regionLink.label}
            </Link>
          ) : null
        }
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
          href: resolveCityPlaceTitleHref(poi, venues, { allowNameMatch: false }),
          imageSlug: String(poi.locationSlug || poi.venueSlug || '').trim() || null,
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
