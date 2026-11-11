'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { fontUnbounded } from '@/lib/fonts';

const NAV = [
  { label: 'Афиша', href: '/events' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Гид', href: '/cities' },
  { label: 'Блог', href: '/blog' },
] as const;

function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const norm = href.replace(/\/$/, '');
  if (norm === '/events') return path === '/events' || path.startsWith('/events/');
  if (norm === '/cities') return path === '/cities' || path.startsWith('/cities/');
  return path === norm || path.startsWith(`${norm}/`);
}

/** Новая шапка шаблона (Inter + Unbounded, красный акцент). Превью на /about2 - не production chrome. */
export function SiteHeaderV2() {
  const pathname = usePathname() ?? '/';
  const selectedCity = useSelectedCityOptional();
  const cityLabel = selectedCity?.cityLabel ?? 'Все города';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-page flex h-16 items-center gap-4 md:h-[72px] md:gap-5">
        <Link
          href="/"
          className={`${fontUnbounded.className} text-xl font-extrabold tracking-tight text-ink`}
          aria-label="Дайбилет"
        >
          дай<span className="text-accent">билет</span>
        </Link>

        <Link
          href="/cities"
          className="hidden items-center gap-1.5 rounded-lg bg-surface-alt px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-[#eceef5] lg:inline-flex"
        >
          {cityLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Основная навигация">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-alt'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <Link
          href="/my-day"
          className="hidden items-center rounded-xl bg-surface-alt px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-[#eceef5] sm:inline-flex"
        >
          Мой день
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(255,71,87,0.25)] transition-colors hover:bg-accent-dark"
        >
          Войти
        </Link>
      </div>
    </header>
  );
}