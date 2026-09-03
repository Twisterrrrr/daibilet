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
import { CityHubSectionHeading } from '@/components/CityHubSectionHeading';
import { HubEventsAfficheRail } from '@/components/HubEventsAfficheRail.client';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { YandexMapEmbed } from '@/components/YandexMapEmbed';
import { VenueAdmissionBlock } from '@/components/VenueAdmissionBlock';
import { VenueBreadcrumbsNav } from '@/components/VenueBreadcrumbsNav.client';
import {
  isAddressEchoWayToFind,
  nonEmptyLogisticsText,
} from '@/components/VenueLogisticsBlock';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { resolveCityTimeZone } from '@/lib/city-timezone';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { dedupeVenueLinkedEvents } from '@/lib/day-route-score';
import { formatMoney } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import { build2gisRouteUrl } from '@/lib/maps';
import { resolveNearestMetroStationName } from '@/lib/nearest-metro';
import {
  applyVenueEditorialOverlay,
  formatVenueMetroLabel,
  resolveVenueEditorialContent,
  resolveVenueFaqItems,
  resolveVenueGalleryImages,
  venueFeatureChips,
} from '@/lib/venue-editorial-content';
import {
  OPEN_DATE_HOURS_HOLIDAY_NOTE,
  resolveVenueOpenNowStatus,
  resolveVenueOpeningHours,
} from '@/lib/venue-opening-hours';
import {
  filterSimilarInstitutionVenues,
  normalizeVenueKind,
  resolvePublicVenueType,
  venueTypeLabel,
} from '@/lib/venue-meta';
import { eventHref, venueHref } from '@/lib/routes';
import type {
  PublicSessionDto,
  PublicVenueDto,
  PublicVenueLinkedEventDto,
  PublicVenuePageDto,
} from '@daibilet/contracts/public';

const MUSEUM_ART_KINDS = new Set(['museum', 'art_space', 'museum_art_space']);

export function InstitutionVenueLayout({
  venue: venueProp,
  stats: _stats,
  sessions = [],
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
  const venue = React.useMemo(() => applyVenueEditorialOverlay(venueProp), [venueProp]);
  const title = venue.seoH1 || venue.title || venue.name;
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });
  const hasMap = Boolean(venue.latitude && venue.longitude);
  const isTheatre = normalizeVenueKind(venue.type) === 'theater';
  const publicType = resolvePublicVenueType(venue.type, venue.name);
  const isMuseumOrArt = MUSEUM_ART_KINDS.has(publicType);
  const typeLabel = venueTypeLabel(venue.type, venue.name);
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
  const resolvedMetroName = React.useMemo(
    () =>
      resolveNearestMetroStationName({
        latitude: venue.latitude,
        longitude: venue.longitude,
        city: venue.city,
        citySlug: venue.citySlug,
        metroStation:
          nonEmptyLogisticsText(venue.metroStation) || editorial?.metroStation || null,
      }),
    [venue.latitude, venue.longitude, venue.city, venue.citySlug, venue.metroStation, editorial?.metroStation],
  );
  const metroLabel = React.useMemo(
    () => formatVenueMetroLabel(resolvedMetroName),
    [resolvedMetroName],
  );
  const faqItems = React.useMemo(() => resolveVenueFaqItems(venue.slug), [venue.slug]);
  const featureChips = React.useMemo(
    () => venueFeatureChips(editorial?.features),
    [editorial?.features],
  );
  const uniqueStopEvents = React.useMemo(() => dedupeVenueLinkedEvents(stopEvents), [stopEvents]);
  const uniqueNearbyEvents = React.useMemo(
    () => dedupeVenueLinkedEvents(nearbyEvents),
    [nearbyEvents],
  );
  const stopExcursionCount =
    uniqueStopEvents.length > 0 ? uniqueStopEvents.length : Number(venue.stopEventCount ?? 0);
  const hasStopExcursions = stopExcursionCount > 0;
  const linkedExcursions = hasStopExcursions ? uniqueStopEvents : uniqueNearbyEvents;
  const hasInternalLcTickets = admissionProducts.length > 0;
  const hasAfisha = sessions.length > 0;
  /** Same rail density as city hub «Ближайшие события» (poster cards). */
  const nextSessions = sessions.slice(0, 24);
  const showFaq = true;
  const showVisitSection = Boolean(openingHours?.lines?.length);
  const similarVenues = React.useMemo(
    () => filterSimilarInstitutionVenues(venue, relatedVenues, 4),
    [venue, relatedVenues],
  );
  const showSimilar = linkedExcursions.length > 0 || similarVenues.length > 0;
  const hookFactText = String(venue.hookFact || editorial?.hookFact || '').trim();
  const heroImage = resolveVenueHeroImage(venue.slug, venue.heroImageUrl) || venue.heroImageUrl;
  const galleryImages = React.useMemo(
    () =>
      resolveVenueGalleryImages({
        slug: venue.slug,
        heroImageUrl: heroImage,
      }),
    [venue.slug, heroImage],
  );
  const phone = nonEmptyLogisticsText(editorial?.phone);
  const website = nonEmptyLogisticsText(editorial?.website);
  const websiteLabel = editorial?.websiteLabel || 'Официальный сайт';
  const heroAddressLine = [streetAddress || venue.city, metroLabel].filter(Boolean).join(' • ');
  const wayTipRaw = nonEmptyLogisticsText(venue.wayToFind);
  const wayTip =
    wayTipRaw && !isAddressEchoWayToFind(wayTipRaw, venue.address, venue.city) ? wayTipRaw : null;
  /** Only real admission CTA - no «Выбрать событие» scroll bait in hero/sidebar. */
  const admissionCta = hasInternalLcTickets
    ? ({ href: '#venue-admission', label: 'К билетам' } as const)
    : null;
  const heroBadges = React.useMemo(() => {
    const badges: string[] = [];
    if (typeLabel) badges.push(typeLabel);
    for (const chip of featureChips.slice(0, 3)) badges.push(chip.label);
    for (const [name] of categories.slice(0, 2)) {
      if (!badges.includes(name)) badges.push(name);
    }
    return badges.slice(0, 5);
  }, [typeLabel, featureChips, categories]);

  const cityTz = React.useMemo(
    () => resolveCityTimeZone(venue.city, venue.citySlug),
    [venue.city, venue.citySlug],
  );
  const [openNowStatus, setOpenNowStatus] = React.useState<'open' | 'closed' | 'unknown'>('unknown');
  React.useEffect(() => {
    if (!isMuseumOrArt || !openingHours?.lines?.length) {
      setOpenNowStatus('unknown');
      return;
    }
    setOpenNowStatus(
      resolveVenueOpenNowStatus({
        lines: openingHours.lines,
        timeZone: cityTz,
      }),
    );
  }, [isMuseumOrArt, openingHours?.lines, cityTz]);

  const heroGradient = isTheatre
    ? 'bg-gradient-to-t from-rose-950/90 via-slate-900/55 to-slate-900/20'
    : 'bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-slate-900/25';

  const stickyTabs = React.useMemo(() => {
    const tabs: Array<readonly [string, string]> = [['#about', 'О месте']];
    if (hasInternalLcTickets) tabs.push(['#venue-admission', 'Билеты']);
    if (hasAfisha) tabs.push(['#venue-program', 'Афиша']);
    if (showVisitSection) tabs.push(['#visit', 'Как посетить']);
    if (showFaq) tabs.push(['#faq', 'Вопросы']);
    tabs.push(['#reviews', 'Отзывы']);
    if (showSimilar) tabs.push(['#similar', 'Похожие']);
    return tabs;
  }, [hasInternalLcTickets, hasAfisha, showVisitSection, showFaq, showSimilar]);

  const share = () => {
    if (navigator.share) {
      void navigator.share({ title: venue.name, url: window.location.href });
    } else {
      void navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="bg-white pb-24 lg:pb-0" data-venue-pdp-editorial>
      <div className="border-b border-zinc-200/80 bg-white">
        <VenueBreadcrumbsNav payload={pagePayload} />
      </div>

      <section className="relative isolate grid w-full overflow-hidden bg-slate-900 text-white aspect-square md:aspect-auto md:min-h-80 lg:min-h-[30rem]">
        <div className="absolute inset-0">
          {heroImage ? (
            <SafeImage
              src={heroImage}
              alt=""
              fill
              priority
              sizes={IMAGE_SIZES.eventHero}
              className="object-cover object-[center_20%] opacity-85"
            />
          ) : (
            <div className={`h-full w-full ${isTheatre ? 'bg-gradient-to-br from-rose-800 to-slate-950' : 'bg-gradient-to-br from-indigo-800 to-slate-950'}`} />
          )}
          <div className={`absolute inset-0 ${heroGradient}`} />
        </div>

        <div className="container-page absolute inset-0 z-10 flex flex-col justify-end pb-5 pt-20 md:pb-14 md:pt-24">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {openNowStatus === 'open' ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    data-venue-open-now
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                    Открыто сейчас
                  </span>
                ) : null}
                {heroBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <h1 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">{title}</h1>

              {/* Mobile: short city meta; full address moves below the photo */}
              {venue.city ? (
                <p className="mt-2 text-sm font-medium text-white/90 md:hidden">{venue.city}</p>
              ) : null}

              {heroAddressLine ? (
                <div className="mt-4 hidden items-start gap-1.5 text-sm text-white/90 md:inline-flex">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{heroAddressLine}</span>
                </div>
              ) : null}

              <p className="mt-4 hidden max-w-xl text-base leading-relaxed text-white/90 md:block">{intro}</p>
            </div>

            {/* Sticky footer covers mobile CTA */}
            <div className="hidden flex-col items-start gap-2 md:flex md:items-end">
              {admissionCta ? (
                <a
                  href={admissionCta.href}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold shadow-lg transition hover:opacity-95 ${
                    isTheatre ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                  {admissionCta.label}
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
                  imageUrl: heroImage,
                  address: venue.address,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                }}
              />
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium hover:bg-slate-950/85"
              >
                <Share2 className="h-3.5 w-3.5" />
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </section>

      {(heroAddressLine || intro) ? (
        <div className="border-b border-slate-200 bg-white md:hidden">
          <div className="container-page space-y-2 py-4 text-sm text-slate-700">
            {heroAddressLine ? (
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>{heroAddressLine}</span>
              </p>
            ) : null}
            {intro ? <p className="leading-relaxed text-slate-600">{intro}</p> : null}
          </div>
        </div>
      ) : null}

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

          {galleryImages.length >= 2 ? (
            <section
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              data-venue-gallery
              aria-label="Фотогалерея"
            >
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {galleryImages.map((src) => (
                  <div
                    key={src}
                    className="relative h-36 w-56 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-44 sm:w-72"
                  >
                    <SafeImage
                      src={src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 14rem, 18rem"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section id="about" className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">О месте</h2>
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

          {nextSessions.length > 0 ? (
            <section className="space-y-5" data-venue-upcoming-events>
              <CityHubSectionHeading
                title="Ближайшие события"
                description="Афиша площадки на ближайшие дни"
                editorial
                actions={
                  <a
                    href="#venue-program"
                    className="shrink-0 text-sm font-semibold text-primary-700 hover:underline"
                  >
                    Вся афиша →
                  </a>
                }
              />
              <HubEventsAfficheRail sessions={nextSessions} ariaLabel="Ближайшие события площадки" />
            </section>
          ) : null}

          {children}

          {showVisitSection ? (
            <section id="visit" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Как посетить</h2>
              <div className="mt-4" data-venue-opening-hours>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock className="h-4 w-4 text-primary-600" />
                  Часы работы
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {openingHours?.lines?.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-slate-500">{OPEN_DATE_HOURS_HOLIDAY_NOTE}</p>
              </div>
            </section>
          ) : null}

          {showFaq ? (
            <section id="faq" className="scroll-mt-24">
              <h2 className="font-display text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Вопросы</h2>
              <div className="mt-4 space-y-2">
                {faqItems.map((item) => (
                  <details key={item.question} className="group rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                      <span className="flex items-center gap-2 font-medium text-zinc-900">
                        <HelpCircle className="h-4 w-4 text-primary-600" />
                        {item.question}
                      </span>
                      <ChevronDown className="h-4 w-4 text-zinc-400 transition group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-zinc-700">{item.answer}</div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <section id="reviews" className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Отзывы</h2>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
              <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
              <p className="text-sm leading-6 text-zinc-600">
                Отзывы о площадке скоро появятся здесь. Пока можно опираться на описание, часы работы и карту рядом.
              </p>
            </div>
          </section>
        </div>

        <aside className="scroll-mt-24 lg:sticky lg:top-[calc(var(--site-header-height)+3.5rem)] lg:self-start">
          <div className="space-y-4">
            <div id="contacts" className="scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="space-y-3 p-5">
                <div className="text-sm font-semibold text-zinc-950">Где находится</div>
                <ul className="space-y-3 text-sm text-zinc-700">
                  {streetAddress || venue.city ? (
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
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
                  {wayTip ? (
                    <li className="flex items-start gap-2" data-venue-way-tip>
                      <NavigationIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      <span className="leading-relaxed text-zinc-600">{wayTip}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              {hasMap ? (
                <>
                  <YandexMapEmbed
                    lat={venue.latitude!}
                    lng={venue.longitude!}
                    title={`Карта: ${venue.name}`}
                    className="h-44 w-full border-t border-zinc-100"
                  />
                  <div className="flex flex-wrap gap-2 border-t border-zinc-100 p-3">
                    <a
                      href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=17&l=map`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                    >
                      <NavigationIcon className="h-3.5 w-3.5" />
                      Яндекс.Карты
                    </a>
                    <a
                      href={build2gisRouteUrl(venue.latitude!, venue.longitude!)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <Car className="h-3.5 w-3.5" />
                      Маршрут в 2ГИС
                    </a>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-950">Режим и контакты</div>
              {openingHours?.lines?.length ? (
                <div className="mt-3" data-venue-opening-hours-sidebar>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <Clock className="h-3.5 w-3.5 text-primary-600" />
                    Часы работы
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                    {openingHours.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{OPEN_DATE_HOURS_HOLIDAY_NOTE}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">
                  Режим работы уточняйте на официальном сайте площадки, особенно в праздники.
                </p>
              )}
              {(phone || website) ? (
                <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
                  {phone ? (
                    <li>
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary-700">
                        {phone}
                      </a>
                    </li>
                  ) : null}
                  {website ? (
                    <li>
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
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {showSimilar ? (
        <div className="border-t border-zinc-200 bg-white">
          <div className="container-page space-y-8 py-10 sm:py-12" id="similar">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
              Похожие
            </h2>
            {linkedExcursions.length > 0 ? (
              <div data-venue-linked-events-deduped>
                <h3 className="text-sm font-semibold text-zinc-800">Также можно посетить</h3>
                {!hasStopExcursions ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    События в радиусе 300 м. Это не афиша площадки!
                  </p>
                ) : null}
                <ul className="mt-4 space-y-3">
                  {linkedExcursions.map((event) => (
                    <li key={event.id}>
                      <a
                        href={`/events/${encodeURIComponent(event.slug)}`}
                        className="flex flex-col gap-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 transition hover:border-primary/30 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0">
                          <span className="font-semibold text-zinc-900 hover:text-primary-700">
                            {event.title}
                          </span>
                          {!hasStopExcursions && event.venue ? (
                            <span className="mt-0.5 block text-xs text-zinc-500">{event.venue}</span>
                          ) : null}
                        </span>
                        <span className="text-sm font-medium text-zinc-600">
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
                <h3 className="text-sm font-semibold text-zinc-800">Похожие площадки</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {similarVenues.map((related) => (
                    <InstitutionCard key={related.id} venue={related} href={venueHref(related)} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <MobileStickyActionBar>
        {admissionCta ? (
          <a
            href={admissionCta.href}
            className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg ${
              isTheatre ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Ticket className="h-4 w-4" />
            {admissionCta.label}
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
              imageUrl: heroImage,
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
