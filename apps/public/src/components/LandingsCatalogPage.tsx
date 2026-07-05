import * as React from 'react';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { formatMoney, formatNumber, publicData } from '@/data';
import { buildCatalogPresetHref, buildCatalogTagHref } from '@/lib/catalog-links';
import { CATALOG_PRESET_EMOJI, CATALOG_PRESET_HINT, CATALOG_PRESETS } from '@/lib/catalog-presets';
import { collectPopularTags } from '@/lib/catalog-tags';
import { landingPageHref } from '@/lib/landing-slugs';
import type { PublicLanding } from '@/types';

const LANDING_EMOJI: Record<string, string> = {
  'river-cruises': '🚢',
  'bus-tours': '🚌',
  'river-party': '🎉',
  'bridges-night': '🌉',
  'moscow-dinner-boat': '🍽',
  'standup': '🎤',
  'new-year': '🎄',
  'salute-9-may': '🎆',
};

export function LandingsCatalogPage() {
  React.useEffect(() => {
    document.title = 'Подборки — тематические коллекции событий | Дайбилет';
    upsertMeta(
      'description',
      'Готовые подборки на вечер, выходные и бюджет, тематические направления и популярные теги — с переходом в каталог с нужными фильтрами.',
    );
  }, []);

  const landings = React.useMemo(() => publicData.landings.filter((landing) => landing.events > 0), []);
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
          <h2 className="font-display text-xl font-bold text-slate-900">По моменту</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG_PRESETS.map((preset) => (
              <a
                key={preset.slug}
                href={buildCatalogPresetHref(preset.slug)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl" aria-hidden>
                    {CATALOG_PRESET_EMOJI[preset.slug]}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-primary-700">{preset.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{CATALOG_PRESET_HINT[preset.slug]}</p>
              </a>
            ))}
          </div>
        </section>

        {landings.length ? (
          <section className="mt-12">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-primary" />
              Направления
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Тематические хабы: круизы, экскурсии, вечеринки, сезонные программы. У каждого — версии по городам.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {landings.map((landing) => (
                <LandingDirectionCard key={landing.slug} landing={landing} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-lg text-slate-500">Тематические направления скоро появятся</p>
            <p className="mt-1 text-sm text-slate-400">Пока доступны быстрые фильтры и теги ниже</p>
          </section>
        )}

        {tags.length ? (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-slate-900">По тегам</h2>
            <p className="mt-1 text-sm text-slate-500">Популярные запросы — откроют каталог с поиском по тегу</p>
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
  const imageUrl = landing.heroImageUrl || landing.imageUrl || null;

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
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)} opacity-90`} />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/10" />
      <div className="relative p-4 text-white sm:p-5">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-display mt-1 text-lg font-bold sm:text-xl">{landing.title}</h3>
        {landing.subtitle ? <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{landing.subtitle}</p> : null}
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white sm:text-sm">
          {pluralEvents(landing.events)} · от {formatMoney(landing.priceFrom)}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </a>
  );
}

function landingGradient(slug: string): string {
  if (slug.includes('river') || slug.includes('bridge') || slug.includes('boat')) return 'from-sky-600 via-primary-700 to-slate-900';
  if (slug.includes('bus')) return 'from-amber-500 via-orange-600 to-rose-600';
  if (slug.includes('salute') || slug.includes('new-year')) return 'from-violet-700 via-fuchsia-600 to-indigo-900';
  if (slug.includes('standup')) return 'from-emerald-600 via-teal-600 to-cyan-800';
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
