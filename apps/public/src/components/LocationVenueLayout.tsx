import * as React from 'react';
import {
  Anchor,
  Car,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Share2,
  Ticket,
  Waves,
} from 'lucide-react';

import { LocationCard } from '@/components/LocationCard';
import { OsmMapEmbed } from '@/components/OsmMapEmbed';
import {
  buildTcPurchaseTargets,
  expandSessionPurchaseVariants,
  isSessionPurchaseBlocked,
  SessionBuyButton,
} from '@/components/TcWidget';
import { formatMoney, formatNumber } from '@/data';
import { formatStreetAddress } from '@/lib/address';
import { build2gisRouteUrl } from '@/lib/maps';
import type { VenueEventGroup } from '@/lib/venue-program';
import { normalizeVenueKind, resolveLocationVenueCopy, venueTypeIcon, venueTypeLabel } from '@/lib/venue-meta';
import { eventHref, venueHref } from '@/routes';
import type { PublicSession, PublicVenue, PublicVenuePage } from '@/types';

export function LocationVenueLayout({
  venue,
  stats,
  sessions,
  routeGroups = [],
  relatedVenues,
}: {
  venue: PublicVenue;
  stats: PublicVenuePage['stats'];
  sessions: PublicSession[];
  routeGroups?: VenueEventGroup[];
  relatedVenues: PublicVenue[];
}) {
  const title = venue.seoH1 || venue.title || venue.name;
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });
  const hasMap = Boolean(venue.latitude && venue.longitude);
  const isPier = normalizeVenueKind(venue.type) === 'pier' || normalizeVenueKind(venue.type) === 'pier_water';
  const isBus = normalizeVenueKind(venue.type) === 'bus';
  const isPark = normalizeVenueKind(venue.type) === 'outdoor_location' || normalizeVenueKind(venue.type) === 'attraction';
  const todaySlots = React.useMemo(() => collectTodayTimeSlots(sessions), [sessions]);
  const TypeIcon = venueTypeIcon(venue.type);
  const typeLabel = venueTypeLabel(venue.type);
  const routeCount = routeGroups.length || stats.events;
  const { fullDescription, heroLead } = resolveLocationVenueCopy(venue);

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex items-center gap-1.5 py-3 text-sm text-slate-500">
          <a href="/" className="hover:text-primary-600">
            Главная
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href="/locations" className="hover:text-primary-600">
            Локации
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">{venue.city}</span>
        </div>
      </div>

      {isPier ? (
        <>
          <section className="relative overflow-hidden bg-slate-900 text-white">
            <div className="absolute inset-0">
              {venue.heroImageUrl ? (
                <img src={venue.heroImageUrl} alt="" className="h-full w-full object-cover opacity-40" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-sky-800 to-slate-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 via-slate-900/70 to-slate-900/40" />
            </div>
            <div className="container-page relative py-12">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  <Anchor className="h-3.5 w-3.5" /> Причал
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400 px-3 py-1 text-xs font-bold text-sky-950">
                  <Waves className="h-3.5 w-3.5" /> {formatNumber(routeCount)} {routeCount === 1 ? 'маршрут' : routeCount >= 2 && routeCount <= 4 ? 'маршрута' : 'маршрутов'}
                </span>
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">{title}</h1>
              {heroLead ? <p className="mt-3 max-w-3xl text-sm text-white/85 sm:text-base">{heroLead}</p> : null}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
                {streetAddress ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {streetAddress}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Ticket className="h-4 w-4" /> от {formatMoney(stats.priceFrom)}
                </span>
              </div>
            </div>
          </section>
          {hasMap ? <LocationMapStrip venue={venue} /> : null}
        </>
      ) : isBus ? (
        <section className="relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0">
            {venue.heroImageUrl ? (
              <img src={venue.heroImageUrl} alt="" className="h-full w-full object-cover opacity-60" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10" />
          </div>
          <div className="container-page relative py-14 md:py-20">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <TypeIcon className="h-3.5 w-3.5" /> {typeLabel}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">{venue.city}</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-white/85">{heroLead}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Ticket className="h-4 w-4" /> {formatNumber(stats.events)} {isBus ? 'рейсов' : 'событий'}
              </span>
              {streetAddress ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {streetAddress}
                </span>
              ) : null}
            </div>
          </div>
        </section>
      ) : isPark ? (
        <>
          <section className="relative overflow-hidden bg-emerald-900 text-white">
          <div className="absolute inset-0">
            {venue.heroImageUrl ? (
              <img src={venue.heroImageUrl} alt="" className="h-full w-full object-cover opacity-60" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-emerald-700 to-emerald-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/10" />
          </div>
          <div className="container-page relative py-14 md:py-20">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <TypeIcon className="h-3.5 w-3.5" /> {typeLabel}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">{venue.city}</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-white/85">{heroLead}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Ticket className="h-4 w-4" /> {formatNumber(stats.events)} событий
              </span>
              {streetAddress ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {streetAddress}
                </span>
              ) : null}
            </div>
          </div>
        </section>
          {hasMap ? <LocationMapStrip venue={venue} /> : null}
        </>
      ) : (
        <section className="border-b border-slate-200 bg-white">
          <div className="container-page px-0 sm:px-6 lg:px-8">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="relative overflow-hidden lg:rounded-l-3xl">
                <div className="relative aspect-[16/10] lg:aspect-auto lg:h-[520px]">
                  {venue.heroImageUrl ? (
                    <img src={venue.heroImageUrl} alt="" className="h-full w-full object-cover" />
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
                    <h1 className="font-display text-2xl font-extrabold sm:text-3xl lg:text-4xl">{title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
                      {streetAddress ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {streetAddress}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {venue.city}
                        </span>
                      )}
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
                        <Navigation className="h-4 w-4" /> Открыть в Яндекс.Картах
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
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Маршруты с этого причала</h2>
              <p className="mt-1 text-sm text-slate-500">Купите билет онлайн — приходите за 15 минут до отправления.</p>
              <div className="mt-4 space-y-3">
                {routeGroups.map((group) => {
                  const nextSlot = group.visibleSlots[0] || group.representative;
                  const purchaseTargets = buildTcPurchaseTargets(group.sessions);
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
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">от</div>
                          <div className="text-lg font-bold text-slate-900">{formatMoney(group.priceFrom)}</div>
                        </div>
                        <SessionBuyButton
                          session={group.representative}
                          purchaseTargets={purchaseTargets.length ? purchaseTargets : undefined}
                          className="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">О локации</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{fullDescription}</p>
            {streetAddress ? (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  1
                </div>
                <p className="text-sm text-slate-700">
                  Адрес: <strong>{streetAddress}</strong>, {venue.city}
                </p>
              </div>
            ) : null}
          </section>

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

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Как добраться</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <MapPin className="mt-0.5 h-5 w-5 text-primary-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Адрес</div>
                  <div className="text-sm text-slate-600">{streetAddress || `${venue.city} - уточняется`}</div>
                </div>
              </div>
              {venue.city ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary-600" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Город</div>
                    <div className="text-sm text-slate-600">{venue.city}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <details className="group rounded-2xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5">
              <span className="font-semibold text-slate-900">Что делать, если опаздываю?</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5 text-sm text-slate-600">
              Позвоните организатору по номеру в билете. На причалах и точках сбора обычно ждут 5–10 минут; на автобусных сборах — по расписанию, без задержек.
            </div>
          </details>
        </div>

        <LocationVenueSidebar venue={venue} relatedVenues={relatedVenues} />
      </div>
    </div>
  );
}

function LocationVenueSidebar({ venue, relatedVenues }: { venue: PublicVenue; relatedVenues: PublicVenue[] }) {
  const hasCoords = Boolean(venue.latitude && venue.longitude);

  const copyCoords = () => {
    if (!hasCoords) return;
    void navigator.clipboard?.writeText(`${venue.latitude}, ${venue.longitude}`);
  };

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-4">
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

function collectTodayTimeSlots(sessions: PublicSession[]): string[] {
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

function LocationMapStrip({ venue }: { venue: PublicVenue }) {
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
              <Navigation className="h-4 w-4" /> Яндекс.Карты
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
