'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

import { AddManyToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import type { CityMustSeeItem, CitySuburbItem } from '@/lib/cityInfo';
import {
  capitalizeSentenceStart,
  dayRouteHookLine,
  dayRouteItemFromMustSee,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';

export type SuburbsCarouselProps = {
  places: CitySuburbItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  cityGenitive: string;
  /** Hub editorial typography; my-day keeps default slate. */
  editorial?: boolean;
  /**
   * My-day: large suburb name + numbered points only.
   * Hide travel essays, gastro blurbs, station tips, and per-POI descriptions.
   */
  compact?: boolean;
  titleClass?: string;
  /** Outer wrapper class (hub `mt-10`, my-day `mt-5`). */
  className?: string;
};

/**
 * Significant-suburbs rail: one suburb vector per snap slide.
 * Hub: desktop arrows (equal side gutters); mobile swipe + dots; title = name,
 * subtitle = vector; mobile collapses essay/gastro/POI descs behind «Ещё».
 * Compact (my-day): arrows primary (loop) all breakpoints, no pager dots;
 * desktop CTA on title row; mobile CTA under point list.
 * Bulk «В маршрут» adds all nested points of the active slide.
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
  const railRef = React.useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  /** Hub rich cards: mobile collapses essay/gastro/POI descs behind «Ещё». */
  const [expandedByIndex, setExpandedByIndex] = React.useState<Record<number, boolean>>({});
  /** Compact my-day: loop arrows; hub keeps edge-disabled prev/next. */
  const loopNav = compact && places.length > 1;

  const resolvedTitleClass =
    titleClass ||
    `font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`;
  const hubNameClass = `${resolvedTitleClass} text-xl leading-snug sm:text-2xl`;
  const mutedClass = editorial ? 'text-zinc-500' : 'text-slate-500';
  const softClass = editorial ? 'text-zinc-600' : 'text-slate-600';
  const borderSoft = editorial ? 'border-zinc-100' : 'border-slate-100';
  const markerClass = editorial ? 'marker:text-zinc-500' : 'marker:text-slate-500';
  const poiNameClass = editorial ? 'text-zinc-900' : 'text-slate-900';

  const syncRail = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setHasOverflow(overflow);
    if (loopNav) {
      setCanPrev(overflow);
      setCanNext(overflow);
    } else {
      setCanPrev(overflow && scrollLeft > 4);
      setCanNext(overflow && scrollLeft + clientWidth < scrollWidth - 4);
    }
    if (places.length > 1) {
      const cards = el.querySelectorAll<HTMLElement>('[data-city-suburb-card]');
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - scrollLeft);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(best);
    }
  }, [loopNav, places.length]);

  React.useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncRail();
    el.addEventListener('scroll', syncRail, { passive: true });
    window.addEventListener('resize', syncRail, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncRail) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', syncRail);
      window.removeEventListener('resize', syncRail);
      ro?.disconnect();
    };
  }, [syncRail, places.length]);

  const scrollPage = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = loopNav
      ? (activeIndex + dir + places.length) % places.length
      : Math.max(0, Math.min(places.length - 1, activeIndex + dir));
    const card = el.querySelectorAll<HTMLElement>('[data-city-suburb-card]')[next];
    if (card) {
      el.scrollTo({
        left: card.offsetLeft,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
      return;
    }
    el.scrollBy({
      left: dir * el.clientWidth,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const goToIndex = (index: number) => {
    const el = railRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const card = el.querySelectorAll<HTMLElement>('[data-city-suburb-card]')[index];
    if (!card) return;
    el.scrollTo({
      left: card.offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  if (!places.length) return null;

  // Compact (my-day): arrows on all breakpoints. Hub: md+ only.
  // Gutters = 3rem; arrow w-10 at inset 0.25rem → equal 0.25rem gap content↔arrow each side.
  const arrowClass = compact
    ? 'absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2'
    : 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:inline-flex';
  const railGutterClass = compact ? 'px-12' : 'md:px-12';

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
      {/* Symmetric side gutters for arrows; rail is full width inside gutter. */}
      <div className={compact ? 'relative mt-4' : 'relative mt-5'}>
        <div className={railGutterClass}>
          <div
            ref={railRef}
            className={
              compact
                ? 'horizontal-snap-row flex flex-nowrap gap-0 touch-pan-x snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                : 'horizontal-snap-row flex flex-nowrap gap-3 touch-pan-x snap-x snap-mandatory md:gap-0 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden'
            }
            data-city-suburb-rail
            aria-label={`Значимые пригороды ${cityGenitive}`}
            tabIndex={0}
          >
          {places.map((place, index) => {
            const placeHref = resolveCityPlaceTitleHref(place, venues);
            const dayRouteItem = dayRouteItemFromMustSee(place, venues, city, { isSuburb: true });
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
            // Bulk CTA: all nested points of the slide; fallback to suburb root if no list.
            const bulkVenues =
              nestedRouteItems.length > 0
                ? nestedRouteItems
                : dayRouteItem
                  ? [dayRouteItem]
                  : [];
            const vectorTitle = place.travelVector
              ? `${place.travelVector}${place.stationHub ? ` - ${place.stationHub}` : ''}`
              : '';
            const renderBulkCta = () =>
              bulkVenues.length > 0 ? (
                <AddManyToDayRouteButton
                  compact
                  className="!min-h-8 !px-2.5 !py-1.5 !text-[11px]"
                  venues={bulkVenues}
                />
              ) : null;
            const hasBulkCta = bulkVenues.length > 0;

            if (compact) {
              return (
                <article
                  key={`${place.name}:${index}`}
                  className="flex w-full shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                  data-city-suburb-card
                  data-city-suburb-compact
                  aria-label={`${index + 1} из ${places.length}: ${place.name}`}
                >
                  {/* Header: [number] [LARGE name] [desktop CTA]; vector subtitle. */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold leading-none text-primary-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
                        <h3
                          className="min-w-0 flex-1 break-words text-xl font-bold leading-snug text-slate-950 sm:text-2xl"
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
                        </h3>
                        {hasBulkCta ? (
                          <div className="hidden shrink-0 md:block" data-city-suburb-cta-header>
                            {renderBulkCta()}
                          </div>
                        ) : null}
                      </div>
                      {vectorTitle ? (
                        <p
                          className="mt-1 text-sm leading-5 text-slate-600"
                          data-city-suburb-vector
                        >
                          {vectorTitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {nested.length ? (
                    <ol
                      className="mt-3 list-decimal space-y-1.5 border-t border-slate-100 pt-3 pl-5"
                      data-city-suburb-places
                    >
                      {nested.map((poi, poiIndex) => {
                        const poiHref = resolveCityPlaceTitleHref(poi, venues);
                        return (
                          <li
                            key={`${poi.name}:${poiIndex}`}
                            className="text-base leading-6 marker:text-slate-400"
                            data-city-suburb-place
                          >
                            {poiHref ? (
                              <Link
                                href={poiHref}
                                className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-current"
                              >
                                {poi.name}
                              </Link>
                            ) : (
                              <span className="font-medium text-slate-900">{poi.name}</span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                  {hasBulkCta ? (
                    <div
                      className="mt-3 flex justify-end border-t border-slate-100 pt-3 md:hidden"
                      data-city-suburb-cta-footer
                    >
                      {renderBulkCta()}
                    </div>
                  ) : null}
                </article>
              );
            }

            const expanded = Boolean(expandedByIndex[index]);
            const hasRichExtras = Boolean(
              blurb || place.travelVectorBlurb || place.gastroHint || nested.some((p) => p.desc),
            );
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
            const nestedRichList = nested.length ? (
              <ol
                className={`mt-3 list-decimal space-y-2 border-t pt-3 pl-5 ${borderSoft}`}
                data-city-suburb-places
              >
                {nested.map((poi, poiIndex) => {
                  const poiHref = resolveCityPlaceTitleHref(poi, venues);
                  return (
                    <li
                      key={`${poi.name}:${poiIndex}`}
                      className={`text-sm leading-5 ${markerClass}`}
                      data-city-suburb-place
                    >
                      {poiHref ? (
                        <Link
                          href={poiHref}
                          className={`font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-current ${poiNameClass}`}
                        >
                          {poi.name}
                        </Link>
                      ) : (
                        <span className={`font-medium ${poiNameClass}`}>{poi.name}</span>
                      )}
                      {poi.desc ? (
                        <span className={mutedClass}>
                          {' - '}
                          {capitalizeSentenceStart(poi.desc)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : null;
            const nestedCompactList = nested.length ? (
              <ol
                className={`mt-3 list-decimal space-y-1.5 border-t pt-3 pl-5 ${borderSoft}`}
                data-city-suburb-places
                data-city-suburb-places-compact="1"
              >
                {nested.map((poi, poiIndex) => {
                  const poiHref = resolveCityPlaceTitleHref(poi, venues);
                  return (
                    <li
                      key={`${poi.name}:${poiIndex}`}
                      className={`text-sm leading-5 ${markerClass}`}
                      data-city-suburb-place
                    >
                      {poiHref ? (
                        <Link
                          href={poiHref}
                          className={`font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-current ${poiNameClass}`}
                        >
                          {poi.name}
                        </Link>
                      ) : (
                        <span className={`font-medium ${poiNameClass}`}>{poi.name}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : null;
            const richEssay = (
              <>
                {place.travelVectorBlurb ? (
                  <p className={`mt-1.5 text-xs leading-5 ${mutedClass}`}>{place.travelVectorBlurb}</p>
                ) : null}
                {blurb ? (
                  <p className={`mt-1.5 text-sm leading-6 break-words ${mutedClass}`}>{blurb}</p>
                ) : null}
                {place.gastroHint ? (
                  <p className={`mt-2 text-xs ${softClass}`}>Гастро-остановка: {place.gastroHint}</p>
                ) : null}
              </>
            );

            return (
              <article
                key={`${place.name}:${index}`}
                className={`flex w-[min(92%,36rem)] shrink-0 snap-start flex-col rounded-2xl border p-4 sm:p-5 md:w-full ${
                  editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white'
                }`}
                data-city-suburb-card
                data-city-suburb-expanded={expanded ? '1' : undefined}
                aria-label={`${index + 1} из ${places.length}: ${place.name}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      editorial ? 'bg-zinc-100 text-zinc-800' : 'bg-primary-50 text-primary-700'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Title = suburb name; subtitle = travel vector / station hub. */}
                    <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
                      <h3 className={`${hubNameClass} min-w-0 flex-1 break-words`} data-city-suburb-title>
                        {nameHeading}
                      </h3>
                      {hasBulkCta ? <div className="shrink-0">{renderBulkCta()}</div> : null}
                    </div>
                    {vectorTitle ? (
                      <p
                        className={`mt-1 text-sm leading-5 ${softClass}`}
                        data-city-suburb-vector
                      >
                        {vectorTitle}
                      </p>
                    ) : null}
                    {place.stationName ? (
                      <p className={`mt-1 text-xs ${softClass}`}>Где выходить: {place.stationName}</p>
                    ) : null}

                    {/* Desktop: full richness always. */}
                    <div className="hidden md:block">
                      {richEssay}
                      {nestedRichList}
                    </div>

                    {/* Mobile: short list by default; essay + POI descs behind «Ещё». */}
                    <div className="md:hidden">
                      {expanded ? (
                        <>
                          {richEssay}
                          {nestedRichList}
                        </>
                      ) : (
                        nestedCompactList
                      )}
                      {hasRichExtras ? (
                        <button
                          type="button"
                          className={`mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-medium ${softClass} transition hover:opacity-80`}
                          aria-expanded={expanded}
                          data-city-suburb-expand
                          onClick={() =>
                            setExpandedByIndex((prev) => ({
                              ...prev,
                              [index]: !prev[index],
                            }))
                          }
                        >
                          {expanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                              Свернуть
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                              Ещё
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        </div>
        <button
          type="button"
          data-city-suburb-prev
          aria-label="Предыдущий пригород"
          aria-disabled={!canPrev}
          tabIndex={canPrev ? 0 : -1}
          disabled={!canPrev}
          onClick={() => scrollPage(-1)}
          className={`${arrowClass} left-1 ${
            hasOverflow
              ? canPrev
                ? 'opacity-100 hover:bg-white hover:text-slate-950'
                : 'pointer-events-none opacity-40'
              : 'pointer-events-none opacity-0'
          }`}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          data-city-suburb-next
          aria-label="Следующий пригород"
          aria-disabled={!canNext}
          tabIndex={canNext ? 0 : -1}
          disabled={!canNext}
          onClick={() => scrollPage(1)}
          className={`${arrowClass} right-1 ${
            hasOverflow
              ? canNext
                ? 'opacity-100 hover:bg-white hover:text-slate-950'
                : 'pointer-events-none opacity-40'
              : 'pointer-events-none opacity-0'
          }`}
        >
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {/* Compact: arrows on all breakpoints - no pager. Hub: mobile-only (no arrows below md). */}
      {!compact && places.length > 1 ? (
        <div
          className="mt-3 flex items-center justify-center gap-1.5 md:hidden"
          data-city-suburb-dots
          role="tablist"
          aria-label="Страницы пригородов"
        >
          {places.map((place, index) => (
            <button
              key={`dot:${place.name}:${index}`}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`${place.name} (${index + 1} из ${places.length})`}
              onClick={() => goToIndex(index)}
              className={`h-2 rounded-full transition-[width,background-color] ${
                activeIndex === index
                  ? `${editorial ? 'bg-zinc-800' : 'bg-primary-600'} w-5`
                  : `${editorial ? 'bg-zinc-300 hover:bg-zinc-400' : 'bg-slate-300 hover:bg-slate-400'} w-2`
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
