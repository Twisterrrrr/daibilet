'use client';

import * as React from 'react';
import {
  Anchor,
  Car,
  ChevronDown,
  Clock,
  MapPin,
  Navigation as NavigationIcon,
  Share2,
  Ticket,
  Waves,
} from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { LocationCard } from '@/components/LocationCard.client';
import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { OsmMapEmbed } from '@/components/OsmMapEmbed';
import { VenueBreadcrumbsNav } from '@/components/VenueBreadcrumbsNav.client';
import {
  VenueLogisticsBlock,
  hasUsefulLocationDirections,
} from '@/components/VenueLogisticsBlock';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { expandSessionPurchaseVariants, isSessionPurchaseBlocked } from '@/lib/event-purchase';
import { formatMoney, formatNumber } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import { build2gisRouteUrl } from '@/lib/maps';
import { dedupeVenueLinkedEvents } from '@/lib/day-route-score';
import { resolveNearestMetroStationName } from '@/lib/nearest-metro';
import type { VenueEventGroup } from '@/lib/venue-program';
import { formatVenueMetroLabel } from '@/lib/venue-editorial-content';
import { normalizeVenueKind, resolveLocationVenueCopy, venueTypeIcon, venueTypeLabel } from '@/lib/venue-meta';
import { eventHref, venueHref } from '@/lib/routes';
import type {
  PublicSessionDto,
  PublicVenueDto,
  PublicVenueLinkedEventDto,
  PublicVenuePageDto,
} from '@daibilet/contracts/public';

export function LocationVenueLayout({
  venue,
  stats,
  sessions,
  routeGroups = [],
  relatedVenues,
  stopEvents = [],
  nearbyEvents = [],
  pagePayload,
  children,
}: {
  venue: PublicVenueDto;
  stats: PublicVenuePageDto['stats'];
  sessions: PublicSessionDto[];
  routeGroups?: VenueEventGroup[];
  relatedVenues: PublicVenueDto[];
  stopEvents?: PublicVenueLinkedEventDto[];
  nearbyEvents?: PublicVenueLinkedEventDto[];
  pagePayload: PublicVenuePageDto;
  children?: React.ReactNode;
}) {
  const title = venue.seoH1 || venue.title || venue.name;
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });
  const metroLabel = React.useMemo(() => {
    const name = resolveNearestMetroStationName({
      latitude: venue.latitude,
      longitude: venue.longitude,
      city: venue.city,
      citySlug: venue.citySlug,
      metroStation: venue.metroStation,
    });
    return formatVenueMetroLabel(name);
  }, [venue.latitude, venue.longitude, venue.city, venue.citySlug, venue.metroStation]);
  const heroAddressLine = [streetAddress, metroLabel].filter(Boolean).join(' • ');
  const hasMap = Boolean(venue.latitude && venue.longitude);
  const isPier = normalizeVenueKind(venue.type) === 'pier' || normalizeVenueKind(venue.type) === 'pier_water';
  const isBus = normalizeVenueKind(venue.type) === 'bus';
  const isParkLike =
    normalizeVenueKind(venue.type) === 'park' ||
    normalizeVenueKind(venue.type) === 'monument' ||
    normalizeVenueKind(venue.type) === 'outdoor_location' ||
    normalizeVenueKind(venue.type) === 'attraction';
  const todaySlots = React.useMemo(() => collectTodayTimeSlots(sessions), [sessions]);
  const uniqueStopEvents = React.useMemo(() => dedupeVenueLinkedEvents(stopEvents), [stopEvents]);
  const uniqueNearbyEvents = React.useMemo(
    () => dedupeVenueLinkedEvents(nearbyEvents),
    [nearbyEvents],
  );
  const TypeIcon = venueTypeIcon(venue.type);
  const typeLabel = venueTypeLabel(venue.type);
  const routeCount = routeGroups.length || stats.events;
  const { aboutBody, heroLead } = resolveLocationVenueCopy(venue);
  const hookFact = String(venue.hookFact || '').replace(/\s+/g, ' ').trim();
  const stopExcursionCount =
    uniqueStopEvents.length > 0 ? uniqueStopEvents.length : Number(venue.stopEventCount ?? 0);
  const hasStopExcursions = stopExcursionCount > 0;
  const hasNearbyExcursions = uniqueNearbyEvents.length > 0;
  /** Late FAQ only for timed boards / ticketed departures - not static monuments. */
  const showLateArrivalFaq =
    isPier ||
    isBus ||
    todaySlots.length > 0 ||
    routeGroups.length > 0 ||
    sessions.length > 0 ||
    Number(stats.events || 0) > 0;

  return (
    <div className="bg-slate-50 pb-24 lg:pb-0">
      <div className="border-b border-slate-200 bg-white">
        <VenueBreadcrumbsNav payload={pagePayload} />
      </div>

      {isPier ? (
        <>
          <section className="relative isolate grid w-full overflow-hidden bg-slate-900 text-white aspect-square md:aspect-auto md:min-h-80 lg:min-h-[28rem]">
            <div className="absolute inset-0">
              {venue.heroImageUrl ? (
                <SafeImage
                  src={venue.heroImageUrl}
                  alt=""
                  fill
                  sizes={IMAGE_SIZES.eventHero}
                  className="object-cover object-[center_20%] opacity-80"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-sky-800 to-slate-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-sky-950/90 via-slate-900/50 to-slate-900/20" />
            </div>
            <div className="container-page absolute inset-0 z-10 flex flex-col justify-end pb-5 pt-20 md:pb-12 md:pt-24">
              {/* Type pills fight H1 on mobile - desktop only, solid chips */}
              <div className="mb-3 hidden flex-wrap gap-2 md:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold">
                  <Anchor className="h-3.5 w-3.5" /> Причал
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400 px-3 py-1 text-xs font-bold text-sky-950">
                  <Waves className="h-3.5 w-3.5" /> {formatNumber(routeCount)} {routeCount === 1 ? 'маршрут' : routeCount >= 2 && routeCount <= 4 ? 'маршрута' : 'маршрутов'}
                </span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl md:text-5xl">{title}</h1>
              {/* Mobile: one meta line; sticky has CTA */}
              <p className="mt-2 text-sm font-medium text-white/90 md:hidden">
                {[
                  `${formatNumber(routeCount)} ${routeCount === 1 ? 'маршрут' : routeCount >= 2 && routeCount <= 4 ? 'маршрута' : 'маршрутов'}`,
                  formatMoney(stats.priceFrom),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {heroLead ? (
                <p className="mt-3 hidden max-w-3xl text-sm text-white/85 sm:text-base md:block">{heroLead}</p>
              ) : null}
              <div className="mt-3 hidden flex-wrap gap-x-5 gap-y-1 text-sm text-white/85 md:flex">
                {heroAddressLine ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {heroAddressLine}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Ticket className="h-4 w-4" /> {formatMoney(stats.priceFrom)}
                </span>
              </div>
            </div>
          </section>
          {(heroLead || heroAddressLine) ? (
            <div className="border-b border-slate-200 bg-white md:hidden">
              <div className="container-page space-y-2 py-4 text-sm text-slate-700">
                {heroLead ? <p className="leading-relaxed text-slate-600">{heroLead}</p> : null}
                {heroAddressLine ? (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    <span>{heroAddressLine}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {hasMap ? <LocationMapStrip venue={venue} /> : null}
        </>
      ) : isBus ? (
        <>
        <section className="relative isolate grid w-full overflow-hidden bg-slate-900 text-white aspect-square md:aspect-auto md:min-h-80 lg:min-h-[28rem]">
          <div className="absolute inset-0">
            {venue.heroImageUrl ? (
              <SafeImage src={venue.heroImageUrl} alt="" fill sizes={IMAGE_SIZES.eventHero} className="object-cover object-[center_20%] opacity-80" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/15" />
          </div>
          <div className="container-page absolute inset-0 z-10 flex flex-col justify-end pb-5 pt-20 md:pb-14 md:pt-24 lg:pb-20">
            <div className="mb-3 hidden flex-wrap gap-2 md:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold">
                <TypeIcon className="h-3.5 w-3.5" /> {typeLabel}
              </span>
              <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold">{venue.city}</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-2 text-sm font-medium text-white/90 md:hidden">
              {[
                `${formatNumber(stats.events)} ${isBus ? 'рейсов' : 'событий'}`,
                venue.city,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="mt-3 hidden max-w-2xl text-white/85 md:block">{heroLead}</p>
            <div className="mt-5 hidden flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85 md:flex">
              <span className="inline-flex items-center gap-1.5">
                <Ticket className="h-4 w-4" /> {formatNumber(stats.events)} {isBus ? 'рейсов' : 'событий'}
              </span>
              {heroAddressLine ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {heroAddressLine}
                </span>
              ) : null}
            </div>
          </div>
        </section>
        {(heroLead || heroAddressLine) ? (
          <div className="border-b border-slate-200 bg-white md:hidden">
            <div className="container-page space-y-2 py-4 text-sm text-slate-700">
              {heroLead ? <p className="leading-relaxed text-slate-600">{heroLead}</p> : null}
              {heroAddressLine ? (
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <span>{heroAddressLine}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        </>
      ) : isParkLike ? (
        <>
          <section className="relative isolate grid w-full overflow-hidden bg-emerald-900 text-white aspect-square md:aspect-auto md:min-h-80 lg:min-h-[28rem]">
          <div className="absolute inset-0">
            {venue.heroImageUrl ? (
              <SafeImage src={venue.heroImageUrl} alt="" fill sizes={IMAGE_SIZES.eventHero} className="object-cover object-[center_20%] opacity-80" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-emerald-700 to-emerald-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/55 to-emerald-950/15" />
          </div>
          <div className="container-page absolute inset-0 z-10 flex flex-col justify-end pb-5 pt-20 md:pb-14 md:pt-24 lg:pb-20">
            <div className="mb-3 hidden flex-wrap gap-2 md:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold">
                <TypeIcon className="h-3.5 w-3.5" /> {typeLabel}
              </span>
              <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold">{venue.city}</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-2 text-sm font-medium text-white/90 md:hidden">
              {[
                hasStopExcursions
                  ? `${formatNumber(stopExcursionCount)} ${
                      stopExcursionCount === 1
                        ? 'экскурсия'
                        : stopExcursionCount >= 2 && stopExcursionCount <= 4
                          ? 'экскурсии'
                          : 'экскурсий'
                    }`
                  : null,
                venue.city,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="mt-3 hidden max-w-2xl text-white/85 md:block">{heroLead}</p>
            {venue.hookFact ? <p className="mt-2 hidden max-w-2xl text-sm text-emerald-100/95 md:block">{venue.hookFact}</p> : null}
            {hasStopExcursions || heroAddressLine ? (
              <div className="mt-5 hidden flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85 md:flex">
                {hasStopExcursions ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Ticket className="h-4 w-4" />{' '}
                    {formatNumber(stopExcursionCount)}{' '}
                    {stopExcursionCount === 1
                      ? 'экскурсия'
                      : stopExcursionCount >= 2 && stopExcursionCount <= 4
                        ? 'экскурсии'
                        : 'экскурсий'}
                  </span>
                ) : null}
                {heroAddressLine ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {heroAddressLine}
                  </span>
                ) : null}
              </div>
            ) : null}
            {/* Sticky footer has CTA on mobile - avoid duplicate hero buttons */}
            <div className="mt-6 hidden flex-wrap items-center gap-3 md:flex">
              {hasStopExcursions ? (
                <a
                  href="#venue-stop-events"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-50"
                >
                  Посмотреть экскурсии
                </a>
              ) : null}
              <AddToDayRouteButton
                variant="dark"
                venue={{
                  id: venue.id,
                  slug: venue.slug,
                  title: venue.title || venue.name,
                  city: venue.city,
                  cityId: venue.cityId,
                  citySlug: venue.citySlug,
                  href: venueHref(venue),
                  imageUrl: venue.heroImageUrl,
                  address: venue.address,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                }}
              />
            </div>
          </div>
        </section>
          {(heroLead || venue.hookFact || heroAddressLine) ? (
            <div className="border-b border-slate-200 bg-white md:hidden">
              <div className="container-page space-y-2 py-4 text-sm text-slate-700">
                {heroLead ? <p className="leading-relaxed text-slate-600">{heroLead}</p> : null}
                {venue.hookFact ? <p className="font-medium text-emerald-800">{venue.hookFact}</p> : null}
                {heroAddressLine ? (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    <span>{heroAddressLine}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {hasMap ? <LocationMapStrip venue={venue} /> : null}
        </>
      ) : (
        <section className="border-b border-slate-200 bg-white">
          <div className="container-page px-0 sm:px-6 lg:px-8">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="relative overflow-hidden lg:rounded-l-3xl">
                <div className="relative aspect-square md:aspect-[16/10] lg:aspect-auto lg:h-[520px]">
                  {venue.heroImageUrl ? (
                    <SafeImage src={venue.heroImageUrl} alt="" fill sizes={IMAGE_SIZES.eventCard} className="object-cover object-[center_20%]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 via-primary-600 to-indigo-700">
                      <TypeIcon className="h-16 w-16 text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
                  <div className="absolute left-6 top-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-slate-900 backdrop-blur">
                      <TypeIcon className="h-4 w-4 text-primary-600" />
                      {typeLabel}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">{title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
                      {heroAddressLine || venue.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {heroAddressLine || venue.city}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-slate-100 lg:rounded-r-3xl">
                <div className="relative aspect-[16/10] lg:aspect-auto lg:h-[520px]">
                  {hasMap ? (
                    <OsmMapEmbed
                      lat={venue.latitude!}
                      lng={venue.longitude!}
                      title={`Карта: ${venue.name}`}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-200 p-8 text-center text-slate-600">
                      <MapPin className="h-10 w-10 text-slate-400" />
                      <p className="text-sm">Координаты уточняются</p>
                    </div>
                  )}
                  {hasMap ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-white via-white/90 to-transparent p-5 pt-16">
                      <a
                        href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=17&l=map`}
                        target="_blank"
                        rel="noreferrer"
                        className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-primary-600"
                      >
                        <NavigationIcon className="h-4 w-4" /> Открыть в Яндекс.Картах
                      </a>
                      <a
                        href={build2gisRouteUrl(venue.latitude!, venue.longitude!)}
                        target="_blank"
                        rel="noreferrer"
                        className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        <Car className="h-4 w-4" /> Маршрут в 2ГИС
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {isPier && routeGroups.length > 0 ? (
            <section id="location-routes" className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Маршруты с этого причала</h2>
              <p className="mt-1 text-sm text-slate-500">Купите билет онлайн - приходите за 15 минут до отправления.</p>
              <div className="mt-4 space-y-3">
                {routeGroups.map((group) => {
                  const nextSlot = group.visibleSlots[0] || group.representative;
                  return (
                    <div key={group.key} className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <a href={eventHref(group.representative)} className="font-semibold text-slate-900 hover:text-primary-700">
                          {group.title}
                        </a>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {group.category}
                          </span>
                          {nextSlot ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                              <Waves className="h-3 w-3" /> Ближайший рейс: {nextSlot.dateLabel} · {nextSlot.timeLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 self-center sm:self-auto">
                        <div className="text-lg font-bold leading-none text-slate-900">{formatMoney(group.priceFrom)}</div>
                        <a
                          href={eventHref(group.representative)}
                          className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                        >
                          Купить
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {((hookFact && !isParkLike) || aboutBody) ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">О локации</h2>
            {hookFact && !isParkLike ? (
              <p className="mt-2 text-sm font-semibold text-emerald-800">{hookFact}</p>
            ) : null}
            {aboutBody ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{aboutBody}</p>
            ) : null}
          </section>
          ) : null}

          {/* Address/metro live in sidebar Contacts; this block only for real directions. */}
          {hasUsefulLocationDirections(venue) ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Как добраться</h2>
              <VenueLogisticsBlock venue={venue} showName={false} directionsOnly className="mt-4" />
            </section>
          ) : null}

          {isParkLike && (hasStopExcursions || hasNearbyExcursions) ? (
            <section id="venue-stop-events" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">
                {hasStopExcursions
                  ? 'Экскурсии, которые включают это место'
                  : 'Рядом'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {hasStopExcursions
                  ? 'Маршруты с явной остановкой у этой локации.'
                  : 'События в радиусе 300 м. Это не афиша площадки!'}
              </p>
              <ul className="mt-4 space-y-3" data-venue-linked-events-deduped>
                {(hasStopExcursions ? uniqueStopEvents : uniqueNearbyEvents).map((event) => (
                  <li key={event.id}>
                    <a
                      href={`/events/${encodeURIComponent(event.slug)}`}
                      className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-primary/30 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-900 hover:text-primary-700">{event.title}</span>
                        {event.venue && !hasStopExcursions ? (
                          <span className="mt-0.5 block text-xs text-slate-500">{event.venue}</span>
                        ) : null}
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {event.priceFrom != null ? formatMoney(event.priceFrom) : 'Смотреть'}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {todaySlots.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {isPier ? 'Отправления сегодня' : isBus ? 'Отправления автобуса сегодня' : 'Ближайшие сборы сегодня'}
                </h2>
                <span className="text-sm text-slate-500">{formatNumber(routeCount)} маршрутов отсюда</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {todaySlots.map((time) => (
                  <a
                    key={time}
                    href="#venue-program"
                    className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-primary-600 hover:bg-primary-600 hover:text-white"
                  >
                    <Clock className="h-3.5 w-3.5 text-primary-600 group-hover:text-white" />
                    {time}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {children}

          {showLateArrivalFaq ? (
            <details className="group rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between p-5">
                <span className="font-semibold text-slate-900">Что делать, если опаздываю?</span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-5 text-sm text-slate-600">
                Позвоните организатору по номеру в билете. На причалах и точках сбора обычно ждут 5-10 минут; на автобусных сборах - по расписанию, без задержек.
              </div>
            </details>
          ) : null}

          {relatedVenues.length > 0 && isParkLike ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Рядом</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {relatedVenues.slice(0, 4).map((related) => (
                  <LocationCard key={related.id} venue={related} href={venueHref(related)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <LocationVenueSidebar venue={venue} relatedVenues={relatedVenues} metroLabel={metroLabel} />
      </div>

      <MobileStickyActionBar>
        {hasStopExcursions ? (
          <a
            href="#venue-stop-events"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
          >
            Экскурсии
          </a>
        ) : isPier && routeGroups.length > 0 ? (
          <a
            href="#location-routes"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
          >
            Маршруты
          </a>
        ) : null}
        <AddToDayRouteButton
          className={`min-h-11 rounded-full px-4 text-sm ${hasStopExcursions || (isPier && routeGroups.length > 0) ? 'flex-1' : 'w-full'}`}
          venue={{
            id: venue.id,
            slug: venue.slug,
            title: venue.title || venue.name,
            city: venue.city,
            cityId: venue.cityId,
            citySlug: venue.citySlug,
            href: venueHref(venue),
            imageUrl: venue.heroImageUrl,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
          }}
        />
      </MobileStickyActionBar>
    </div>
  );
}

function LocationVenueSidebar({
  venue,
  relatedVenues,
  metroLabel,
}: {
  venue: PublicVenueDto;
  relatedVenues: PublicVenueDto[];
  metroLabel: string | null;
}) {
  const hasCoords = Boolean(venue.latitude && venue.longitude);
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });

  const copyCoords = () => {
    if (!hasCoords) return;
    void navigator.clipboard?.writeText(`${venue.latitude}, ${venue.longitude}`);
  };

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-4">
        {streetAddress || metroLabel || venue.city ? (
          <div id="contacts" className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Контакты</div>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              {streetAddress || venue.city ? (
                <li className="flex items-start gap-2">
                  <span className="shrink-0" aria-hidden="true">
                    📍
                  </span>
                  <span>
                    {streetAddress || venue.city}
                    {streetAddress && venue.city && !streetAddress.includes(venue.city)
                      ? `, ${venue.city}`
                      : ''}
                  </span>
                </li>
              ) : null}
              {metroLabel ? (
                <li className="flex items-start gap-2">
                  <span className="shrink-0" aria-hidden="true">
                    🚇
                  </span>
                  <span>{metroLabel}</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {hasCoords ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Координаты</div>
            <div className="mt-2 font-mono text-sm text-slate-600">
              {venue.latitude!.toFixed(5)}, {venue.longitude!.toFixed(5)}
            </div>
            <button
              type="button"
              onClick={copyCoords}
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Скопировать
            </button>
          </div>
        ) : null}

        <AddToDayRouteButton
          className="w-full min-h-12 rounded-2xl px-4 py-3 text-sm"
          venue={{
            id: venue.id,
            slug: venue.slug,
            title: venue.title || venue.name,
            city: venue.city,
            cityId: venue.cityId,
            citySlug: venue.citySlug,
            href: venueHref(venue),
            imageUrl: venue.heroImageUrl,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({ title: venue.name, url: window.location.href });
            } else {
              void navigator.clipboard?.writeText(window.location.href);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" /> Поделиться точкой
        </button>

        {relatedVenues.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Рядом ещё точки</div>
            {relatedVenues.slice(0, 3).map((related) => (
              <LocationCard key={related.id} venue={related} href={venueHref(related)} />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function collectTodayTimeSlots(sessions: PublicSessionDto[]): string[] {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const slots = new Set<string>();
  for (const session of sessions.flatMap((item) => expandSessionPurchaseVariants(item))) {
    if (isSessionPurchaseBlocked(session)) continue;
    const date = new Date(session.startsAt);
    if (!Number.isFinite(date.getTime())) continue;
    const sessionKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (sessionKey !== key) continue;
    if (session.timeLabel) slots.add(session.timeLabel);
  }
  return [...slots].sort((a, b) => a.localeCompare(b, 'ru'));
}

function LocationMapStrip({ venue }: { venue: PublicVenueDto }) {
  if (!venue.latitude || !venue.longitude) return null;

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-page py-0">
        <div className="overflow-hidden rounded-none border-y border-slate-200 sm:rounded-2xl sm:border sm:my-4">
          <OsmMapEmbed
            lat={venue.latitude}
            lng={venue.longitude}
            title={`Карта: ${venue.name}`}
            className="relative h-64 w-full sm:h-80"
          />
          <div className="flex flex-wrap gap-2 p-4">
            <a
              href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=17&l=map`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              <NavigationIcon className="h-4 w-4" /> Яндекс.Карты
            </a>
            <a
              href={build2gisRouteUrl(venue.latitude!, venue.longitude!)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <Car className="h-4 w-4" /> Маршрут в 2ГИС
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
