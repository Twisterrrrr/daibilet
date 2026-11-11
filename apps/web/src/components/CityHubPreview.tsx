import Link from 'next/link';
import { ArrowRight, Clock, Info, MapPin } from 'lucide-react';

import { CityWeatherWidget } from '@/components/CityWeatherWidget.client';
import { SafeImage } from '@/components/SafeImage.client';
import { fontUnbounded } from '@/lib/fonts';
import { resolveCityHeroRegionBadge } from '@/lib/city-hero-region';
import { resolveCityImage } from '@/lib/city-images';
import { resolveCityPlaceHref, type CityInfoEntry } from '@/lib/cityInfo';
import { pluralEvents, pluralPoints, pluralVenues } from '@/lib/format';
import type { PublicCityDto, PublicCityPageDto } from '@daibilet/contracts/public';

/** Превью хаба города в новом дизайне (подмножество блоков, без афиши/табов). */
export function CityHubPreview({
  city,
  stats,
  guide,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry;
}) {
  const heroImage = resolveCityImage({ slug: city.slug, sourceSlug: city.sourceSlug, name: city.name });
  const places = guide.mustSee ?? [];
  const routes = guide.dayRoutePresets ?? [];
  const faq = guide.faq ?? [];
  const regionBadge = resolveCityHeroRegionBadge(city);

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

      <div className="container-page py-12 sm:py-16">
        <div className={guide.hookFact ? 'grid gap-4 md:grid-cols-[1.2fr_1fr]' : ''}>
          {guide.hookFact ? (
            <section className="rounded-2xl border border-[#e8dab8] bg-[#faf6ee] px-6 py-5">
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
                const inner = (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-alt text-sm font-bold text-ink">
                        {index + 1}
                      </span>
                      <h3 className="text-base font-bold leading-snug tracking-tight text-ink">{place.name}</h3>
                    </div>
                    {place.desc ? (
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">{place.desc}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-ink-muted-2">
                      {place.visitMinutes ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {place.visitMinutes}
                        </span>
                      ) : null}
                      {place.address ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {place.address}
                        </span>
                      ) : null}
                    </div>
                  </>
                );
                const cardClass =
                  'flex min-h-[10rem] w-72 shrink-0 flex-col gap-2 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover';
                return href ? (
                  <Link key={place.name} href={href} className={`${cardClass} group`}>
                    {inner}
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
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
      </div>
    </>
  );
}