import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Dices } from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { HomeBottomNav } from '@/components/HomeBottomNav.client';
import { HomeGuideEvents } from '@/components/HomeGuideEvents.client';
import { HomeGuideHero } from '@/components/HomeGuideHero.client';
import { HomePageSkeleton } from '@/components/HomePageSkeleton';
import { HomeStoriesStrip } from '@/components/HomeStoriesStrip.client';
import { LuckyCityButton } from '@/components/LuckyCityButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { mergeBlogCards } from '@/lib/blog-utils';
import '@/lib/env';
import { formatMoney, formatNumber, pluralEvents } from '@/lib/format';
import { resolveHomePromoImage } from '@/lib/home-scenarios';
import { podborkiBentoCellClass, podborkiBentoSpan, PODBORKI_BENTO_GRID_CLASS } from '@/lib/podborki-bento';
import { landingCategoryHref } from '@/lib/landing-routes';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getHomeCoverFingerprints, getHomePageData } from '@/server/cached-home-data';
import { fetchPublicApiJson } from '@/server/public-api-client';

/** External CDN HEAD fingerprints must not stall home TTFB on bad egress/DNS. */
const HOME_FINGERPRINTS_TIMEOUT_MS = 800;
const HOME_ARTICLES_TIMEOUT_MS = 1_200;
type BlogApiArticles = NonNullable<Parameters<typeof mergeBlogCards>[0]>;

async function HomePageBody() {
  const [{ destinationsPayload, catalogPayload, landingsCatalog }, fingerprintsRecord] =
    await Promise.all([
      getHomePageData(),
      withSoftTimeout(
        getHomeCoverFingerprints(),
        HOME_FINGERPRINTS_TIMEOUT_MS,
        {},
        'home-cover-fingerprints',
      ),
    ]);

  const destinations = destinationsPayload?.destinations ?? [];
  const cities = destinations.filter((item) => item.type === 'city');
  const topCities = [...cities]
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'))
    .slice(0, 8);
  const liveCities = destinations.filter((item) => (item.events || 0) > 0).length;
  const liveEvents = catalogPayload?.total ?? catalogPayload?.items?.length ?? 0;

  const sessions = catalogPayload?.items ?? [];
  const sparseCatalog = sessions.length < 12;

  const promoLandings = (landingsCatalog?.items || []).filter((item) => item.events > 0).slice(0, 4);
  let blogCards = mergeBlogCards(null);
  try {
    const articlesPayload = await fetchPublicApiJson<{ articles?: BlogApiArticles }>('/api/public/articles', {
      timeoutMs: HOME_ARTICLES_TIMEOUT_MS,
    });
    blogCards = mergeBlogCards(articlesPayload?.articles);
  } catch {
    // fallback to static posts
  }
  const orderedBlog = blogCards.some((card) => card.publishedAt)
    ? blogCards
    : [...blogCards].reverse();
  const blogPosts = orderedBlog.slice(0, 4);
  const [featuredBlog, ...restBlog] = blogPosts;

  return (
    <div className="pb-24 lg:pb-0">
      <HomeStoriesStrip />

      <HomeGuideHero sessions={sessions} fingerprints={fingerprintsRecord} />

      {/* 2. Cities */}
      {topCities.length ? (
        <section id="destinations" className="section-y border-b border-slate-100">
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
            <ScrollRail
              className="mt-6 sm:hidden"
              viewportClassName="flex flex-nowrap gap-3 snap-x snap-mandatory"
              aria-label="Популярные города"
            >
              {topCities.map((city) => (
                <div key={city.slug || city.name} className="w-[min(42vw,160px)] shrink-0 snap-start" data-rail-item>
                  <CityCard city={city} />
                </div>
              ))}
            </ScrollRail>
            <ul className="mt-8 hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-6 sm:gap-4">
              {topCities.slice(0, 6).map((city) => (
                <li key={city.slug || city.name}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* 3. Top events */}
      <HomeGuideEvents
        sessions={sessions}
        fingerprints={fingerprintsRecord}
        sparseCatalog={sparseCatalog}
      />

      {/* 4. Lucky city randomizer */}
      {cities.some((c) => c.events > 0) ? (
        <section className="section-y bg-gradient-to-r from-primary-50/80 via-sky-50/60 to-white">
          <div className="container-page">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary-100/80 bg-white/80 p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
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

      {/* 5. Podborki bento */}
      {promoLandings.length ? (
        <section id="landings" className="section-y">
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
            <ul className={`mt-6 ${PODBORKI_BENTO_GRID_CLASS}`}>
              {promoLandings.map((landing) => {
                const span = podborkiBentoSpan(landing);
                const imageUrl = resolveHomePromoImage(landing.slug, landing.title);
                return (
                  <li key={landing.slug} className={podborkiBentoCellClass(span)}>
                    <Link
                      href={landingCategoryHref(landing.slug)}
                      className="group relative flex h-full min-h-[inherit] overflow-hidden rounded-card bg-slate-800 text-left text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      <SafeImage
                        src={imageUrl}
                        alt=""
                        fill
                        sizes={span === 2 ? '50vw' : '25vw'}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        fallback={<div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-sky-900 to-slate-950" />}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                      <div className="relative z-[1] flex h-full w-full flex-col justify-end p-4 sm:p-5">
                        <h3 className="text-base font-bold text-white sm:text-lg">{landing.title}</h3>
                        {landing.subtitle ? (
                          <p className="mt-1 line-clamp-2 text-sm text-white/90">{landing.subtitle}</p>
                        ) : null}
                        <div className="mt-3 text-sm font-semibold text-white">
                          {pluralEvents(landing.events)}
                          {landing.priceFrom != null ? ` · ${formatMoney(landing.priceFrom)}` : ''}
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

      {/* 6. Blog magazine */}
      {featuredBlog ? (
        <section id="blog" className="section-y bg-surface-muted">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Идеи для поездок
                </h2>
                <p className="mt-1 text-sm text-slate-500">Журнал Дайбилет - маршруты и советы</p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
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
              <div className="grid gap-4">
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
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                        {post.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 7. Trust strip - live counts only, no fake reviews */}
      <section className="section-y">
        <div className="container-page">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-primary-50/50 via-white to-sky-50/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
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
