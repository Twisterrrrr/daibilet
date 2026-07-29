'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Heart, HelpCircle, LogIn, Menu, User, X } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import { CityPicker } from '@/components/CityPicker.client';
import { DaibiletLogo } from '@/components/DaibiletLogo';
import { FavoritesPanel } from '@/components/FavoritesPanel.client';
import { HeaderSearch } from '@/components/HeaderSearch.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { useUserAuthOptional } from '@/hooks/useUserAuth';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';

const NAV_LINKS = [
  { label: 'События', href: '/events', catalog: true },
  { label: 'Города', href: '/cities' },
  { label: 'Площадки', href: '/venues', venueCatalog: 'venues' as const },
  { label: 'Локации', href: '/locations', venueCatalog: 'locations' as const },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Блог', href: '/blog' },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const normalized = href.replace(/\/$/, '') || '/';
  if (normalized === '/') return path === '/';
  return path === normalized || path.startsWith(`${normalized}/`);
}

type SiteHeaderProps = {
  destinations?: PublicDestinationDto[];
};

export function SiteHeader({ destinations = [] }: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authMounted, setAuthMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const auth = useUserAuthOptional();
  const selectedCity = useSelectedCityOptional();

  const urlCity = searchParams.get('city');

  useEffect(() => {
    setAuthMounted(true);
  }, []);

  const cityLabel = selectedCity?.cityLabel ?? 'Все города';
  const cityValue = selectedCity?.cityValue ?? 'all';
  const cityReady = selectedCity?.cityReady ?? false;
  const onCityChange = selectedCity?.setCity ?? (() => undefined);
  const navLinks = NAV_LINKS.map((item) => {
    if ('catalog' in item && item.catalog) {
      return { ...item, href: catalogHrefWithSelectedCity(cityReady ? cityValue : 'all') };
    }
    if ('venueCatalog' in item && item.venueCatalog) {
      const path = item.venueCatalog === 'venues' ? '/venues' : '/locations';
      return {
        ...item,
        href: venueCatalogHrefWithSelectedCity(path, cityReady ? cityValue : 'all'),
      };
    }
    return { ...item, href: item.href };
  });

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileOpen && !favoritesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [favoritesOpen, mobileOpen]);

  const isLoggedIn = authMounted && Boolean(auth?.isLoggedIn);
  const searchCityFilter = urlCity || (cityValue !== 'all' ? cityValue : undefined);
  const searchInitialQuery = pathname.startsWith('/events') ? searchParams.get('q') || '' : '';

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_hsl(210_9%_11%/0.03)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="container-page flex min-h-[var(--site-header-height)] items-center justify-between gap-2 py-2.5 sm:gap-3 sm:py-3 lg:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none lg:gap-4">
            <button
              type="button"
              aria-label="Открыть меню"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-graphite transition hover:bg-surface-muted lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <Link href="/" className="min-w-0 shrink translate-y-[3mm] truncate">
              <DaibiletLogo textClassName="text-lg sm:text-xl lg:text-2xl" />
            </Link>

            <CityPicker
              cities={destinations}
              value={cityValue}
              onChange={onCityChange}
              allLabel="Все города"
              variant="header"
              className="hidden max-w-[9.5rem] shrink-0 lg:block xl:max-w-[12rem]"
            />
          </div>

          <nav aria-label="Основная навигация" className="hidden min-w-0 items-center gap-0.5 lg:flex">
            {navLinks.map((item) => {
              const active = isNavActive(pathname, item.href.split('?')[0] || item.href);
              const secondary = item.href.startsWith('/venues') || item.href.startsWith('/locations') || item.href.startsWith('/blog');
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    [
                      secondary ? 'hidden xl:inline-flex' : 'inline-flex',
                      'items-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition xl:px-3',
                      active
                        ? 'text-graphite underline decoration-graphite/70 decoration-2 underline-offset-[6px]'
                        : 'text-graphite-muted hover:bg-surface-muted hover:text-graphite',
                    ].join(' ')
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <HeaderSearch
              variant="overlay"
              cityFilter={searchCityFilter}
              initialQuery={searchInitialQuery}
              className="hidden lg:inline-flex"
            />

            <div className="hidden items-center gap-1 lg:flex">
              <HeaderAuthControls
                ref={userMenuRef}
                auth={auth}
                isLoggedIn={isLoggedIn}
                userMenuOpen={userMenuOpen}
                onToggleUserMenu={() => setUserMenuOpen((value) => !value)}
                onCloseUserMenu={() => setUserMenuOpen(false)}
              />

              <Link
                href="/help"
                title="Помощь и FAQ"
                aria-label="Помощь и FAQ"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite"
              >
                <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
              </Link>

              <button
                type="button"
                aria-label="Избранное"
                title="Избранное"
                onClick={() => setFavoritesOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite"
              >
                <Heart className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="site-header-spacer" />

      {mobileOpen ? (
        <MobileNavSheet
          pathname={pathname}
          navLinks={navLinks}
          cityLabel={cityLabel}
          cityValue={cityValue}
          destinations={destinations}
          isLoggedIn={isLoggedIn}
          auth={auth}
          searchCityFilter={searchCityFilter}
          searchInitialQuery={searchInitialQuery}
          onClose={() => setMobileOpen(false)}
          onCityChange={onCityChange}
          onOpenFavorites={() => {
            setMobileOpen(false);
            setFavoritesOpen(true);
          }}
        />
      ) : null}
      {favoritesOpen ? <FavoritesPanel onClose={() => setFavoritesOpen(false)} /> : null}
    </>
  );
}

const HeaderAuthControls = forwardRef<
  HTMLDivElement,
  {
    auth: ReturnType<typeof useUserAuthOptional>;
    isLoggedIn: boolean;
    userMenuOpen: boolean;
    onToggleUserMenu: () => void;
    onCloseUserMenu: () => void;
  }
>(function HeaderAuthControls({ auth, isLoggedIn, userMenuOpen, onToggleUserMenu, onCloseUserMenu }, ref) {
  if (isLoggedIn) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-label="Личный кабинет"
          onClick={onToggleUserMenu}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite xl:hidden"
        >
          <User className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onToggleUserMenu}
          className="hidden items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-graphite-muted transition hover:bg-surface-muted hover:text-graphite xl:inline-flex"
        >
          <User className="h-4 w-4" strokeWidth={1.75} />
          {auth?.user?.name || 'Кабинет'}
        </button>
        {userMenuOpen ? (
          <div className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-card bg-white py-1 shadow-card-hover">
            {auth?.user?.name ? (
              <div className="border-b border-slate-100/80 px-3 py-2 text-sm font-medium text-graphite">{auth.user.name}</div>
            ) : null}
            <Link href="/account/purchases" onClick={onCloseUserMenu} className="block px-3 py-2 text-sm text-graphite-muted hover:bg-surface-muted hover:text-graphite">
              Мои покупки
            </Link>
            <button
              type="button"
              onClick={async () => {
                await auth?.logout();
                onCloseUserMenu();
                window.location.href = '/';
              }}
              className="block w-full px-3 py-2 text-left text-sm text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              Выйти
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href="/login?returnUrl=/account/purchases"
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-3.5 text-sm font-semibold text-white transition hover:bg-primary-700"
    >
      <LogIn className="h-4 w-4" strokeWidth={1.75} />
      Войти
    </Link>
  );
});

function MobileNavSheet({
  pathname,
  navLinks,
  cityLabel,
  cityValue,
  destinations,
  isLoggedIn,
  auth,
  searchCityFilter,
  searchInitialQuery,
  onClose,
  onCityChange,
  onOpenFavorites,
}: {
  pathname: string;
  navLinks: Array<{ label: string; href: string }>;
  cityLabel: string;
  cityValue: string;
  destinations: PublicDestinationDto[];
  isLoggedIn: boolean;
  auth: ReturnType<typeof useUserAuthOptional>;
  searchCityFilter?: string;
  searchInitialQuery?: string;
  onClose: () => void;
  onCityChange: (name: string) => void;
  onOpenFavorites: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button type="button" aria-label="Закрыть меню" className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-card-hover">
        <div className="flex items-center justify-between px-4 py-4">
          <DaibiletLogo textClassName="text-xl" />
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-lg p-2 text-graphite-muted hover:bg-surface-muted hover:text-graphite">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <HeaderSearch
            variant="inline"
            cityFilter={searchCityFilter}
            initialQuery={searchInitialQuery}
            className="rounded-xl bg-surface-muted py-2.5"
          />
        </div>
        <nav aria-label="Мобильная навигация" className="flex-1 overflow-y-auto p-2">
          <div>
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`block w-full rounded-lg px-4 py-3 text-left text-base transition ${
                  isNavActive(pathname, item.href.split('?')[0] || item.href)
                    ? 'font-semibold text-graphite bg-surface-muted'
                    : 'font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="my-3 h-px bg-slate-100" />
          <button
            type="button"
            onClick={onOpenFavorites}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
          >
            <Heart className="h-4 w-4" strokeWidth={1.75} />
            Избранное
          </button>
          <Link
            href="/help"
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
            Помощь и FAQ
          </Link>
          <div className="my-3 h-px bg-slate-100" />
          <div className="px-2 py-2">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-graphite-muted">Город</p>
            <CityPicker
              cities={destinations}
              value={cityValue}
              onChange={(name) => {
                onCityChange(name);
                onClose();
              }}
              allLabel={cityLabel === 'Все города' ? 'Все города' : cityLabel}
              variant="compact"
              className="w-full"
            />
          </div>
          <div className="my-3 h-px bg-slate-100" />
          {isLoggedIn ? (
            <>
              {auth?.user?.name ? <div className="px-4 py-2 text-sm text-graphite-muted">{auth.user.name}</div> : null}
              <Link href="/account/purchases" onClick={onClose} className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite">
                <User className="h-4 w-4" strokeWidth={1.75} />
                Мои покупки
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await auth?.logout();
                  onClose();
                  window.location.href = '/';
                }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href="/login?returnUrl=/account/purchases"
              onClick={onClose}
              className="mx-2 mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-primary-700"
            >
              <LogIn className="h-4 w-4" strokeWidth={1.75} />
              Войти
            </Link>
          )}
        </nav>
      </aside>
    </div>
  );
}
