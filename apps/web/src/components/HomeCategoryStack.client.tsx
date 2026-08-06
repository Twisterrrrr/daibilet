'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Gift,
  Landmark,
  Map as MapIcon,
  MapPin,
  Mic2,
  Music2,
  Route,
  Ship,
  Sparkles,
  Theater,
  type LucideIcon,
} from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { HOME_MOBILE_CATEGORY_STACK, type HomeGuideChip } from '@/lib/home-guide';

const ICON_MAP: Record<HomeGuideChip['icon'], LucideIcon> = {
  mic: Mic2,
  music: Music2,
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

function stackHref(chip: HomeGuideChip, cityValue: string): string {
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

/** Mobile-only: format shortcuts as a compact 2-col grid (not Instagram stories). */
export function HomeCategoryStack() {
  const selectedCity = useSelectedCityOptional();
  const cityValue =
    selectedCity?.cityReady && selectedCity.cityValue !== 'all' ? selectedCity.cityValue : 'all';

  return (
    <section className="border-b border-slate-200/70 bg-neutral-50 lg:hidden" aria-label="Форматы">
      <div className="container-page py-4">
        <ul className="grid grid-cols-2 gap-2">
          {HOME_MOBILE_CATEGORY_STACK.map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
              <li key={item.id}>
                <Link
                  href={stackHref(item, cityValue)}
                  className="flex h-full min-h-[3rem] w-full items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/80 transition active:bg-slate-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-[13px] font-semibold leading-snug text-slate-800">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
