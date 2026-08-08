'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { AddManyToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import type { CityMustSeeItem, CitySuburbItem } from '@/lib/cityInfo';
import {
  dayRouteHookLine,
  dayRouteItemFromMustSee,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';

/** Nested POI line: bold place name + plain continuation after ` - `. */
function SuburbPlaceLabel({
  name,
  href,
  desc,
}: {
  name: string;
  href: string | null;
  desc: string;
}) {
  const nameNode = href ? (
    <Link
      href={href}
      className="font-semibold underline decoration-slate-300 underline-offset-2 hover:decoration-current"
    >
      {name}
    </Link>
  ) : (
    <span className="font-semibold">{name}</span>
  );
  if (!desc) return <>{nameNode}</>;
  return (
    <>
      {nameNode}
      <span className="font-normal">{` - ${desc}`}</span>
    </>
  );
}

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
   * My-day: horizontal accordion triggers + expand on tap.
   * Hub: name chips + one detail panel (no tall-card carousel).
   */
  compact?: boolean;
  titleClass?: string;
  /** Outer wrapper class (hub `mt-10`, my-day `mt-5`). */
  className?: string;
};

/**
 * Significant-suburbs block.
 * Hub: wrap chips of suburb names + one detail panel (no horizontal card rail).
 * Compact (my-day): horizontal accordion - first suburb expanded; tap chip to switch.
 * Bulk «В маршрут» adds all nested points of the active suburb.
 */
export function SuburbsCarousel({
  places,
  venues,
  city,
  cityGenitive,
  editorial = false,
  compact = false,
  titleClass,
  className = 'mt-10',
}: SuburbsCarouselProps) {
  /**
   * Hub: always one selected panel (index 0).
   * My-day compact: first suburb open by default; tap chip to switch/collapse.
   */
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0);

  const resolvedTitleClass =
    titleClass ||
    `font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`;
  const hubNameClass = `${resolvedTitleClass} text-xl leading-snug sm:text-2xl`;
  const mutedClass = editorial ? 'text-zinc-500' : 'text-slate-500';
  const softClass = editorial ? 'text-zinc-600' : 'text-slate-600';
  const borderSoft = editorial ? 'border-zinc-100' : 'border-slate-100';
  const panelBorder = editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white';

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

  const renderHubPanel = (place: CitySuburbItem, index: number) => {
    const placeHref = resolveCityPlaceTitleHref(place, venues);
    const matchedVenue = venues.find((venue) => {
      const slug = String(place.venueSlug || place.locationSlug || '').trim();
      return slug && String(venue.slug || '').trim() === slug;
    });
    const blurb =
      dayRouteHookLine({
        hookFact: matchedVenue?.hookFact,
        shortDescription: matchedVenue?.shortDescription,
        desc: place.desc,
        preferEditorial: true,
      }) || '';
    const nested = Array.isArray(place.places) ? place.places.filter((p) => p?.name) : [];
    const bulkVenues = buildBulkVenues(place, venues, city);
    const vectorTitle = suburbVectorTitle(place);
    const nameHeading = placeHref ? (
      <Link
        href={placeHref}
        className="underline decoration-slate-300 underline-offset-2 hover:decoration-current"
      >
        {place.name}
      </Link>
    ) : (
      place.name
    );
    const numClass = editorial ? 'text-zinc-400' : 'text-slate-400';
    const poiTextClass = editorial ? 'text-zinc-600' : 'text-slate-600';

    return (
      <article
        id={`city-suburb-panel-${index}`}
        role="tabpanel"
        className={`mt-4 rounded-2xl border p-4 sm:p-5 ${panelBorder}`}
        data-city-suburb-card
        data-city-suburb-expanded="1"
        aria-label={`${index + 1} из ${places.length}: ${place.name}`}
      >
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
          <span
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              editorial ? 'bg-zinc-100 text-zinc-800' : 'bg-primary-50 text-primary-700'
            }`}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className={`${hubNameClass} break-words`} data-city-suburb-title>
              {nameHeading}
              {vectorTitle ? (
                <span
                  className={`ml-2.5 text-sm font-normal leading-snug ${softClass}`}
                  data-city-suburb-vector
                >
                  {vectorTitle}
                </span>
              ) : null}
            </h3>
            {/* mt-3 matches nested places gap after gastro (ol mt-3 / pt-3) */}
            {place.stationName || place.travelVectorBlurb || blurb || place.gastroHint ? (
              <div className="mt-3">
                {place.stationName ? (
                  <p className={`text-sm leading-snug ${softClass}`} data-city-suburb-exit>
                    <span
                      className={`font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-900'}`}
                    >
                      Где выходить
                    </span>
                    <span className={mutedClass}>: {place.stationName}</span>
                  </p>
                ) : null}
                {place.travelVectorBlurb ? (
                  <p
                    className={`${place.stationName ? 'mt-1.5' : ''} text-sm leading-relaxed ${mutedClass}`}
                  >
                    {place.travelVectorBlurb}
                  </p>
                ) : null}
                {blurb ? (
                  <p
                    className={`${
                      place.stationName || place.travelVectorBlurb ? 'mt-2' : ''
                    } text-sm leading-relaxed break-words ${mutedClass}`}
                  >
                    {blurb}
                  </p>
                ) : null}
                {place.gastroHint ? (
                  <p
                    className={`${
                      place.stationName || place.travelVectorBlurb || blurb ? 'mt-2' : ''
                    } text-sm leading-snug ${softClass}`}
                    data-city-suburb-gastro
                  >
                    <span
                      className={`font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-900'}`}
                    >
                      Гастро-остановка
                    </span>
                    <span className={mutedClass}>: {place.gastroHint}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {nested.length ? (
            <ol
              className={`col-span-2 mt-3 grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t pt-3 ${borderSoft}`}
              data-city-suburb-places
            >
              {nested.map((poi, poiIndex) => {
                const poiHref = resolveCityPlaceTitleHref(poi, venues);
                const poiDesc = String(poi.desc || '').trim();
                return (
                  <li key={`${poi.name}:${poiIndex}`} className="contents" data-city-suburb-place>
                    <span className={`text-center text-sm leading-5 tabular-nums ${numClass}`}>
                      {poiIndex + 1}.
                    </span>
                    <span className={`min-w-0 text-sm leading-5 ${poiTextClass}`}>
                      <SuburbPlaceLabel name={poi.name} href={poiHref} desc={poiDesc} />
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}

          {bulkVenues.length > 0 ? (
            <div
              className={`col-start-2 mt-3 border-t pt-3 ${borderSoft}`}
              data-city-suburb-cta-footer
            >
              <AddManyToDayRouteButton
                compact
                className="!min-h-8 !px-2.5 !py-1.5 !text-[11px]"
                venues={bulkVenues}
              />
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  const renderCompactPanel = (place: CitySuburbItem, index: number) => {
    const placeHref = resolveCityPlaceTitleHref(place, venues);
    const nested = Array.isArray(place.places) ? place.places.filter((p) => p?.name) : [];
    const bulkVenues = buildBulkVenues(place, venues, city);
    const vectorTitle = suburbVectorTitle(place);
    const miniAnno = String(place.desc || '').trim();

    return (
      <article
        id={`city-suburb-panel-${index}`}
        role="tabpanel"
        className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        data-city-suburb-card
        data-city-suburb-compact
        data-city-suburb-expanded="1"
        aria-label={`${index + 1} из ${places.length}: ${place.name}`}
      >
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2.5 sm:gap-x-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold leading-none text-primary-700">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3
              className="break-words text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl"
              data-city-suburb-title
            >
              {placeHref ? (
                <Link
                  href={placeHref}
                  className="underline decoration-slate-300 underline-offset-2 hover:decoration-current"
                >
                  {place.name}
                </Link>
              ) : (
                place.name
              )}
              {vectorTitle ? (
                <span
                  className="ml-2.5 text-sm font-normal leading-snug text-slate-500"
                  data-city-suburb-vector
                >
                  {vectorTitle}
                </span>
              ) : null}
            </h3>
            {/* mt-3 matches nested places gap after gastro (ol mt-3 / pt-3) */}
            {miniAnno ||
            place.stationName ||
            place.travelVectorBlurb ||
            place.gastroHint ? (
              <div className="mt-3 space-y-1.5">
                {miniAnno ? (
                  <p
                    className="line-clamp-3 text-sm leading-relaxed text-slate-600"
                    data-city-suburb-anno
                  >
                    {miniAnno}
                  </p>
                ) : null}
                {place.stationName ? (
                  <p className="text-sm leading-snug text-slate-600" data-city-suburb-exit>
                    <span className="font-semibold text-slate-900">Где выходить</span>
                    <span className="text-slate-500">: {place.stationName}</span>
                  </p>
                ) : null}
                {place.travelVectorBlurb ? (
                  <p className="text-sm leading-relaxed text-slate-500">
                    {place.travelVectorBlurb}
                  </p>
                ) : null}
                {place.gastroHint ? (
                  <p className="text-sm leading-snug text-slate-600" data-city-suburb-gastro>
                    <span className="font-semibold text-slate-900">Гастро-остановка</span>
                    <span className="text-slate-500">: {place.gastroHint}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {nested.length ? (
            <ol
              className="col-span-2 mt-3 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2.5 gap-y-2 border-t border-slate-100 pt-3 sm:gap-x-3"
              data-city-suburb-places
            >
              {nested.map((poi, poiIndex) => {
                const poiHref = resolveCityPlaceTitleHref(poi, venues);
                const poiDesc = String(poi.desc || '').trim();
                return (
                  <li key={`${poi.name}:${poiIndex}`} className="contents" data-city-suburb-place>
                    <span className="pt-0.5 text-center text-xs font-medium leading-5 tabular-nums text-slate-400">
                      {poiIndex + 1}.
                    </span>
                    <span className="min-w-0 text-sm leading-snug text-slate-700">
                      <SuburbPlaceLabel name={poi.name} href={poiHref} desc={poiDesc} />
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {bulkVenues.length > 0 ? (
            <div
              className="col-start-2 mt-3 border-t border-slate-100 pt-3"
              data-city-suburb-cta-footer
            >
              <AddManyToDayRouteButton
                compact
                className="!min-h-8 !px-2.5 !py-1.5 !text-[11px]"
                venues={bulkVenues}
              />
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <div className={className} data-city-significant-suburbs>
      <h2
        className={
          editorial
            ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
            : 'text-xl font-bold text-slate-950 sm:text-2xl'
        }
      >
        Значимые пригороды {cityGenitive}
      </h2>
      {!compact ? (
        <p className={`mt-1.5 text-sm ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
          Поездка на день рядом с городом - отдельные мини-локации и точки внутри них.
        </p>
      ) : null}

      <div className={compact ? 'mt-4' : 'mt-5'}>
        {compact ? renderChipRow('accordion') : renderChipRow('tabs')}
        {selected && selectedIndex != null
          ? compact
            ? renderCompactPanel(selected, selectedIndex)
            : renderHubPanel(selected, selectedIndex)
          : null}
        {compact && selectedIndex == null ? (
          <p className="mt-3 text-sm text-slate-500" data-city-suburb-hint>
            Нажмите на пригород, чтобы открыть точки и добавить в маршрут.
          </p>
        ) : null}
      </div>
    </div>
  );
}
