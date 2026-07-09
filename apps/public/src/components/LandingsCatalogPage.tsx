import * as React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { formatMoney, formatNumber, publicData } from '@/data';
import { API_BASE_URL } from '@/lib/api-base';
import { buildCatalogPresetHref, buildCatalogTagHref } from '@/lib/catalog-links';
import { CATALOG_PRESET_EMOJI, CATALOG_PRESETS } from '@/lib/catalog-presets';
import { collectPopularTags } from '@/lib/catalog-tags';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { landingPageHref } from '@/lib/landing-slugs';
import type { PublicLanding } from '@/types';

const LANDING_EMOJI: Record<string, string> = {
  'river-cruises': '🚢',
  'bus-tours': '🚌',
  'river-party': '🎉',
  'bridges-night': '🌉',
  'moscow-dinner-boat': '🍽',
  'moscow-museums': '🏛',
  'spb-yards': '🏛',
  'standup': '🎤',
  'new-year': '🎄',
  'salute-9-may': '🎆',
  'family-kids': '🎪',
  'concerts-genre': '🎸',
  'active-sport': '🏎',
};

export function LandingsCatalogPage({ dataVersion = 0 }: { dataVersion?: number }) {
  React.useEffect(() => {
    document.title = 'Подборки — тематические коллекции событий | Дайбилет';
    upsertMeta(
      'description',
      'Готовые подборки на вечер, выходные и бюджет, популярные запросы и теги — с переходом в каталог с нужными фильтрами.',
    );
  }, []);

  const [cityFilter, setCityFilter] = React.useState('all');
  const fallbackLandings = React.useMemo(
    () => publicData.landings.filter((landing) => landing.events > 0),
    [dataVersion, publicData.landings],
  );
  const [landings, setLandings] = React.useState<PublicLanding[]>(fallbackLandings);
  const [landingsLoading, setLandingsLoading] = React.useState(false);

  React.useEffect(() => {
    setLandings(fallbackLandings);
  }, [fallbackLandings]);

  React.useEffect(() => {
    if (cityFilter === 'all') {
      setLandingsLoading(false);
      return;
    }

    const controller = new AbortController();
    setLandingsLoading(true);
    const params = new URLSearchParams({ city: cityFilter });

    fetch(`${API_BASE_URL}/api/public/landings-catalog?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { items?: Array<{ slug: string; title: string; subtitle: string; events: number; priceFrom?: number | null }> } | null) => {
        if (!payload?.items) return;
        setLandings(
          payload.items.map((item) => ({
            slug: item.slug,
            title: item.title,
            subtitle: item.subtitle,
            chips: [],
            events: item.events,
            venues: 0,
            priceFrom: item.priceFrom,
            strength: item.events >= 20 ? 'ready' : 'seed',
          })),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLandingsLoading(false);
      });

    return () => controller.abort();
  }, [cityFilter, dataVersion]);

  const tags = React.useMemo(() => collectPopularTags(publicData.sessions, 24), []);
  const totalEvents = publicData.stats.events || publicData.sessions.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header cityLabel="Все города" onSection={navigateFromLandings} />

      <SectionPageHero
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Подборки' }]}
        gradientClass="from-fuchsia-500 via-primary to-indigo-700"
        eyebrow={
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/80">
            <Sparkles className="h-4 w-4" />
            Тематические подборки
          </p>
        }
        title="Подборки событий"
        description="Готовые списки под настроение и повод: вечер, выходные, бюджет или редкие премьеры."
      />

      <main className="container-page py-10 sm:py-12">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900">Быстрые подборки</h2>
          <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATALOG_PRESETS.map((preset) => (
              <a
                key={preset.slug}
                href={buildCatalogPresetHref(preset.slug)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary-700"
              >
                <span className="text-base leading-none" aria-hidden>
                  {CATALOG_PRESET_EMOJI[preset.slug]}
                </span>
                {preset.label}
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-slate-900">
                <Sparkles className="h-5 w-5 text-primary" />
                Популярные запросы
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Речные прогулки, развод мостов, стендап, автобусные экскурсии и тематические подборки — выберите город для актуального списка.
              </p>
            </div>
            <div className="w-full shrink-0 sm:w-auto sm:min-w-[220px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <CityPicker value={cityFilter} onChange={setCityFilter} variant="compact" className="w-full" />
              </div>
            </div>
          </div>
          {landings.length ? (
            <div className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${landingsLoading ? 'opacity-60' : ''}`}>
              {landings.map((landing) => (
                <LandingDirectionCard key={landing.slug} landing={landing} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-lg text-slate-500">
                {cityFilter === 'all' ? 'Популярные запросы скоро появятся' : `В ${cityFilter} пока нет подборок с событиями`}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {cityFilter === 'all' ? 'Пока доступны быстрые фильтры и теги ниже' : 'Попробуйте другой город или смотрите каталог целиком'}
              </p>
            </div>
          )}
        </section>

        {tags.length ? (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-slate-900">По тегам</h2>
            <p className="mt-1 text-sm text-slate-500">Уточните тему — откроется каталог с фильтром по тегу</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <a
                  key={tag.name}
                  href={buildCatalogTagHref(tag.name)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary-700"
                >
                  #{tag.name}
                  <span className="text-xs text-slate-400">{formatNumber(tag.events)}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-12 text-sm text-slate-500">
          Всего в каталоге{' '}
          <span className="font-semibold text-slate-900">{formatNumber(totalEvents)}</span> событий. Ищите подходящее по фильтрам в{' '}
          <a href="/events" className="font-medium text-primary-600 hover:text-primary-700">
            каталоге
          </a>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}

function LandingDirectionCard({ landing }: { landing: PublicLanding }) {
  const emoji = LANDING_EMOJI[landing.slug] || '✨';
  const imageUrl = resolveLandingCardImage(landing.slug);

  return (
    <a
      href={landingPageHref(landing.slug)}
      className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 shadow-sm ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:shadow-xl sm:h-60"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)} opacity-90`} />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
      <div className="relative p-4 text-white sm:p-5">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-display mt-1 text-lg font-bold sm:text-xl">{landing.title}</h3>
        {landing.subtitle ? <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{landing.subtitle}</p> : null}
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white sm:text-sm">
          {pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </a>
  );
}

function landingGradient(slug: string): string {
  if (slug.includes('yard') || slug.includes('paradn') || slug.includes('museum')) return 'from-amber-700 via-orange-800 to-stone-900';
  if (slug.includes('river') || slug.includes('bridge') || slug.includes('boat')) return 'from-sky-600 via-primary-700 to-slate-900';
  if (slug.includes('bus')) return 'from-amber-500 via-orange-600 to-rose-600';
  if (slug.includes('salute') || slug.includes('new-year')) return 'from-violet-700 via-fuchsia-600 to-indigo-900';
  if (slug.includes('standup')) return 'from-emerald-600 via-teal-600 to-cyan-800';
  if (slug.includes('family') || slug.includes('kids')) return 'from-pink-500 via-rose-500 to-orange-500';
  if (slug.includes('concert')) return 'from-red-600 via-rose-700 to-purple-900';
  if (slug.includes('active') || slug.includes('sport')) return 'from-slate-700 via-zinc-800 to-black';
  return 'from-indigo-600 via-primary to-fuchsia-700';
}

function pluralEvents(count: number): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const word =
    mod100 >= 11 && mod100 <= 19 ? 'событий' : mod10 === 1 ? 'событие' : mod10 >= 2 && mod10 <= 4 ? 'события' : 'событий';
  return `${formatNumber(count)} ${word}`;
}

function navigateFromLandings(section: string) {
  if (section === 'top') window.location.href = '/';
  else if (section === 'events') window.location.href = '/events';
  else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
  else if (section === 'landings') window.location.href = '/podborki';
  else if (section === 'orders') window.location.href = '/my-orders';
  else if (section === 'blog') window.location.href = '/blog';
  else window.location.href = '/';
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
