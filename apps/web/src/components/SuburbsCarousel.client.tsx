'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { AddManyToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import {
  DayTripCanonCard,
  resolveCanonGastroStop,
} from '@/components/DayTripCanonCard.client';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import type { CityMustSeeItem, CitySuburbItem } from '@/lib/cityInfo';
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

export type SuburbsCarouselProps = {
  places: CitySuburbItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  cityGenitive: string;
  /** Hub editorial typography; my-day keeps default slate. */
  editorial?: boolean;
  /**
   * My-day: same card canon as hub; POI desc from md+ (mobile name-only).
   */
  compact?: boolean;
  /** Skip outer h2/intro when parent accordion provides the chrome. */
  hideHeader?: boolean;
  titleClass?: string;
  /** Outer wrapper class (hub `mt-10`, my-day `mt-5`). */
  className?: string;
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
  hideHeader = false,
  titleClass,
  className = 'mt-10',
}: SuburbsCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0);

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

  const renderChipRow = (mode: 'tabs' | 'accordion') => (
    <div
      className={
        mode === 'accordion'
          ? 'flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin]'
          : 'flex flex-wrap gap-2'
      }
      role="tablist"
      aria-label={`Пригороды ${cityGenitive}`}
      data-city-suburb-chips
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
    const placeHref = resolveCityPlaceTitleHref(place, venues);
    const matchedVenue = venues.find((venue) => {
      const slug = String(place.venueSlug || place.locationSlug || '').trim();
      return slug && String(venue.slug || '').trim() === slug;
    });
    const blurb =
      !compact
        ? dayRouteHookLine({
            hookFact: matchedVenue?.hookFact,
            shortDescription: matchedVenue?.shortDescription,
            desc: place.desc,
            preferEditorial: true,
          }) || ''
        : '';
    const nested = Array.isArray(place.places) ? place.places.filter((p) => p?.name) : [];
    const bulkVenues = buildBulkVenues(place, venues, city);
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

    return (
      <DayTripCanonCard
        id={`city-suburb-panel-${index}`}
        role="tabpanel"
        index={index}
        total={places.length}
        editorial={editorial}
        title={titleNode}
        subtitle={suburbVectorTitle(place) || undefined}
        logisticsExit={String(place.logisticsExit || place.stationName || '').trim() || undefined}
        logisticsText={String(place.travelVectorBlurb || '').trim() || undefined}
        logisticsExtra={
          [String(place.timingNote || '').trim(), blurb].filter(Boolean).join(' ') || undefined
        }
        gastro={resolveCanonGastroStop(place)}
        sightDescFromMd={compact}
        sights={nested.map((poi) => ({
          name: poi.name,
          desc: String(poi.desc || '').trim() || undefined,
          href: resolveCityPlaceTitleHref(poi, venues),
          transitTip: String(poi.transitTip || '').trim() || undefined,
          dayLabel: String(poi.dayLabel || '').trim() || undefined,
        }))}
        cta={
          bulkVenues.length > 0 ? (
            <AddManyToDayRouteButton
              compact
              className="!min-h-9 !px-3.5 !py-2 !text-xs"
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
    <div className={className} data-city-significant-suburbs>
      {hideHeader ? null : (
        <>
          <h2
            className={
              titleClass ||
              (editorial
                ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
                : 'text-xl font-bold text-slate-950 sm:text-2xl')
            }
          >
            Значимые пригороды {cityGenitive}
          </h2>
          {!compact ? (
            <p className={`mt-1.5 text-sm ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              Поездка на день рядом с городом - отдельные мини-локации и точки внутри них.
            </p>
          ) : null}
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
