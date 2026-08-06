'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Gift,
  Landmark,
  Map as MapIcon,
  MapPin,
  Mic2,
  Route,
  Ship,
  Sparkles,
  Theater,
  type LucideIcon,
} from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import {
  HOME_MOBILE_CATEGORY_STACK,
  HOME_STORIES,
  type HomeGuideChip,
} from '@/lib/home-guide';

const ICON_MAP: Record<HomeGuideChip['icon'], LucideIcon> = {
  mic: Mic2,
  ship: Ship,
  map: MapIcon,
  calendar: CalendarDays,
  gift: Gift,
  sparkles: Sparkles,
  landmark: Landmark,
  pin: MapPin,
  route: Route,
  theater: Theater,
};

function storyHref(chip: HomeGuideChip, cityValue: string): string {
  if (chip.href.startsWith('/events')) {
    const qs = chip.href.includes('?') ? chip.href.slice(chip.href.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qs);
    return catalogHrefWithSelectedCity(cityValue, {
      q: params.get('q') || undefined,
      category: params.get('category') || undefined,
      date: params.get('date') || undefined,
      sort: (params.get('sort') as 'popular' | 'time' | undefined) || undefined,
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : undefined,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    });
  }
  return chip.href;
}

/**
 * Mobile quick links under the site header.
 * Quiet pill tiles (brand primary/sky, no Instagram gradient rings).
 * Category trio (Концерты / Стендап / Экскурсии) stacked below - not a horizontal row.
 */
export function HomeStoriesStrip() {
  const selectedCity = useSelectedCityOptional();
  const cityValue =
    selectedCity?.cityReady && selectedCity.cityValue !== 'all' ? selectedCity.cityValue : 'all';

  return (
    <div className="border-b border-slate-100 bg-neutral-50/80 lg:hidden">
      <div
        className="flex gap-2 overflow-x-auto px-4 py-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="navigation"
        aria-label="Быстрые сценарии"
      >
        {HOME_STORIES.map((story) => {
          const Icon = ICON_MAP[story.icon];
          return (
            <Link
              key={story.id}
              href={storyHref(story, cityValue)}
              className="inline-flex shrink-0 snap-start items-center gap-2 rounded-full bg-white py-2 pl-2 pr-3.5 shadow-sm ring-1 ring-slate-200/80 transition active:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold leading-none text-slate-800">
                {story.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div
        className="flex flex-col gap-2 border-t border-slate-100/80 px-4 pb-3 pt-2"
        role="navigation"
        aria-label="Категории"
      >
        {HOME_MOBILE_CATEGORY_STACK.map((chip) => {
          const Icon = ICON_MAP[chip.icon];
          return (
            <Link
              key={chip.id}
              href={storyHref(chip, cityValue)}
              className="inline-flex min-h-11 w-full items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80 transition active:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {chip.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
