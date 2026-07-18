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
import { SiteLayout } from '@/components/SiteLayout';
import { mergeBlogCards } from '@/lib/blog-utils';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';
import '@/lib/env';
import { getHomePageData } from '@/server/cached-home-data';
import { formatMoney, pluralEvents } from '@/lib/format';
import { buildHomePageSections } from '@/lib/home-page-sections';
import { HOME_FORMAT_TILES, HOME_TRUST_ITEMS } from '@/lib/home-scenarios';
import { landingCategoryHref } from '@/lib/landing-routes';
import { venueHref } from '@/lib/routes';
import { venuePageTemplate } from '@/lib/venue-meta';

function promoGradient(index: number): string {
  const variants = [
    'bg-gradient-to-br from-primary-700 to-primary-950',
    'bg-gradient-to-br from-emerald-600 to-slate-900',
    'bg-gradient-to-br from-amber-500 to-orange-700',
    'bg-gradient-to-br from-sky-600 to-indigo-900',
    'bg-gradient-to-br from-rose-600 to-slate-900',
    'bg-gradient-to-br from-violet-600 to-primary-950',
  ];
  return variants[index % variants.length];
}

function promoBlockIcon(slug: string, index: number) {
  const key = String(slug || '').toLowerCase();
  if (key.includes('bridge')) return <Landmark className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('dinner') || key.includes('ужин')) return <UtensilsCrossed className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('party') || key.includes('disco')) return <CalendarDays className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('bus')) return <MapPin className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('concert')) return <CalendarDays className="mb-3 h-8 w-8 opacity-80" />;
  if (index % 3 === 0) return <Ship className="mb-3 h-8 w-8 opacity-80" />;
  if (index % 3 === 1) return <CalendarDays className="mb-3 h-8 w-8 opacity-80" />;
  return <UtensilsCrossed className="mb-3 h-8 w-8 opacity-80" />;
}

export async function HomePageContent() {
  const { destinationsPayload, catalogPayload, landingsCatalog, venuesPayload, statsPayload } =
    await getHomePageData();

  const destinations = destinationsPayload?.destinations ?? [];
  const cities = destinations.filter((item) => item.type === 'city');
  const topCities = [...cities].sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')).slice(0, 8);
  const totalEvents = statsPayload.stats.events;
  const totalVenues = statsPayload.stats.venues;
  const cityCount = statsPayload.stats.destinations || cities.length;

  const sessions = catalogPayload.items ?? [];
  const { editorsPick, homeNowTabs, popular } = buildHomePageSections(sessions);
  const sparseCatalog = sessions.length < 12;

  const homeVenues = venuesPayload.venues
    .filter((venue) => venuePageTemplate(venue.type) === 'institution' && venue.events >= 3 && venue.address)
    .sort((a, b) => b.events - a.events)
    .slice(0, 8);

  const promoLandings = (landingsCatalog.items || []).filter((item) => item.events > 0).slice(0, 6);
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

  return (
    <>
      <HomeHero destinations={destinations} totalEvents={totalEvents} totalVenues={totalVenues} cityCount={cityCount} />

      <HomeEventRail
        id="editors-pick"
        title="Выбор редакции"
        subtitle="Закреплённые в подборках и сильные предложения с ближайшими датами"
        href="/events?sort=popular"
        events={editorsPick}
        editorsPickBadge
      />

      {topCities.length ? (
        <section id="destinations" className="border-b border-slate-100 py-12 sm:py-16">
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
        <section className="py-12 sm:py-16">
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
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {popular.map((session) => (
                <li key={session.id}>
                  <EventCard session={session} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="formats" className="py-12 sm:py-16">
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
          <div className="horizontal-snap-row mt-6 flex flex-nowrap gap-3 snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:pb-0">
            {HOME_FORMAT_TILES.map((tile) => (
              <Link
                key={tile.title}
                href={tile.href}
                className={`horizontal-snap-card group relative min-h-[140px] overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-lg transition hover:scale-[1.02] md:w-auto ${tile.gradient}`}
              >
                <h3 className="text-lg font-bold">{tile.title}</h3>
                <p className="mt-1 text-sm text-white/80">{tile.subtitle}</p>
                <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {homeVenues.length ? (
        <section id="venues" className="border-t border-slate-100 py-12 sm:py-16">
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {homeVenues.map((venue) => (
                <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {promoLandings.length ? (
        <section id="landings" className="py-12 sm:py-16">
          <div className="container-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Тематические подборки</h2>
                <p className="mt-1 text-sm text-slate-500">Готовые списки под настроение и повод — от прогулок до концертов</p>
              </div>
              <Link href="/podborki" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
                Все подборки <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="horizontal-snap-row mt-6 flex flex-nowrap gap-3 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0">
              {promoLandings.map((landing, index) => (
                <Link
                  key={landing.slug}
                  href={landingCategoryHref(landing.slug)}
                  className={`horizontal-snap-card group relative min-h-[168px] overflow-hidden rounded-xl p-5 text-left text-white shadow-lg transition-transform hover:scale-[1.02] sm:min-h-[180px] sm:p-6 md:w-auto ${promoGradient(index)}`}
                >
                  {promoBlockIcon(landing.slug, index)}
                  <h3 className="text-lg font-bold">{landing.title}</h3>
                  <p className="mt-1 text-sm text-white/80">{landing.subtitle}</p>
                  <div className="mt-4 text-sm font-semibold">
                    {pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {featuredBlog ? (
        <section id="blog" className="bg-slate-50 py-12 sm:py-16">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Идеи для поездок и отдыха</h2>
                <p className="mt-1 text-sm text-slate-500">Гайды и советы перед выбором события</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Все материалы <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Link
                href={`/blog/${featuredBlog.slug}`}
                className="group relative min-h-[240px] overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg sm:min-h-[280px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredBlog.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-6">
                  <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">{featuredBlog.tag}</span>
                  <h3 className="mt-3 text-2xl font-bold">{featuredBlog.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-white/80">{featuredBlog.excerpt}</p>
                </div>
              </Link>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {restBlog.slice(0, 3).map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
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

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Почему выбирают Дайбилет</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_TRUST_ITEMS.map(({ title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <CheckCircle2 className="h-6 w-6 text-primary-600" />
                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="partner" className="bg-gradient-to-r from-primary-600 to-sky-500 py-12 sm:py-16">
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
