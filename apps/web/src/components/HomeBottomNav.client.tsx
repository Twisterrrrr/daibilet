'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Compass, MapPin, Route } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, placesHubHrefWithSelectedCity } from '@/lib/catalog-url';
import { buildMyDayHref } from '@/lib/home-guide';

/**
 * Mobile sticky bottom nav for personal-guide home (and soft-nav siblings).
 * Hidden on lg+. Pair with `pb-24 lg:pb-0` on page root.
 */
export function HomeBottomNav() {
  const pathname = usePathname();
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? false;
  const cityValue = cityReady ? selectedCity?.cityValue ?? 'all' : 'all';
  const citySlug = selectedCity?.selectedDestination?.slug || null;
  const cityQuery = citySlug || cityValue;

  const items = [
    {
      id: 'afisha',
      label: 'Афиша',
      href: catalogHrefWithSelectedCity(cityQuery, { sort: 'popular' }),
      icon: CalendarDays,
      accent: false,
      match: (path: string) => path === '/events' || path.startsWith('/events/'),
    },
    {
      id: 'podborki',
      label: 'Подборки',
      href: '/podborki',
      icon: Compass,
      accent: false,
      match: (path: string) => path === '/podborki' || path.startsWith('/podborki/'),
    },
    {
      id: 'my-day',
      label: 'Мой день',
      href: buildMyDayHref(citySlug),
      icon: Route,
      accent: true,
      match: (path: string) => path === '/my-day' || path.startsWith('/my-day'),
    },
    {
      id: 'places',
      label: 'Места',
      href: placesHubHrefWithSelectedCity(cityQuery),
      icon: MapPin,
      accent: false,
      match: (path: string) =>
        path === '/places' ||
        path.startsWith('/places/') ||
        path === '/locations' ||
        path.startsWith('/locations/') ||
        path === '/venues' ||
        path.startsWith('/venues/'),
    },
  ] as const;

  const path = pathname.replace(/\/$/, '') || '/';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Главная навигация"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5 pb-1">
        {items.map((item) => {
          const active = item.match(path);
          const Icon = item.icon;
          if (item.accent) {
            return (
              <li key={item.id} className="flex min-w-0 flex-1 justify-center">
                <Link
                  href={item.href}
                  className="group flex -translate-y-2 flex-col items-center gap-0.5"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition ${
                      active
                        ? 'bg-primary-600 text-white shadow-primary-600/30'
                        : 'bg-gradient-to-br from-primary-600 to-sky-500 text-white shadow-primary-500/25 group-hover:from-primary-700 group-hover:to-sky-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      active ? 'text-primary-700' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.id} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={item.href}
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-2 ${
                  active ? 'text-primary-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
