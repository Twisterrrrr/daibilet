import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Headphones,
  Info,
  Landmark,
  MapPin,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

import { CityRegionalEvents } from '@/components/CityRegionalEvents.client';
import { CityWeatherWidget } from '@/components/CityWeatherWidget.client';
import {
  BLOG_LISTING_IMAGE_QUALITY,
  BlogCardSafeImage,
  IMAGE_SIZES,
  SafeImage,
} from '@/components/SafeImage.client';
import { fontUnbounded } from '@/lib/fonts';
import { resolveCityHeroRegionBadge } from '@/lib/city-hero-region';
import { resolveCityImage } from '@/lib/city-images';
import { resolveCityPlaceHref, type CityInfoEntry } from '@/lib/cityInfo';
import { isLabelCardVenueStub, resolveVenueHeroImage } from '@/lib/city-place-images';
import { classifyMustSeePlace, mustSeeFilterStopTypeTag } from '@/lib/must-see-filters';
import { resolveDestinationRegionLinkForSuburb } from '@/lib/city-destination-registry';
import { cityIdentitySlides, resolveCityLocalFlavor } from '@/lib/city-hub-local-flavor';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { formatPriceFrom, pluralEvents, pluralPoints, pluralVenues } from '@/lib/format';
import { landingCategoryHref } from '@/lib/landing-routes';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicCityPageDto } from '@daibilet/contracts/public';

/** Превью хаба города в новом дизайне (подмножество блоков, без афиши/табов). */
export function CityHubPreview({
  payload,
  guide,
  articles = [],
}: {
  payload: PublicCityPageDto;
  guide: CityInfoEntry;
  articles?: BlogCardDto[];
}) {
  const city = payload.city;
  const stats = payload.stats;
  const sessions = payload.sessions ?? [];
  const venues = payload.venues ?? [];
  const landings = payload.landings ?? [];
  const nearby = payload.regionNearby ?? null;
  const heroImage = resolveCityImage({ slug: city.slug, sourceSlug: city.sourceSlug, name: city.name });
  const places = guide.mustSee ?? [];
  const routes = guide.dayRoutePresets ?? [];
  const faq = guide.faq ?? [];
  const suburbs = guide.significantSuburbs ?? [];
  const regionBadge = resolveCityHeroRegionBadge(city);
  const identitySlides = cityIdentitySlides(city.slug);
  const flavor = resolveCityLocalFlavor(city.slug);

  return (
    <>
      <section className="relative flex min-h-[440px] items-end overflow-hidden text-white">
        <div className="absolute inset-0">
          {heroImage ? (
            <>
              <SafeImage src={heroImage} alt="" fill sizes="100vw" priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/35 via-ink/40 to-ink/90" />
            </>
          ) : (
            <div className="h-full w-full bg-ink" />
          )}
        </div>
        <div className="container-page relative z-10 w-full py-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{regionBadge || 'Город'}</p>
          <h1 className={`${fontUnbounded.className} mt-2 text-4xl font-bold leading-none sm:text-5xl md:text-6xl`}>
            {city.name}
          </h1>
          {guide.brief ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{guide.brief}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
              {pluralEvents(stats.events)}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
              {pluralVenues(stats.venues)}
            </span>
            {places.length ? (
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
                {pluralPoints(places.length)} в гиде
              </span>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#places"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink shadow transition-transform hover:scale-[1.03]"
            >
              Что посмотреть
            </a>
            {routes.length ? (
              <a
                href="#routes"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/20"
              >
                Маршруты
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sticky top-[var(--site-header-height)] z-40 border-b border-line bg-white">
        <div className="container-page flex gap-1 overflow-x-auto py-3">
          {[
            { href: '#places', label: 'Что посмотреть' },
            { href: '#routes', label: 'Маршруты' },
            { href: '#events', label: 'События' },
            { href: '#collections', label: 'Подборки' },
            { href: '#locations', label: 'Площадки' },
            { href: '#suburbs', label: 'Пригороды' },
            { href: '#faq', label: 'FAQ' },
          ].map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-ink-muted transition hover:bg-surface-alt hover:text-ink"
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      <div className="container-page py-12 sm:py-16">
        <div className={guide.hookFact ? 'grid gap-4 md:grid-cols-[2fr_3fr]' : ''}>
          {guide.hookFact ? (
            <section className="flex flex-col justify-center rounded-2xl border border-[#e8dab8] bg-[#faf6ee] px-6 py-5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a88740]">
                <Info className="h-4 w-4" aria-hidden />
                Интересный факт
              </div>
              <p className="mt-2 text-[15px] leading-6 text-ink-2">{guide.hookFact}</p>
            </section>
          ) : null}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <CityWeatherWidget citySlug={city.slug || city.sourceSlug || ''} />
          </div>
        </div>

        {identitySlides.length ? (
          <section id="identity" className="scroll-mt-28 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                {flavor?.identityHeading || `Чем уникален ${city.name}`}
              </h2>
              {flavor?.identityLead?.trim() ? (
                <p className="mt-2 max-w-2xl text-sm text-ink-muted">{flavor.identityLead}</p>
              ) : null}
            </div>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
              {identitySlides.map((slide) => {
                const raw = String(slide.imageSrc || '').trim();
                const image = raw && !isLabelCardVenueStub(raw) ? raw : '';
                return (
                  <div key={slide.id} className="w-72 shrink-0 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                    <div className="relative aspect-[16/10] overflow-hidden bg-surface-alt">
                      {image ? (
                        <SafeImage src={image} alt={slide.imageAlt || ''} fill sizes="18rem" className="object-cover" />
                      ) : (
                        <div className="h-full w-full bg-surface-alt" />
                      )}
                      {slide.badge ? (
                        <span className="absolute left-3 top-3 inline-flex rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">
                          {slide.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-bold leading-snug text-ink">{slide.title}</h3>
                      {slide.text ? <p className="mt-2 text-sm leading-6 text-ink-muted">{slide.text}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {places.length ? (
          <section id="places" className="scroll-mt-24 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Что посмотреть в {city.name}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Главные места, музеи и гастро-точки города</p>
            </div>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-1">
              {places.map((place, index) => {
                const href = resolveCityPlaceHref(place);
                const image = resolveVenueHeroImage(place.venueSlug || place.locationSlug || null, place.imageUrl);
                const typeLabel = mustSeeFilterStopTypeTag(classifyMustSeePlace(place));
                const inner = (
                  <>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-alt">
                      {image ? (
                        <SafeImage
                          src={image}
                          alt=""
                          fill
                          sizes="18rem"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-surface-alt text-accent/40">
                          <MapPin className="h-8 w-8" aria-hidden />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 grid size-7 place-items-center rounded-full bg-white text-sm font-bold text-ink shadow-sm">
                        {index + 1}
                      </span>
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-white backdrop-blur">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#eaf0f7] text-[#1e3a5f]">
                          <Landmark className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <h3 className="text-base font-bold leading-snug tracking-tight text-ink">{place.name}</h3>
                      </div>
                      {place.desc ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{place.desc}</p>
                      ) : null}
                      <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                        {place.visitMinutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                            <Clock className="h-3 w-3 opacity-70" aria-hidden />
                            {place.visitMinutes}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-full border border-line bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                  </>
                );
                const cardClass =
                  'flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover';
                return href ? (
                  <Link key={place.name} href={href} className={`${cardClass} group`}>
                    {inner}
                    <span className="flex items-center gap-1.5 px-4 pb-3 text-sm font-semibold text-accent">
                      Подробнее <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                ) : (
                  <div key={place.name} className={cardClass}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {routes.length ? (
          <section id="routes" className="scroll-mt-24 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Готовые маршруты
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Проверенные сценарии прогулок по городу</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {routes.map((route) => (
                <div key={route.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card">
                  <h3 className="text-lg font-bold leading-snug tracking-tight text-ink">{route.title}</h3>
                  {route.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{route.description}</p>
                  ) : null}
                  <span className="mt-auto pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-accent">
                    {route.stops.length} остановок
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sessions.length ? (
          <section id="events" className="scroll-mt-28 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Ближайшие события
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Концерты, спектакли и экскурсии на ближайшие дни</p>
            </div>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
              {sessions.slice(0, 8).map((session) => {
                const href = session.eventPageSlug
                  ? `/events/${session.eventPageSlug}`
                  : session.slug
                    ? `/events/${session.slug}`
                    : null;
                const content = (
                  <>
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-alt">
                      {session.imageUrl ? (
                        <SafeImage src={session.imageUrl} alt="" fill sizes="12rem" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-muted-2">
                          <CalendarDays className="h-8 w-8" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3.5">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">{session.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-ink-muted">
                        <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        {session.dateLabel}
                        {session.timeLabel ? ` · ${session.timeLabel}` : ''}
                      </div>
                      {session.priceFrom ? (
                        <div className="mt-auto pt-2 text-base font-extrabold text-ink">
                          {formatPriceFrom(session.priceFrom)}
                        </div>
                      ) : null}
                    </div>
                  </>
                );
                const cardClass =
                  'flex w-44 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover';
                return href ? (
                  <Link key={session.id} href={href} className={`${cardClass} group`}>
                    {content}
                  </Link>
                ) : (
                  <div key={session.id} className={cardClass}>
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {landings.length ? (
          <section id="collections" className="scroll-mt-28 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Подборки
              </h2>
            </div>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
              {landings.slice(0, 6).map((landing) => {
                const image = resolveLandingCardImage(landing.slug, city.slug);
                return (
                  <Link
                    key={landing.slug}
                    href={landingCategoryHref(landing.slug, city.slug)}
                    className="group relative aspect-[16/10] w-80 shrink-0 overflow-hidden rounded-2xl bg-surface-alt"
                  >
                    {image ? (
                      <SafeImage
                        src={image}
                        alt=""
                        fill
                        sizes="20rem"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <span className="absolute inset-0 bg-gradient-to-b from-transparent to-ink/90" />
                    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 text-white">
                      <span className="w-fit rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-ink">
                        {city.name}
                      </span>
                      <span className={`${fontUnbounded.className} text-lg font-bold leading-tight`}>{landing.title}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {venues.length ? (
          <section id="locations" className="scroll-mt-28 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Площадки и локации
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Театры, музеи, бары и клубы города</p>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
              {venues.slice(0, 7).map((venue) => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.slug || ''}`}
                  className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 transition last:border-b-0 hover:bg-surface-alt"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{venue.name}</div>
                    {venue.address ? <div className="truncate text-sm text-ink-muted">{venue.address}</div> : null}
                  </div>
                  <span className="shrink-0 text-sm text-ink-muted">{pluralEvents(venue.events || 0)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {suburbs.length ? (
          <section id="suburbs" className="scroll-mt-28 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Значимые пригороды
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Куда съездить из {city.name} на день или выходные</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suburbs.map((suburb) => {
                const image = resolveVenueHeroImage(
                  suburb.locationSlug || suburb.venueSlug || suburb.dayRouteId || null,
                  suburb.imageUrl,
                );
                const regionLink = resolveDestinationRegionLinkForSuburb(city.slug, suburb.name);
                const href = regionLink?.href || resolveCityPlaceHref(suburb);
                const body = (
                  <>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-alt">
                      {image ? (
                        <SafeImage src={image} alt="" fill sizes="16rem" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-surface-alt text-accent/40">
                          <MapPin className="h-8 w-8" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h3 className="text-base font-bold leading-snug text-ink">{suburb.name}</h3>
                      {suburb.desc ? (
                        <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{suburb.desc}</p>
                      ) : null}
                      {href ? (
                        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-accent">
                          Перейти <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      ) : suburb.places?.length ? (
                        <span className="mt-auto pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-accent">
                          {suburb.places.length} мест
                        </span>
                      ) : null}
                    </div>
                  </>
                );
                const cardClass =
                  'flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover';
                return href ? (
                  <Link key={suburb.name} href={href} className={`${cardClass} group`}>
                    {body}
                  </Link>
                ) : (
                  <div key={suburb.name} className={cardClass}>
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {nearby?.events?.length ? (
          <section id="nearby" className="scroll-mt-28 pt-12">
            <div>
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Рядом с городом: события края
              </h2>
            </div>
            {(() => {
              const event = nearby.events[0];
              return (
                <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-snug text-ink">{event.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {event.dateLabel}
                      {event.city ? ` · ${event.city}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {event.priceFrom ? (
                      <span className="font-display text-xl font-bold text-ink">{formatPriceFrom(event.priceFrom)}</span>
                    ) : null}
                    <a
                      href={event.url}
                      className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                    >
                      Купить билет
                    </a>
                  </div>
                </div>
              );
            })()}
          </section>
        ) : null}

        <section className="scroll-mt-28 pt-12">
          <CityRegionalEvents citySlug={city.slug} />
        </section>

        {faq.length ? (
          <section id="faq" className="scroll-mt-24 pt-12">
            <div className="max-w-3xl">
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Частые вопросы
              </h2>
              <div className="mt-6">
                {faq.map((item) => (
                  <details key={item.q} className="group border-b border-line first:border-t">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-ink transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span className="text-xl font-normal text-ink-muted transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="pb-4 text-sm leading-6 text-ink-muted">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {articles.length ? (
          <section id="blog" className="scroll-mt-28 pt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
                Из блога о {city.name}
              </h2>
              <Link href="/blog" className="shrink-0 text-sm font-semibold text-accent hover:text-accent-dark">
                Все записи →
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {articles.slice(0, 4).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col gap-3">
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-surface-alt">
                    <BlogCardSafeImage
                      slug={post.slug}
                      coverImageUrl={post.coverImageUrl}
                      alt=""
                      fill
                      sizes={IMAGE_SIZES.blogCard}
                      quality={BLOG_LISTING_IMAGE_QUALITY}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div>
                    {post.tag ? (
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">{post.tag}</span>
                    ) : null}
                    <h3 className="mt-1 text-base font-bold leading-snug text-ink transition-colors group-hover:text-accent">
                      {post.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16 border-t border-line">
          <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { strong: `${stats.events} событий`, span: 'в афише города', key: 'events', icon: <CalendarDays className="h-5 w-5" aria-hidden /> },
              { strong: 'Без скрытых сборов', span: 'Цена, которую видите', key: 'fees', icon: <ShieldCheck className="h-5 w-5" aria-hidden /> },
              { strong: 'Возврат билетов', span: 'По правилам площадок', key: 'refund', icon: <RotateCcw className="h-5 w-5" aria-hidden /> },
              { strong: 'Поддержка 24/7', span: 'В чате и на почте', key: 'support', icon: <Headphones className="h-5 w-5" aria-hidden /> },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-alt text-ink-2">
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">{item.strong}</span>
                  <span className="block text-sm text-ink-muted">{item.span}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}