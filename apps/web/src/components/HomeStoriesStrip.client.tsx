'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Gift,
  Landmark,
  Map as MapIcon,
  Mic2,
  Ship,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { HOME_STORIES, type HomeGuideChip } from '@/lib/home-guide';

const ICON_MAP: Record<HomeGuideChip['icon'], LucideIcon> = {
  mic: Mic2,
  ship: Ship,
  map: MapIcon,
  calendar: CalendarDays,
  gift: Gift,
  sparkles: Sparkles,
  landmark: Landmark,
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

/** Mobile horizontal stories under the site header. */
export function HomeStoriesStrip() {
  const selectedCity = useSelectedCityOptional();
  const cityValue =
    selectedCity?.cityReady && selectedCity.cityValue !== 'all' ? selectedCity.cityValue : 'all';

  return (
    <div className="border-b border-slate-100 bg-white lg:hidden">
      <div
        className="flex gap-3 overflow-x-auto px-4 py-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="navigation"
        aria-label="Быстрые сценарии"
      >
        {HOME_STORIES.map((story) => {
          const Icon = ICON_MAP[story.icon];
          return (
            <Link
              key={story.id}
              href={storyHref(story, cityValue)}
              className="flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-sky-500 p-[2px] shadow-sm shadow-primary-500/20">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                  <Icon className="h-5 w-5 text-primary-600" aria-hidden />
                </span>
              </span>
              <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight text-slate-800">
                {story.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
