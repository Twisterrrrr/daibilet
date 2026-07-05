import * as React from 'react';
import { ArrowDownAZ, ArrowUpAZ, Hash } from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { resolveCityBrief } from '@/lib/cityInfo';
import { resolveCityCardImage } from '@/lib/city-images';
import { filterOrphanRegions, resolveCityRegion } from '@/lib/cityRegionHub';
import { cityHref, citySlug } from '@/routes';
import { publicData } from '@/data';
import type { PublicDestination } from '@/types';

import { API_BASE_URL } from '@/lib/api-base';
type SortMode = 'events' | 'asc' | 'desc';

export function CitiesCatalogPage() {
  const [query, setQuery] = React.useState('');
  const [sortMode, setSortMode] = React.useState<SortMode>('events');
  const [destinations, setDestinations] = React.useState<PublicDestination[]>(() => publicData.destinations);
  const [isLoading, setIsLoading] = React.useState(() => publicData.destinations.length === 0);

  React.useEffect(() => {
    document.title = 'Города России — экскурсии, музеи и мероприятия | Дайбилет';
    upsertMeta(
      'description',
      'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.',
    );
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`${API_BASE_URL}/api/public/destinations`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { destinations?: PublicDestination[] };
      })
      .then((payload) => {
        if (Array.isArray(payload.destinations)) setDestinations(payload.destinations);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const cities = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = destinations
      .filter((item) => item.type === 'city')
      .filter((item) => !normalized || item.name.toLowerCase().includes(normalized));

    return [...filtered].sort((a, b) => {
      if (sortMode === 'events') return b.events - a.events || a.name.localeCompare(b.name, 'ru');
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
    });
  }, [destinations, query, sortMode]);

  const regions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = destinations
      .filter((item) => item.type === 'region' && item.events > 0)
      .filter((item) => !normalized || item.name.toLowerCase().includes(normalized));

    return [...filtered].sort((a, b) => {
      if (sortMode === 'events') return b.events - a.events || a.name.localeCompare(b.name, 'ru');
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
    });
  }, [destinations, query, sortMode]);

  const orphanRegions = React.useMemo(() => filterOrphanRegions(regions, cities), [regions, cities]);

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'orders') window.location.href = '/my-orders';
    else if (section === 'blog') window.location.href = '/blog';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else window.location.href = `/#${section}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header cityLabel="Все города" onSection={goSection} />
      <main className="container-page py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-display text-3xl font-bold text-slate-900">Города</h1>
              <div className="shrink-0 sm:hidden">
                <CitiesSortControls sortMode={sortMode} onSortModeChange={setSortMode} compact />
              </div>
            </div>
            <p className="mt-2 text-lg text-slate-500">
              {cities.length > 0 ? `${cities.length} ${pluralCitiesLabel(cities.length)}` : 'Города'}
              {' — экскурсии, музеи и мероприятия по всей территории России'}
            </p>
          </div>
          <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2">
            <span className="text-sm text-slate-500">Сортировка:</span>
            <CitiesSortControls sortMode={sortMode} onSortModeChange={setSortMode} />
          </div>
        </div>

        {isLoading && !cities.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
            <p className="text-lg text-slate-400">Города загружаются...</p>
          </div>
        ) : null}

        {!isLoading && !cities.length && !orphanRegions.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
            <p className="text-lg text-slate-400">Ничего не найдено</p>
            <p className="mt-1 text-sm text-slate-400">Попробуйте изменить поисковый запрос</p>
          </div>
        ) : null}

        {cities.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => {
              const slug = citySlug(city);
              return (
                <CityCard
                  key={`${city.type}:${city.id || slug}`}
                  slug={slug}
                  name={city.name}
                  eventCount={city.events}
                  venueCount={city.venues}
                  description={resolveCityBrief(city.slug, city.sourceSlug, city.name)}
                  href={cityHref(city)}
                  imageUrl={resolveCityCardImage({ slug, sourceSlug: city.sourceSlug, name: city.name })}
                  region={resolveCityRegion(city, destinations)}
                  large
                />
              );
            })}
          </div>
        ) : null}

        {orphanRegions.length > 0 ? (
          <section className="mt-12 border-t border-slate-200 pt-10">
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Области и направления</h2>
              <p className="mt-1 text-sm text-slate-500">
                События в городах без отдельной карточки — курорты, пригороды и малые населённые пункты
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orphanRegions.map((region) => (
                <RegionDestinationLink key={`region:${region.slug || region.name}`} region={region} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function CitiesSortControls({
  sortMode,
  onSortModeChange,
  compact = false,
}: {
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  compact?: boolean;
}) {
  const buttonClass = compact ? 'px-2 py-2' : 'px-3 py-2';

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onSortModeChange('events')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'events' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По количеству событий"
      >
        <Hash className="h-4 w-4" />
        <span className="sr-only">По событиям</span>
      </button>
      <button
        type="button"
        onClick={() => onSortModeChange('asc')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'asc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По алфавиту А–Я"
      >
        <ArrowDownAZ className="h-4 w-4" />
        <span className="sr-only">А–Я</span>
      </button>
      <button
        type="button"
        onClick={() => onSortModeChange('desc')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'desc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По алфавиту Я–А"
      >
        <ArrowUpAZ className="h-4 w-4" />
        <span className="sr-only">Я–А</span>
      </button>
    </div>
  );
}

function pluralCitiesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'городов';
  if (mod10 === 1) return 'город';
  if (mod10 >= 2 && mod10 <= 4) return 'города';
  return 'городов';
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
