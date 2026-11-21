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

import { listCityRegionalEvents } from '@/lib/city-regional-events';
import { CityWeatherWidget } from '@/components/CityWeatherWidget.client';
import {
  BLOG_LISTING_IMAGE_QUALITY,
  BlogCardSafeImage,
  IMAGE_SIZES,
  SafeImage,
} from '@/components/SafeImage.client';
import { fontUnbounded } from '@/lib/fonts';
import { resolveCityImage } from '@/lib/city-images';
import { resolveCityPlaceHref, type CityInfoEntry } from '@/lib/cityInfo';
import { isLabelCardVenueStub, resolveVenueHeroImage } from '@/lib/city-place-images';
import { classifyMustSeePlace, mustSeeFilterStopTypeTag } from '@/lib/must-see-filters';
import { resolveDestinationRegionLinkForSuburb } from '@/lib/city-destination-registry';
import {
  CITY_SEASON_TABS,
  cityIdentitySlides,
  resolveCityLocalFlavor,
  resolveWhenToGoBlurb,
  whenToGoBestTime,
} from '@/lib/city-hub-local-flavor';
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
  const whenToGoBlurb = resolveWhenToGoBlurb(city.slug);
  const identitySlides = cityIdentitySlides(city.slug);
  const flavor = resolveCityLocalFlavor(city.slug);
  const bestTimeToGo = whenToGoBestTime(flavor?.whenToGo);

  return (
    <div className={`cityhub-v2 ${fontUnbounded.variable}`}>
      <section className="hero">
        <div className="absolute inset-0 z-0">
          {heroImage ? (
            <>
              <SafeImage src={heroImage} alt="" fill sizes="100vw" priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/40 to-ink/90" />
            </>
          ) : (
            <div className="h-full w-full bg-ink" />
          )}
        </div>
        <div className="container-page relative z-10 w-full">
          <nav className="breadcrumbs">
            <Link href="/">Главная</Link> / <Link href="/cities">Города</Link> / <span>{city.name}</span>
          </nav>
          <div className="hero__content">
            <h1>{city.name}</h1>
            {guide.brief ? <p className="hero__subtitle">{guide.brief}</p> : null}
            <div className="hero__stats">
              <span className="hero__stat"><strong>{stats.events}</strong> {pluralEvents(stats.events)}</span>
              <span className="hero__stat"><strong>{stats.venues}</strong> {pluralVenues(stats.venues)}</span>
              {places.length ? (
                <span className="hero__stat"><strong>{places.length}</strong> {pluralPoints(places.length)} в гиде</span>
              ) : null}
            </div>
            <div className="hero__actions">
              <a href="#places" className="btn btn--primary btn--lg">Что посмотреть</a>
              {routes.length ? <a href="#routes" className="btn btn--outline btn--lg">Маршруты</a> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="tabs-wrap">
        <div className="container-page">
          <div className="tabs">
            {[
              { href: '#places', label: 'Знаковые места', count: places.length },
              { href: '#events', label: 'События', count: sessions.length },
              { href: '#routes', label: 'Маршруты', count: routes.length },
              { href: '#suburbs', label: 'Пригороды', count: suburbs.length },
              { href: '#collections', label: 'Подборки', count: landings.length },
              { href: '#locations', label: 'Локации', count: venues.length },
              { href: '#faq', label: 'FAQ', count: faq.length },
            ].map((tab, idx) => (
              <a key={tab.href} href={tab.href} className={`tab ${idx === 0 ? 'is-active' : ''}`}>
                {tab.label}
                {tab.count ? <span className="tab__count">{tab.count}</span> : null}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-12 sm:py-16">
        {guide.hookFact || flavor?.weather || whenToGoBlurb ? (
          <div className="widgets-row">
            {guide.hookFact ? (
              <div className="w-card w-card--fact">
                <div className="w-card__label">
                  <Info className="h-4 w-4" aria-hidden />
                  Интересный факт
                </div>
                <div className="w-card__text">{guide.hookFact}</div>
              </div>
            ) : null}
            <CityWeatherWidget citySlug={city.slug || city.sourceSlug || ''} hideSeasons />
            {whenToGoBlurb ? (
              <div className="w-card">
                <div className="w-card__label">Когда ехать</div>
                <div className="w-season">
                  <div className="w-season__chips">
                    {CITY_SEASON_TABS.map((t) => (
                      <span key={t.id} className={`w-season__chip ${t.id === whenToGoBlurb.tab ? 'is-active' : ''}`}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                  <div className="w-season__hint">
                    {bestTimeToGo ? `Лучшее время - ${bestTimeToGo}` : whenToGoBlurb.body}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {identitySlides.length ? (
          <section id="identity" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>{flavor?.identityHeading || `Чем уникален ${city.name}`}</h2>
                {flavor?.identityLead?.trim() ? <p>{flavor.identityLead}</p> : null}
              </div>
            </div>
            <div className="scroller">
              {identitySlides.map((slide) => {
                const raw = String(slide.imageSrc || '').trim();
                const image = raw && !isLabelCardVenueStub(raw) ? raw : '';
                return (
                  <a key={slide.id} href="#places" className="unique-card">
                    <div className="unique-card__img relative">
                      {image ? (
                        <SafeImage src={image} alt={slide.imageAlt || ''} fill sizes="18rem" className="object-cover" />
                      ) : (
                        <div className="h-full w-full bg-surface-alt" />
                      )}
                    </div>
                    <div className="unique-card__body">
                      <div className="unique-card__title">{slide.title}</div>
                      {slide.text ? <div className="unique-card__desc">{slide.text}</div> : null}
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {places.length ? (
          <section id="places" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Что посмотреть в {city.name}</h2>
                <p>Главные места, музеи и гастро-точки города</p>
              </div>
            </div>
            <div className="scroller">
              {places.map((place, index) => {
                const href = resolveCityPlaceHref(place);
                const image = resolveVenueHeroImage(place.venueSlug || place.locationSlug || null, place.imageUrl);
                const typeLabel = mustSeeFilterStopTypeTag(classifyMustSeePlace(place));
                const inner = (
                  <>
                    <div className="place-card__img relative">
                      {image ? (
                        <SafeImage src={image} alt="" fill sizes="18rem" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-alt text-accent/40">
                          <MapPin className="h-8 w-8" aria-hidden />
                        </div>
                      )}
                      <span className="place-card__num">{index + 1}</span>
                      <span className="place-card__badge">{typeLabel}</span>
                    </div>
                    <div className="place-card__body">
                      <div className="place-card__title">
                        <span className="place-card__title-icon">
                          <Landmark className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        {place.name}
                      </div>
                      {place.desc ? <div className="place-card__desc">{place.desc}</div> : null}
                      <div className="place-card__tags">
                        {place.visitMinutes ? (
                          <span className="place-card__tag">
                            <Clock className="h-3 w-3" aria-hidden />
                            {place.visitMinutes}
                          </span>
                        ) : null}
                        <span className="place-card__tag">{typeLabel}</span>
                      </div>
                    </div>
                  </>
                );
                return href ? (
                  <Link key={place.name} href={href} className="place-card">
                    {inner}
                  </Link>
                ) : (
                  <div key={place.name} className="place-card">
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {routes.length ? (
          <section id="routes" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Готовые сценарии</h2>
                <p>Собрали для вас лучшие идеи на 1 день и на выходные</p>
              </div>
            </div>
            <div className="scroller">
              {routes.map((route) => {
                const firstStop = route.stops[0];
                const routeImage =
                  route.coverImageUrl ||
                  (firstStop
                    ? resolveVenueHeroImage(
                        firstStop.venueSlug || firstStop.locationSlug || null,
                        firstStop.imageUrl,
                      )
                    : null);
                return (
                  <div key={route.id} className="scenario-card">
                    {routeImage ? (
                      <SafeImage src={routeImage} alt="" fill sizes="300px" className="scenario-card__img" />
                    ) : null}
                    <div className="scenario-card__body">
                      <div className="scenario-card__title">{route.title}</div>
                      <div className="scenario-card__meta">{route.stops.length} мест</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {sessions.length ? (
          <section id="events" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Ближайшие события</h2>
                <p>Концерты, спектакли и экскурсии на ближайшие дни</p>
              </div>
            </div>
            <div className="carousel-wrap">
              <div className="events-carousel">
                {sessions.slice(0, 8).map((session) => {
                  const href = session.eventPageSlug
                    ? `/events/${session.eventPageSlug}`
                    : session.slug
                      ? `/events/${session.slug}`
                      : null;
                  const content = (
                    <>
                      <div className="event-card__img relative">
                        {session.imageUrl ? (
                          <SafeImage src={session.imageUrl} alt="" fill sizes="14rem" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink-muted-2">
                            <CalendarDays className="h-8 w-8" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="event-card__body">
                        <div className="event-card__title">{session.title}</div>
                        <div className="event-card__date">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {session.dateLabel}
                          {session.timeLabel ? ` · ${session.timeLabel}` : ''}
                        </div>
                        {session.priceFrom ? (
                          <div className="event-card__price">{formatPriceFrom(session.priceFrom)}</div>
                        ) : null}
                      </div>
                    </>
                  );
                  return href ? (
                    <Link key={session.id} href={href} className="event-card">
                      {content}
                    </Link>
                  ) : (
                    <div key={session.id} className="event-card">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {landings.length ? (
          <section id="collections" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Подборки</h2>
              </div>
              <a href="/cities" className="link-more">Все подборки →</a>
            </div>
            <div className="collections-carousel">
              {landings.slice(0, 6).map((landing) => {
                const image = resolveLandingCardImage(landing.slug, city.slug);
                return (
                  <Link
                    key={landing.slug}
                    href={landingCategoryHref(landing.slug, city.slug)}
                    className="collection-card relative"
                  >
                    {image ? (
                      <SafeImage src={image} alt="" fill sizes="20rem" className="object-cover" />
                    ) : null}
                    <div className="collection-card__body">
                      <span className="collection-card__location">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {city.name}
                      </span>
                      <div className="collection-card__title">{landing.title}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {venues.length ? (
          <section id="locations" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Площадки и локации</h2>
                <p>Куда сходить в {city.name}: театры, музеи, бары, клубы</p>
              </div>
              <a href="/locations" className="link-more">Все площадки →</a>
            </div>
            <div className="loc-table">
              {venues.slice(0, 7).map((venue) => (
                <Link key={venue.id} href={`/venues/${venue.slug || ''}`} className="loc-row">
                  <div className="loc-row__type">Площадка</div>
                  <div className="loc-row__info">
                    <div><strong>{venue.name}</strong>{venue.address ? `, ${venue.address}` : ''}</div>
                    <div>{pluralEvents(venue.events || 0)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {suburbs.length ? (
          <section id="suburbs" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Значимые пригороды</h2>
                <p>Куда съездить из {city.name} на день или выходные</p>
              </div>
            </div>
            <div>
              {(() => {
                const [featuredSuburb, ...restSuburbs] = suburbs;
                const featuredImage = resolveVenueHeroImage(
                  featuredSuburb.locationSlug || featuredSuburb.venueSlug || featuredSuburb.dayRouteId || null,
                  featuredSuburb.imageUrl,
                );
                const featuredLink = resolveDestinationRegionLinkForSuburb(city.slug, featuredSuburb.name);
                const featuredHref = featuredLink?.href || resolveCityPlaceHref(featuredSuburb);
                return (
                  <>
                    <div className="suburb-feature">
                      <div className="suburb-feature__media">
                        {featuredImage ? (
                          <SafeImage src={featuredImage} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-surface-alt text-accent/40">
                            <MapPin className="h-10 w-10" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="suburb-feature__body">
                        <span className="suburb-feature__tag">Пригород</span>
                        <h3 className="suburb-feature__title">{featuredSuburb.name}</h3>
                        {featuredSuburb.desc ? (
                          <p className="suburb-feature__desc">{featuredSuburb.desc}</p>
                        ) : null}
                        <div className="suburb-feature__meta">
                          {featuredSuburb.travelVector ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" aria-hidden />
                              {featuredSuburb.travelVector}
                            </span>
                          ) : null}
                          {featuredSuburb.visitMinutes ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              {featuredSuburb.visitMinutes}
                            </span>
                          ) : null}
                        </div>
                        {featuredHref ? (
                          <div className="suburb-feature__cta">
                            <Link href={featuredHref} className="btn btn--primary">
                              Подробнее
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {restSuburbs.length ? (
                      <>
                        <div className="suburbs-grid">
                          {restSuburbs.map((suburb) => {
                            const image = resolveVenueHeroImage(
                              suburb.locationSlug || suburb.venueSlug || suburb.dayRouteId || null,
                              suburb.imageUrl,
                            );
                            const regionLink = resolveDestinationRegionLinkForSuburb(city.slug, suburb.name);
                            const href = regionLink?.href || resolveCityPlaceHref(suburb);
                            const body = (
                              <>
                                <div className="suburb-card__img relative">
                                  {image ? (
                                    <SafeImage src={image} alt="" fill sizes="16rem" className="object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-surface-alt text-accent/40">
                                      <MapPin className="h-8 w-8" aria-hidden />
                                    </div>
                                  )}
                                </div>
                                <div className="suburb-card__body">
                                  <div className="suburb-card__title">{suburb.name}</div>
                                  {suburb.desc ? (
                                    <div className="suburb-card__desc">{suburb.desc}</div>
                                  ) : null}
                                  <div className="suburb-card__meta">
                                    {[suburb.travelVector, suburb.visitMinutes].filter(Boolean).join(' · ')}
                                  </div>
                                </div>
                              </>
                            );
                            return href ? (
                              <Link key={suburb.name} href={href} className="suburb-card">
                                {body}
                              </Link>
                            ) : (
                              <div key={suburb.name} className="suburb-card">
                                {body}
                              </div>
                            );
                          })}
                        </div>
                        <div className="suburbs-more">
                          Все пригороды {city.name} — в разделе{' '}
                          <Link href={`/cities/${city.slug}`} className="font-semibold text-accent">
                            «Пригороды»
                          </Link>
                        </div>
                      </>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </section>
        ) : null}

        {nearby?.events?.length ? (
          <section id="nearby" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Рядом с городом: события края</h2>
                <p>Интересные события в пригородах {city.name}</p>
              </div>
            </div>
            {(() => {
              const event = nearby.events[0];
              return (
                <div className="nearby-card">
                  <div className="nearby-card__media relative">
                    <div className="flex h-full w-full items-center justify-center bg-surface-alt text-ink-muted-2">
                      <MapPin className="h-10 w-10" aria-hidden />
                    </div>
                  </div>
                  <div className="nearby-card__body">
                    <div className="nearby-card__title">{event.title}</div>
                    <div className="nearby-card__meta">
                      {event.dateLabel ? <span>{event.dateLabel}</span> : null}
                      <span>{event.city}</span>
                      {event.venue ? <span>{event.venue}</span> : null}
                    </div>
                    <div className="nearby-card__cta">
                      {event.priceFrom ? (
                        <div className="nearby-card__price">{formatPriceFrom(event.priceFrom)}</div>
                      ) : null}
                      <a href={event.url} className="btn btn--primary">Купить билет</a>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        ) : null}

        {listCityRegionalEvents(city.slug).length ? (
          <section id="festivals" className="scroll-mt-28 pt-12">
            <div className="section__head">
              <div>
                <h2>Фестивали и крупные события</h2>
                <p>Анонсы и прошедшие фестивали рядом с городом</p>
              </div>
              <a href="#festivals" className="link-more">Все фестивали →</a>
            </div>
            <div className="festival-list">
              {listCityRegionalEvents(city.slug).map((event) => (
                <a
                  key={event.id}
                  href={event.href || event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="festival-row"
                >
                  <div className="festival-row__title">{event.title}</div>
                  <div className="festival-row__dates">{event.datesLabel}</div>
                  <div className="festival-row__place">{event.place}</div>
                  <ArrowRight className="festival-row__arrow" aria-hidden />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {faq.length || articles.length ? (
          <section id="faq" className="scroll-mt-28 pt-12">
            <div className="faq-blog-grid">
              {faq.length ? (
                <div>
                  <div className="section__head">
                    <h2>Частые вопросы</h2>
                  </div>
                  <div>
                    {faq.map((item) => (
                      <details key={item.q} className="faq-item">
                        <summary className="faq-q">{item.q}</summary>
                        <p className="faq-a">{item.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}

              {articles.length ? (
                <div>
                  <div className="section__head">
                    <h2>Из блога о {city.name}</h2>
                    <Link href="/blog" className="text-[13px] font-semibold text-accent hover:text-accent-dark">
                      Все записи →
                    </Link>
                  </div>
                  <div className="blog-mini">
                    {articles.slice(0, 3).map((post) => (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-mini__item">
                        <div className="blog-mini__img relative">
                          <BlogCardSafeImage
                            slug={post.slug}
                            coverImageUrl={post.coverImageUrl}
                            alt=""
                            fill
                            sizes={IMAGE_SIZES.blogCard}
                            quality={BLOG_LISTING_IMAGE_QUALITY}
                            className="object-cover"
                          />
                        </div>
                        {post.tag ? <div className="blog-mini__tag">{post.tag}</div> : null}
                        <div className="blog-mini__title">{post.title}</div>
                        <div className="blog-mini__meta">{post.readMin} мин чтения</div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="trust">
          <div className="container-page trust__grid">
            {[
              { strong: `${stats.events} событий`, span: 'в афише города', key: 'events', icon: <CalendarDays className="h-5 w-5" aria-hidden /> },
              { strong: 'Без скрытых сборов', span: 'Цена, которую видите', key: 'fees', icon: <ShieldCheck className="h-5 w-5" aria-hidden /> },
              { strong: 'Возврат билетов', span: 'По правилам площадок', key: 'refund', icon: <RotateCcw className="h-5 w-5" aria-hidden /> },
              { strong: 'Поддержка 24/7', span: 'В чате и на почте', key: 'support', icon: <Headphones className="h-5 w-5" aria-hidden /> },
            ].map((item) => (
              <div key={item.key} className="trust__item">
                <div className="trust__icon">{item.icon}</div>
                <div>
                  <strong>{item.strong}</strong>
                  <span>{item.span}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}