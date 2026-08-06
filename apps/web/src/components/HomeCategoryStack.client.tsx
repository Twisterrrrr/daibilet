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

/** Mobile-only: Концерты / Стендап / Экскурсии as a vertical stack (not a horizontal row). */
export function HomeCategoryStack() {
  const selectedCity = useSelectedCityOptional();
  const cityValue =
    selectedCity?.cityReady && selectedCity.cityValue !== 'all' ? selectedCity.cityValue : 'all';

  return (
    <section className="border-b border-slate-200/70 bg-neutral-50 lg:hidden" aria-label="Форматы">
      <div className="container-page py-4">
        <ul className="flex flex-col gap-2">
          {HOME_MOBILE_CATEGORY_STACK.map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
              <li key={item.id}>
                <Link
                  href={stackHref(item, cityValue)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/80 transition active:bg-slate-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
