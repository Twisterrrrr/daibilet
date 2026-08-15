import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Dices } from 'lucide-react';

import { HomeBottomNav } from '@/components/HomeBottomNav.client';
import { HomeCategoryStack } from '@/components/HomeCategoryStack.client';
import { HomeCityAwareSections } from '@/components/HomeCityAwareSections.client';
import { HomeHero } from '@/components/HomeHero.client';
import { HomeMyDayBanner } from '@/components/HomeMyDayBanner.client';
import { HomePageSkeleton } from '@/components/HomePageSkeleton';
import { HomePopularCitiesRail } from '@/components/HomePopularCitiesRail.client';
import { LuckyCityButton } from '@/components/LuckyCityButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { clipBlogFeaturedLead, hubBlogCardExcerpt, mergeBlogCards } from '@/lib/blog-utils';
import '@/lib/env';
import { catalogSocialStats } from '@/lib/catalog-social-stats';
import { formatMoney, formatNumber, pluralEvents } from '@/lib/format';
import { resolveHomePromoImage } from '@/lib/home-scenarios';
import { landingCategoryHref } from '@/lib/landing-routes';
import { orderPopularRailCities } from '@/lib/popular-cities-rail';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getHomeArticles, getHomeCoverFingerprints, getHomePageData } from '@/server/cached-home-data';
import { getActiveHeroBanners, heroFramesFromBanners } from '@/server/hero-banners';

/** External CDN HEAD fingerprints must not stall home TTFB on bad egress/DNS. */
const HOME_FINGERPRINTS_TIMEOUT_MS = 800;
const HOME_HERO_BANNERS_TIMEOUT_MS = 700;
const HOME_ARTICLES_TIMEOUT_MS = 1_200;
type BlogApiArticles = NonNullable<Parameters<typeof mergeBlogCards>[0]>;

async function HomePageBody() {
  const [{ destinationsPayload, catalogPayload, landingsCatalog }, fingerprintsRecord, articlesPayload] =
    await Promise.all([
      getHomePageData(),
      withSoftTimeout(
        getHomeCoverFingerprints(),
        HOME_FINGERPRINTS_TIMEOUT_MS,
        {},
        'home-cover-fingerprints',
      ),
      withSoftTimeout(
        getHomeArticles(),
        HOME_ARTICLES_TIMEOUT_MS,
        null,
        'home-articles',
      ),
    ]);

  const destinations = destinationsPayload?.destinations ?? [];
  const cities = destinations.filter((item) => item.type === 'city');
  // Top by events, then pin Moscow + SPB first so the rail can center that pair on load.
  const topCities = orderPopularRailCities(cities, 12);
  // Same canon as SiteFooter (not catalogPayload.total — that under/over-counts vs destinations).
  const { places: liveCities, events: liveEvents } = catalogSocialStats(destinations);

  const sessions = catalogPayload?.items ?? [];
  const sparseCatalog = sessions.length < 12;

  const promoLandings = (landingsCatalog?.items || []).filter((item) => item.events > 0).slice(0, 8);
  const blogCards = mergeBlogCards(
    (articlesPayload?.articles as BlogApiArticles | undefined) ?? null,
  );
  const orderedBlog = blogCards.some((card) => card.publishedAt)
    ? blogCards
    : [...blogCards].reverse();
  const blogPosts = orderedBlog.slice(0, 4);
  const [featuredBlog, ...restBlog] = blogPosts;
  const featuredLead = featuredBlog
    ? clipBlogFeaturedLead(featuredBlog.slug, featuredBlog.excerpt, 2, 520)
    : '';
  const heroBanners = await withSoftTimeout(
    getActiveHeroBanners(),
    HOME_HERO_BANNERS_TIMEOUT_MS,
    [],
    'home-hero-banners',
  );
  const heroFrames = heroFramesFromBanners(heroBanners);

  return (
    <div className="overflow-x-hidden bg-neutral-50 pb-24 lg:pb-0">
      {/* Classic search-hero: rotating emotion photos + city/date/category find form */}
      <HomeHero
        destinations={destinations}
        frames={heroFrames}
        landings={landingsCatalog?.items || []}
      />

      {/* Rhythm: mobile stories (hidden when editors-pick shows) → editors → cities → My Day */}
      <HomeCityAwareSections
        sessions={sessions}
        fingerprints={fingerprintsRecord}
        sparseCatalog={sparseCatalog}
      >
        {topCities.length ? (
          <section
            id="destinations"
            className="section-y pb-6 sm:pb-8"
            data-home-band="full-bleed"
          >
            <div className="container-page">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Популярные города
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Выберите город - покажем афишу и подборки</p>
                </div>
                <Link href="/cities" className="shrink-0 text-sm font-semibold text-primary-600 hover:text-primary-700">
                  Все города →
                </Link>
              </div>
            </div>
            {/* Finite city grid + «Показать ещё» (no infinite loop). */}
            <HomePopularCitiesRail cities={topCities} className="mt-6" />
          </section>
        ) : null}

        {/* My Day CTA - constructor card on soft map-band */}
        <HomeMyDayBanner />
      </HomeCityAwareSections>

      {/* Mobile formats: after event rails, away from My Day CTA */}
      <HomeCategoryStack />

      {/* 4. Lucky city - soft trips map-band (distinct motif from cities) */}
      {cities.some((c) => c.events > 0) ? (
        <section className="home-trips-map-band section-y" data-home-band="full-bleed">
          <div className="container-page">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary-100/80 bg-white/95 p-5 shadow-card backdrop-blur-[2px] sm:flex-row sm:items-center sm:py-6 sm:pl-6 sm:pr-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-sky-500 text-white shadow-sm">
                  <Dices className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Куда поехать?
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Случайный город с живой афишей - если не можете выбрать сами
                  </p>
                </div>
              </div>
              <LuckyCityButton cities={cities} variant="toolbar" />
            </div>
          </div>
        </section>
      ) : null}

      {/* 5. Podborki - boxed (do not stretch event/collection grids full monitor) */}
      {promoLandings.length ? (
        <section id="landings" className="section-y" data-home-band="boxed">
          <div className="container-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Подборки
                </h2>
                <p className="mt-1 text-sm text-slate-500">Готовые списки под настроение и повод</p>
              </div>
              <Link
                href="/podborki"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                Смотреть все <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ScrollRail className="mt-6" aria-label="Подборки">
              <div className="flex w-max flex-nowrap gap-3 snap-x snap-mandatory sm:gap-4">
                {promoLandings.map((landing) => {
                  const imageUrl = resolveHomePromoImage(landing.slug, landing.title);
                  return (
                    <div
                      key={landing.slug}
                      className="w-[min(72vw,260px)] shrink-0 snap-start sm:w-[280px] lg:w-[300px]"
                      data-rail-item
                    >
                      <Link
                        href={landingCategoryHref(landing.slug)}
                        className="group relative flex aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-neutral-800 text-left text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:aspect-[3/4]"
                      >
                        <SafeImage
                          src={imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 72vw, 300px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          fallback={
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-neutral-800" />
                          }
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="relative z-[1] mt-auto flex w-full flex-col justify-end p-4 sm:p-5">
                          <h3 className="font-display text-lg font-bold leading-snug text-white sm:text-xl">
                            {landing.title}
                          </h3>
                          {landing.subtitle ? (
                            <p className="mt-1.5 line-clamp-2 text-sm text-white/90">{landing.subtitle}</p>
                          ) : null}
                          <div className="mt-3 text-sm font-semibold text-white/95">
                            {pluralEvents(landing.events)}
                            {landing.priceFrom != null ? ` · ${formatMoney(landing.priceFrom)}` : ''}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </ScrollRail>
          </div>
        </section>
      ) : null}

      {/* 6. Blog - full-bleed magazine feature + boxed rest cards */}
      {featuredBlog ? (
        <section id="blog" className="section-y bg-white" data-home-band="full-bleed">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Блог и советы
                </h2>
                <p className="mt-1 text-sm text-slate-500">Журнал Дайбилет - маршруты и идеи</p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Все материалы <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-8 grid bg-[#F8F9FB] lg:grid-cols-2 lg:items-stretch">
            <div className="flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-12 lg:py-16 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pr-10">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">
                Материал недели
              </p>
              {featuredBlog.tag ? (
                <p className="mt-3 text-sm font-medium text-slate-500">{featuredBlog.tag}</p>
              ) : null}
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
                {featuredBlog.title}
              </h3>
              {featuredLead ? (
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                  {featuredLead}
                </p>
              ) : null}
              <Link
                href={`/blog/${featuredBlog.slug}`}
                className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Читать гайд
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <Link
              href={`/blog/${featuredBlog.slug}`}
              className="group relative aspect-[16/11] overflow-hidden bg-slate-200 sm:aspect-[16/10] lg:aspect-auto lg:min-h-[22rem]"
              aria-label={featuredBlog.title}
            >
              <SafeImage
                src={featuredBlog.coverImageUrl}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-[1.03]"
                fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />}
              />
            </Link>
          </div>

          {restBlog.length ? (
            <div className="container-page mt-8">
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
                {restBlog.slice(0, 3).map((post) => {
                  const excerpt = hubBlogCardExcerpt(post.slug, post.excerpt);
                  return (
                    <article
                      key={post.slug}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <Link href={`/blog/${post.slug}`} aria-label={post.title} className="group flex h-full flex-col">
                        <span className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100">
                          <SafeImage
                            src={post.coverImageUrl}
                            alt=""
                            fill
                            sizes={IMAGE_SIZES.blogCard}
                            className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
                            fallback={
                              <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm text-slate-500">
                                Материал
                              </div>
                            }
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
                          <h3 className="break-words text-sm font-semibold leading-snug text-slate-950 transition group-hover:text-primary-700 sm:text-base">
                            {post.title}
                          </h3>
                          {excerpt ? (
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{excerpt}</p>
                          ) : null}
                          {post.tag ? (
                            <span className="mt-auto pt-3 text-xs font-semibold uppercase tracking-wide text-primary-600">
                              {post.tag}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 7. Trust strip - live counts only, no fake reviews */}
      <section className="section-y" data-home-band="boxed">
        <div className="container-page">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <p className="text-sm font-medium text-slate-600 sm:max-w-xs">
              Живая афиша по России - события, города и маршруты в одном гиде
            </p>
            <dl className="flex flex-wrap gap-6 sm:gap-10">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Городов</dt>
                <dd className="font-display text-2xl font-bold text-primary-700">{formatNumber(liveCities)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Событий</dt>
                <dd className="font-display text-2xl font-bold text-primary-700">{formatNumber(liveEvents)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <HomeBottomNav />
    </div>
  );
}

export function HomePageContent() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageBody />
    </Suspense>
  );
}
