'use client';

import * as React from 'react';
import {
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  HelpCircle,
  MapPin,
  MessageSquareQuote,
  Navigation as NavigationIcon,
  Share2,
  Ticket,
} from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { OsmMapEmbed } from '@/components/OsmMapEmbed';
import { VenueAdmissionBlock } from '@/components/VenueAdmissionBlock';
import { VenueBreadcrumbsNav } from '@/components/VenueBreadcrumbsNav.client';
import { VenueLogisticsBlock, hasVenueLogisticsContent, nonEmptyLogisticsText } from '@/components/VenueLogisticsBlock';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatMoney } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import { build2gisRouteUrl } from '@/lib/maps';
import {
  applyVenueEditorialOverlay,
  formatVenueMetroLabel,
  resolveVenueEditorialContent,
} from '@/lib/venue-editorial-content';
import {
  OPEN_DATE_HOURS_HOLIDAY_NOTE,
  resolveVenueOpeningHours,
} from '@/lib/venue-opening-hours';
import {
  filterSimilarInstitutionVenues,
  normalizeVenueKind,
  venueTypeLabel,
} from '@/lib/venue-meta';
import { venueHref } from '@/lib/routes';
import { dedupeVenueLinkedEvents } from '@/lib/day-route-score';
import type {
  PublicSessionDto,
  PublicVenueDto,
  PublicVenueLinkedEventDto,
  PublicVenuePageDto,
} from '@daibilet/contracts/public';

const GENERIC_FAQ_ITEMS = [
  {
    question: 'Есть ли билеты с открытой датой?',
    answer: 'У многих музеев и выставок бывают билеты без фиксированного сеанса. Это будет указано в карточке события.',
  },
  {
    question: 'Где проходит оплата?',
    answer:
      'Покупка - в виджете билетной системы или на сайте организатора. Дайбилет помогает выбрать событие и хранит статус заказа.',
  },
  {
    question: 'Актуальны ли часы работы?',
    answer: 'Мы показываем афишу событий; режим работы учреждения лучше проверить на его официальном сайте.',
  },
];

export function InstitutionVenueLayout({
  venue: venueProp,
  stats: _stats,
  sessions: _sessions,
  relatedVenues,
  stopEvents = [],
  nearbyEvents = [],
  pagePayload,
  admissionProducts = [],
  children,
}: {
  venue: PublicVenueDto;
  stats: PublicVenuePageDto['stats'];
  sessions: PublicSessionDto[];
  relatedVenues: PublicVenueDto[];
  stopEvents?: PublicVenueLinkedEventDto[];
  nearbyEvents?: PublicVenueLinkedEventDto[];
  pagePayload: PublicVenuePageDto;
  admissionProducts?: FinanceAdmissionProduct[];
  children?: React.ReactNode;
}) {
  void _stats;
  void _sessions;
  const venue = React.useMemo(() => applyVenueEditorialOverlay(venueProp), [venueProp]);
  const title = venue.seoH1 || venue.title || venue.name;
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });
  const hasMap = Boolean(venue.latitude && venue.longitude);
  const isTheatre = normalizeVenueKind(venue.type) === 'theater';
  const typeLabel = venueTypeLabel(venue.type);
  const intro =
    venue.shortDescription ||
    venue.description ||
    `${venue.name} - ${typeLabel.toLowerCase()} в ${venue.city}. Афиша, билеты и ближайшие сеансы.`;
  const categories = Object.entries(venue.categories || {}).sort((a, b) => b[1] - a[1]);
  const editorial = React.useMemo(
    () => resolveVenueEditorialContent(venue.slug),
    [venue.slug],
  );
  const openingHours = React.useMemo(
    () => resolveVenueOpeningHours(venue.slug),
    [venue.slug],
  );
  const metroLabel = React.useMemo(
    () =>
      formatVenueMetroLabel(
        nonEmptyLogisticsText(venue.metroStation) || editorial?.metroStation || null,
      ),
    [venue.metroStation, editorial?.metroStation],
  );
  const logisticsVenue = React.useMemo(
    () =>
      metroLabel && !nonEmptyLogisticsText(venue.metroStation)
        ? { ...venue, metroStation: editorial?.metroStation || venue.metroStation }
        : venue,
    [venue, metroLabel, editorial?.metroStation],
  );
  const faqItems = editorial?.faq?.length ? editorial.faq : GENERIC_FAQ_ITEMS;
  const uniqueStopEvents = React.useMemo(() => dedupeVenueLinkedEvents(stopEvents), [stopEvents]);
  const uniqueNearbyEvents = React.useMemo(
    () => dedupeVenueLinkedEvents(nearbyEvents),
    [nearbyEvents],
  );
  const stopExcursionCount =
    uniqueStopEvents.length > 0 ? uniqueStopEvents.length : Number(venue.stopEventCount ?? 0);
  const hasStopExcursions = stopExcursionCount > 0;
  const linkedExcursions = hasStopExcursions ? uniqueStopEvents : uniqueNearbyEvents;
  /** Internal LC / own ticket inventory only - not external official-site CTA. */
  const hasInternalLcTickets = admissionProducts.length > 0;
  const showFaq = true;
  const showVisitSection =
    Boolean(openingHours?.lines?.length) || hasVenueLogisticsContent(logisticsVenue);
  const similarVenues = React.useMemo(
    () => filterSimilarInstitutionVenues(venue, relatedVenues, 4),
    [venue, relatedVenues],
  );
  const showSimilar =
    linkedExcursions.length > 0 || similarVenues.length > 0;
  const hookFactText = String(venue.hookFact || editorial?.hookFact || '').trim();
  const phone = nonEmptyLogisticsText(editorial?.phone);
  const website = nonEmptyLogisticsText(editorial?.website);
  const websiteLabel = editorial?.websiteLabel || 'Официальный сайт';
  const heroAddressLine = [streetAddress || venue.city, metroLabel].filter(Boolean).join(' • ');

  const heroGradient = isTheatre
    ? 'bg-gradient-to-r from-rose-900/95 via-slate-900/80 to-slate-900/50'
    : 'bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/30';

  const stickyTabs = React.useMemo(() => {
    const tabs: Array<readonly [string, string]> = [['#about', 'О месте']];
    if (hasInternalLcTickets) tabs.push(['#venue-admission', 'Билеты']);
    if (showVisitSection) tabs.push(['#visit', 'Как посетить']);
    if (showFaq) tabs.push(['#faq', 'Вопросы']);
    tabs.push(['#reviews', 'Отзывы']);
    if (showSimilar) tabs.push(['#similar', 'Похожие']);
    return tabs;
  }, [hasInternalLcTickets, showVisitSection, showFaq, showSimilar]);

  const share = () => {
    if (navigator.share) {
      void navigator.share({ title: venue.name, url: window.location.href });
    } else {
      void navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="bg-slate-50 pb-24 lg:pb-0">
      <div className="border-b border-slate-200 bg-white">
        <VenueBreadcrumbsNav payload={pagePayload} />
      </div>

      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0">
          {venue.heroImageUrl ? (
            <SafeImage
              src={venue.heroImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.eventHero}
              className="object-cover opacity-40"
            />
          ) : (
            <div className={`h-full w-full ${isTheatre ? 'bg-gradient-to-br from-rose-800 to-slate-950' : 'bg-gradient-to-br from-indigo-800 to-slate-950'}`} />
          )}
          <div className={`absolute inset-0 ${heroGradient}`} />
        </div>

        <div className="container-page relative py-10 md:py-14">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">{title}</h1>

              {heroAddressLine ? (
                <div className="mt-4 inline-flex items-start gap-1.5 text-sm text-white/90">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{heroAddressLine}</span>
                </div>
              ) : null}

              <p className="mt-4 max-w-xl text-white/90">{intro}</p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              {hasInternalLcTickets ? (
                <a
                  href="#venue-admission"
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold shadow-lg transition hover:opacity-95 ${
                    isTheatre ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                  К билетам
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
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/20"
              >
                <Share2 className="h-3.5 w-3.5" />
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stickyTabs.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 px-4 py-3 text-sm font-medium text-slate-700 hover:text-primary-600"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {hookFactText ? (
            <div
              className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-5 py-4 ring-1 ring-amber-200/70 sm:px-6 sm:py-5"
              data-venue-hook-fact
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Факт</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{hookFactText}</p>
            </div>
          ) : null}

          <section id="about" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">О месте</h2>
            {editorial?.highlights?.length ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-venue-highlights>
                {editorial.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-800">{item}</span>
                  </li>
                ))}
              </ul>
            ) : categories.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {categories.slice(0, 6).map(([name]) => (
                  <div key={name} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-800">{name}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {venue.description && venue.description !== intro ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">{venue.description}</p>
            ) : null}
          </section>

          {hasInternalLcTickets ? <VenueAdmissionBlock products={admissionProducts} /> : null}

          {children}

          {showVisitSection ? (
            <section id="visit" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Как посетить</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {openingHours?.lines?.length ? (
                  <div data-venue-opening-hours>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Clock className="h-4 w-4 text-primary-600" />
                      Часы работы
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-slate-700">
                      {openingHours.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{OPEN_DATE_HOURS_HOLIDAY_NOTE}</p>
                  </div>
                ) : null}
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-primary-600" />
                    Как добраться
                  </div>
                  {hasVenueLogisticsContent(logisticsVenue) ? (
                    <VenueLogisticsBlock venue={logisticsVenue} showName={false} className="mt-3" />
                  ) : (
                    <div className="mt-3 text-sm text-slate-700">
                      {streetAddress || `${venue.city} - адрес уточняется`}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {showFaq ? (
            <section id="faq" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-slate-900">Вопросы</h2>
              <div className="mt-4 space-y-2">
                {faqItems.map((item) => (
                  <details key={item.question} className="group rounded-xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        <HelpCircle className="h-4 w-4 text-primary-600" />
                        {item.question}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-slate-700">{item.answer}</div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <section id="reviews" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Отзывы</h2>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <p className="text-sm leading-6 text-slate-600">
                Отзывы о площадке скоро появятся здесь. Пока можно опираться на описание, часы работы и маршруты рядом.
              </p>
            </div>
          </section>

          {showSimilar ? (
            <section id="similar" className="scroll-mt-24 space-y-8">
              <h2 className="text-xl font-bold text-slate-900">Похожие</h2>
              {linkedExcursions.length > 0 ? (
                <div data-venue-linked-events-deduped>
                  <h3 className="text-sm font-semibold text-slate-800">Экскурсии рядом</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasStopExcursions
                      ? 'Маршруты, где это место - остановка. Не заменяют входной билет в музей.'
                      : 'Явных остановок пока нет - показываем события со стартом в радиусе 300 м.'}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {linkedExcursions.map((event) => (
                      <li key={event.id}>
                        <a
                          href={`/events/${encodeURIComponent(event.slug)}`}
                          className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-primary/30 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="min-w-0">
                            <span className="font-semibold text-slate-900 hover:text-primary-700">
                              {event.title}
                            </span>
                            {!hasStopExcursions && event.venue ? (
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
                </div>
              ) : null}
              {similarVenues.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Похожие площадки</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {similarVenues.map((related) => (
                      <InstitutionCard key={related.id} venue={related} href={venueHref(related)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="scroll-mt-24 lg:sticky lg:top-32 lg:self-start">
          <div className="space-y-4">
            <div id="contacts" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
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
                {phone ? (
                  <li className="flex items-start gap-2">
                    <span className="shrink-0" aria-hidden="true">
                      ☎
                    </span>
                    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary-700">
                      {phone}
                    </a>
                  </li>
                ) : null}
                {website ? (
                  <li className="flex items-start gap-2">
                    <span className="shrink-0" aria-hidden="true">
                      🌐
                    </span>
                    <a
                      href={website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
                    >
                      {websiteLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>

            {openingHours?.lines?.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5" data-venue-opening-hours-sidebar>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock className="h-4 w-4 text-primary-600" />
                  Часы работы
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {openingHours.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-slate-500">{OPEN_DATE_HOURS_HOLIDAY_NOTE}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm text-slate-700">
                Режим работы учреждения и правила посещения уточняйте на официальном сайте площадки, особенно в праздники.
              </div>
            )}

            {hasMap ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <OsmMapEmbed
                  lat={venue.latitude!}
                  lng={venue.longitude!}
                  title={`Карта: ${venue.name}`}
                  className="relative h-48 w-full"
                />
                <div className="flex flex-wrap gap-2 p-3">
                  <a
                    href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=17&l=map`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                  >
                    <NavigationIcon className="h-3.5 w-3.5" />
                    Яндекс.Карты
                  </a>
                  <a
                    href={build2gisRouteUrl(venue.latitude!, venue.longitude!)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Car className="h-3.5 w-3.5" />
                    Маршрут в 2ГИС
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <MobileStickyActionBar>
        {hasInternalLcTickets ? (
          <a
            href="#venue-admission"
            className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg ${
              isTheatre ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Ticket className="h-4 w-4" />
            К билетам
          </a>
        ) : (
          <AddToDayRouteButton
            className="min-h-11 w-full rounded-full px-4 text-sm"
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
        )}
      </MobileStickyActionBar>
    </div>
  );
}
