import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Landmark,
  MapPin,
  Ship,
  UtensilsCrossed,
} from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { EventCard } from '@/components/EventCard';
import { HomeEventRail, HomeNowSection } from '@/components/HomeNowSection.client';
import { HomeHero } from '@/components/HomeHero.client';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { mergeBlogCards } from '@/lib/blog-utils';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';
import '@/lib/env';
import { getHomeCoverFingerprints, getHomePageData } from '@/server/cached-home-data';
import { formatMoney, formatNumber, pluralCities, pluralEvents } from '@/lib/format';
import { buildHomePageSections } from '@/lib/home-page-sections';
import { HOME_FORMAT_TILES, HOME_HOW_IT_WORKS, HOME_TRUST_ITEMS, resolveHomePromoImage } from '@/lib/home-scenarios';
import { balancedTileGridClass } from '@/lib/balanced-tile-grid';
import { landingCategoryHref } from '@/lib/landing-routes';
import { venueHref } from '@/lib/routes';
import { venuePageTemplate } from '@/lib/venue-meta';
import { getActiveHeroBanners, heroFramesFromBanners } from '@/server/hero-banners';

function promoBlockIcon(slug: string, index: number) {
  const key = String(slug || '').toLowerCase();
  const cls = 'mb-3 h-7 w-7 text-white/90 drop-shadow';
  if (key.includes('bridge')) return <Landmark className={cls} />;
  if (key.includes('dinner') || key.includes('ужин')) return <UtensilsCrossed className={cls} />;
  if (key.includes('party') || key.includes('disco')) return <CalendarDays className={cls} />;
  if (key.includes('bus')) return <MapPin className={cls} />;
  if (key.includes('concert')) return <CalendarDays className={cls} />;
  if (index % 3 === 0) return <Ship className={cls} />;
  if (index % 3 === 1) return <CalendarDays className={cls} />;
  return <UtensilsCrossed className={cls} />;
}

export async function HomePageContent() {
  // Hero banners: unstable_cache 300s (matches page revalidate). Do not call
  // connection() here - it forces dynamic no-store and kills CDN/ISR HIT on `/`.
  const [{ destinationsPayload, catalogPayload, landingsCatalog, venuesPayload }, fingerprintsRecord] =
    await Promise.all([getHomePageData(), getHomeCoverFingerprints()]);

  const destinations = destinationsPayload?.destinations ?? [];
  const cities = destinations.filter((item) => item.type === 'city');
  const topCities = [...cities].sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')).slice(0, 8);
  // Same definition as footer / PublicStatsDto.destinations: cities + regions with events.
  const liveCities = destinations.filter((item) => (item.events || 0) > 0).length;
  const liveEvents = catalogPayload?.total ?? catalogPayload?.items?.length ?? 0;
  const liveVenues = venuesPayload?.total ?? venuesPayload?.venues?.length ?? 0;

  const sessions = catalogPayload?.items ?? [];
  const fingerprints = new Map(Object.entries(fingerprintsRecord));
  const { editorsPick, homeNowTabs, popular } = await buildHomePageSections(sessions, { fingerprints });
  const sparseCatalog = sessions.length < 12;

  const homeVenues = (venuesPayload?.venues ?? [])
    .filter((venue) => venuePageTemplate(venue.type) === 'institution' && venue.events >= 3 && venue.address)
    .sort((a, b) => b.events - a.events)
    .slice(0, 8);

  const promoLandings = (landingsCatalog?.items || []).filter((item) => item.events > 0).slice(0, 6);
  let blogCards = mergeBlogCards(null);
  try {
    const articlesPayload = await buildPublicArticlesListDto();
    blogCards = mergeBlogCards(articlesPayload?.articles);
  } catch {
    // fallback to static posts
  }
  const orderedBlog = blogCards.some((card) => card.publishedAt)
    ? blogCards
    : [...blogCards].reverse();
  const blogPosts = orderedBlog.slice(0, 4);
  const [featuredBlog, ...restBlog] = blogPosts;
  const heroBanners = await getActiveHeroBanners();
  const heroFrames = heroFramesFromBanners(heroBanners);

  return (
    <>
      <HomeHero destinations={destinations} frames={heroFrames} />

      <HomeEventRail
        id="editors-pick"
        title="Выбор редакции"
        subtitle="Закреплённые в подборках и сильные предложения с ближайшими датами"
        href="/events?sort=popular"
        events={editorsPick}
        editorsPickBadge
      />

      {topCities.length ? (
        <section id="destinations" className="section-y border-b border-slate-100">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Популярные города</h2>
                <p className="mt-1 text-sm text-slate-500">Выберите город — покажем афишу и подборки</p>
              </div>
              <Link href="/cities" className="shrink-0 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Все города →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {topCities.map((city) => (
                <li key={city.slug || city.name}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {homeNowTabs.length ? <HomeNowSection tabs={homeNowTabs} /> : null}

      {popular.length ? (
        <section className="section-y">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярное сейчас'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {sparseCatalog ? 'Сильные предложения из текущего каталога' : 'Конкретные события с ближайшими датами'}
                </p>
              </div>
              <Link href="/events?sort=popular" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Открыть каталог <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {popular.map((session) => (
                <li key={session.id}>
                  <EventCard session={session} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="formats" className="section-y">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Выберите формат отдыха</h2>
              <p className="mt-1 text-sm text-slate-500">Сценарии под настроение, компанию и сезон</p>
            </div>
            <Link href="/podborki" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
              Все подборки <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* lg+: все 4 превью в ряд без скролла; ScrollRail только до lg */}
          <ScrollRail
            className="mt-6 lg:hidden"
            viewportClassName="flex flex-nowrap gap-3 snap-x snap-mandatory"
            aria-label="Форматы отдыха"
          >
            {HOME_FORMAT_TILES.map((tile) => (
              <Link
                key={tile.title}
                href={tile.href}
                className="horizontal-snap-card group relative min-h-[148px] overflow-hidden rounded-card bg-slate-800 text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <SafeImage
                  src={tile.imageUrl}
                  alt=""
                  fill
                  sizes="70vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  fallback={<div className={`absolute inset-0 bg-gradient-to-br ${tile.fallbackGradient}`} />}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
                <div className="relative z-[1] flex h-full min-h-[148px] flex-col justify-end p-5">
                  <h3 className="text-lg font-bold text-white">{tile.title}</h3>
                  <p className="mt-1 text-sm text-white/90">{tile.subtitle}</p>
                  <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-white/80 transition group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
              </Link>
            ))}
          </ScrollRail>
          <ul className={`mt-6 hidden gap-3 lg:grid ${balancedTileGridClass(HOME_FORMAT_TILES.length, { lg: 4 })}`}>
            {HOME_FORMAT_TILES.map((tile) => (
              <li key={tile.title}>
                <Link
                  href={tile.href}
                  className="group relative flex min-h-[148px] overflow-hidden rounded-card bg-slate-800 text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <SafeImage
                    src={tile.imageUrl}
                    alt=""
                    fill
                    sizes="25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    fallback={<div className={`absolute inset-0 bg-gradient-to-br ${tile.fallbackGradient}`} />}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
                  <div className="relative z-[1] flex h-full min-h-[148px] w-full flex-col justify-end p-5">
                    <h3 className="text-lg font-bold text-white">{tile.title}</h3>
                    <p className="mt-1 text-sm text-white/90">{tile.subtitle}</p>
                    <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-white/80 transition group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {homeVenues.length ? (
        <section id="venues" className="section-y border-t border-slate-100">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Популярные места и площадки</h2>
                <p className="mt-1 text-sm text-slate-500">Музеи, театры, концертные залы и культурные пространства</p>
              </div>
              <Link href="/venues" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Все площадки <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${balancedTileGridClass(homeVenues.length, { lg: 4 })}`}>
              {homeVenues.map((venue) => (
                <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {promoLandings.length ? (
        <section id="landings" className="section-y">
          <div className="container-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Тематические подборки</h2>
                <p className="mt-1 text-sm text-slate-500">Готовые списки под настроение и повод - от прогулок до концертов</p>
              </div>
              <Link href="/podborki" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
                Все подборки <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Мобилка: горизонтальный скролл; lg+: сетка 3 колонки (до 6 карточек = 2 ряда) */}
            <ScrollRail
              className="mt-6 lg:hidden"
              viewportClassName="flex flex-nowrap gap-3 snap-x snap-mandatory"
              aria-label="Тематические подборки"
            >
              {promoLandings.map((landing, index) => {
                const imageUrl = resolveHomePromoImage(landing.slug, landing.title);
                return (
                  <Link
                    key={landing.slug}
                    href={landingCategoryHref(landing.slug)}
                    className="horizontal-snap-card group relative min-h-[168px] overflow-hidden rounded-card bg-slate-800 text-left text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:min-h-[180px]"
                  >
                    <SafeImage
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="75vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-950" />}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                    <div className="relative z-[1] flex h-full min-h-[168px] flex-col justify-end p-5 sm:min-h-[180px] sm:p-6">
                      {promoBlockIcon(landing.slug, index)}
                      <h3 className="text-lg font-bold text-white">{landing.title}</h3>
                      <p className="mt-1 text-sm text-white/90">{landing.subtitle}</p>
                      <div className="mt-4 text-sm font-semibold text-white">
                        {pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </ScrollRail>
            <ul className={`mt-6 hidden gap-3 lg:grid ${balancedTileGridClass(promoLandings.length, { lg: 3 })}`}>
              {promoLandings.map((landing, index) => {
                const imageUrl = resolveHomePromoImage(landing.slug, landing.title);
                return (
                  <li key={landing.slug}>
                    <Link
                      href={landingCategoryHref(landing.slug)}
                      className="group relative flex min-h-[168px] overflow-hidden rounded-card bg-slate-800 text-left text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:min-h-[180px]"
                    >
                      <SafeImage
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-950" />}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                      <div className="relative z-[1] flex h-full min-h-[168px] w-full flex-col justify-end p-5 sm:min-h-[180px] sm:p-6">
                        {promoBlockIcon(landing.slug, index)}
                        <h3 className="text-lg font-bold text-white">{landing.title}</h3>
                        <p className="mt-1 text-sm text-white/90">{landing.subtitle}</p>
                        <div className="mt-4 text-sm font-semibold text-white">
                          {pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {featuredBlog ? (
        <section id="blog" className="section-y bg-surface-muted">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Идеи для поездок и отдыха</h2>
                <p className="mt-1 text-sm text-slate-500">Статьи и советы перед выбором события</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Все материалы <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Link
                href={`/blog/${featuredBlog.slug}`}
                className="group relative min-h-[240px] overflow-hidden rounded-card bg-slate-900 text-white shadow-card sm:min-h-[280px]"
              >
                <SafeImage
                  src={featuredBlog.coverImageUrl}
                  alt=""
                  fill
                  sizes={IMAGE_SIZES.blogFeatured}
                  className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                <div className="relative flex h-full flex-col justify-end p-6">
                  <span className="inline-flex w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {featuredBlog.tag}
                  </span>
                  <h3 className="mt-3 text-2xl font-bold text-white">{featuredBlog.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-white/85">{featuredBlog.excerpt}</p>
                </div>
              </Link>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {restBlog.slice(0, 3).map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group flex gap-4 rounded-card bg-white p-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      <SafeImage
                        src={post.coverImageUrl}
                        alt=""
                        fill
                        sizes={IMAGE_SIZES.blogThumb}
                        className="object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{post.tag}</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-700">{post.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-y bg-surface-muted/60">
        <div className="container-page">
          <div className="grid gap-6 rounded-card bg-white p-6 shadow-card sm:grid-cols-3 sm:p-8">
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-graphite sm:text-4xl">
                {formatNumber(liveCities)}
              </p>
              <p className="mt-1 text-sm text-graphite-muted">{pluralCities(liveCities)} с афишей</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-graphite sm:text-4xl">
                {formatNumber(liveEvents)}
              </p>
              <p className="mt-1 text-sm text-graphite-muted">{pluralEvents(liveEvents)} онлайн</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-graphite sm:text-4xl">
                {formatNumber(Math.max(liveVenues, homeVenues.length))}
              </p>
              <p className="mt-1 text-sm text-graphite-muted">площадок в каталоге</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y mt-20 bg-slate-50">
        <div className="container-page">
          <h2 className="font-display text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Как купить билет
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-graphite-muted">
            Три шага от выбора до входа - билет сразу на телефон.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {HOME_HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="rounded-card bg-white p-5 shadow-card">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 font-semibold text-graphite">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-graphite-muted">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page">
          <h2 className="font-display text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Почему выбирают Дайбилет</h2>
          <div
            className={`mt-8 grid gap-4 sm:grid-cols-2 ${balancedTileGridClass(HOME_TRUST_ITEMS.length, { lg: 4 })}`}
          >
            {HOME_TRUST_ITEMS.map(({ title, text }) => (
              <div key={title} className="rounded-card bg-white p-5 shadow-card">
                <CheckCircle2 className="h-6 w-6 text-primary-600" />
                <h3 className="mt-3 font-semibold text-graphite">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-graphite-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B2B-блок: data-nosnippet чтобы не попадал в SERP вместо meta description */}
      <section id="partner" className="section-y bg-gradient-to-r from-primary-600 to-sky-500" data-nosnippet>
        <div className="container-page">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Проводите экскурсии или мероприятия?</h2>
              <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
                Добавьте свои события на Дайбилет и получайте продажи через каталог, подборки и городские страницы.
              </p>
            </div>
            <Link
              href="/offer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-slate-50"
            >
              Стать партнёром
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
