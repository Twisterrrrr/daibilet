'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, HelpCircle, LogIn, User } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import { CityPicker } from '@/components/CityPicker.client';
import { DaibiletLogo } from '@/components/DaibiletLogo';
import { DayRouteBadge } from '@/components/DayRouteBadge.client';
import { FavoritesPanel } from '@/components/FavoritesPanel.client';
import { HeaderSearch } from '@/components/HeaderSearch.client';
import { MobileNavLayer, MobileNavTrigger, useMobileNavId } from '@/components/MobileNavMenu.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { useUserAuthOptional } from '@/hooks/useUserAuth';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { FAVORITES_CHANGED_EVENT, readFavoriteIds } from '@/lib/favorites';
import { PLACE_FAVORITES_CHANGED_EVENT, readPlaceFavorites } from '@/lib/place-favorites';
import { cityHref } from '@/lib/routes';

/** Primary IA: Афиша · Город · Подборки · Блог. Места stay in footer / secondary. */
const NAV_LINKS = [
  { label: 'Афиша', href: '/events', catalog: true },
  { label: 'Город', href: '/cities', cityHub: true },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Блог', href: '/blog' },
] as const;

function isNavActive(pathname: string, href: string, label?: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const normalized = href.replace(/\/$/, '').split('?')[0] || '/';
  if (normalized === '/') return path === '/';
  if (label === 'Афиша') {
    return path === '/events' || path.startsWith('/events/');
  }
  if (label === 'Город') {
    return path === '/cities' || path.startsWith('/cities/');
  }
  return path === normalized || path.startsWith(`${normalized}/`);
}

type SiteHeaderProps = {
  destinations?: PublicDestinationDto[];
};

export function SiteHeader({ destinations = [] }: SiteHeaderProps) {
  const pathname = usePathname();
  const mobileNavId = useMobileNavId();
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authMounted, setAuthMounted] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const auth = useUserAuthOptional();
  const selectedCity = useSelectedCityOptional();

  useEffect(() => {
    setAuthMounted(true);
  }, []);

  // Avoid useSearchParams here: it CSR-bailouts the whole SiteLayout tree.
  useEffect(() => {
    if (!pathname.startsWith('/events')) {
      setSearchInitialQuery('');
      return;
    }
    setSearchInitialQuery(new URLSearchParams(window.location.search).get('q') || '');
  }, [pathname]);

  const cityLabel = selectedCity?.cityLabel ?? 'Все города';
  const cityValue = selectedCity?.cityValue ?? 'all';
  const cityReady = selectedCity?.cityReady ?? false;
  const cityQuery =
    cityReady && cityValue !== 'all'
      ? selectedCity?.selectedDestination?.slug || cityValue
      : 'all';
  const onCityChange = selectedCity?.setCity ?? (() => undefined);
  const navLinks = NAV_LINKS.map((item) => {
    if ('catalog' in item && item.catalog) {
      return { ...item, href: catalogHrefWithSelectedCity(cityQuery) };
    }
    if ('cityHub' in item && item.cityHub) {
      const dest = selectedCity?.selectedDestination;
      if (cityReady && dest?.slug) {
        return { ...item, href: cityHref(dest) };
      }
      return { ...item, href: '/cities' };
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
    if (!favoritesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [favoritesOpen]);

  const isLoggedIn = authMounted && Boolean(auth?.isLoggedIn);
  const searchCityFilter = cityValue !== 'all' ? cityValue : undefined;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_hsl(210_9%_11%/0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        {/* Same width as page content (.container-page). */}
        <div className="container-page relative flex min-h-[var(--site-header-height)] items-center justify-between py-2.5 sm:py-3 lg:py-3.5">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 sm:gap-3 lg:flex-none lg:gap-6 xl:gap-8">
            {/* Mobile: burger left (owner); desktop nav stays centered. */}
            <div className="lg:hidden">
              <MobileNavTrigger id={mobileNavId} />
            </div>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center overflow-visible"
              aria-label="Дайбилет"
            >
              <DaibiletLogo textClassName="text-lg sm:text-xl lg:text-2xl" />
            </Link>
            {/* City next to logo (desktop); modest gap, not flush. */}
            <CityPicker
              cities={destinations}
              value={cityValue}
              onChange={onCityChange}
              allLabel="Город"
              variant="header"
              className="hidden shrink-0 lg:block lg:min-w-0 lg:max-w-[13rem] xl:max-w-[15rem]"
            />
          </div>

          <nav
            aria-label="Основная навигация"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-[var(--header-menu-gap)] lg:flex"
          >
            {navLinks.map((item) => {
              const active = isNavActive(pathname, item.href, item.label);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    [
                      'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition xl:px-3.5',
                      active
                        ? 'bg-surface-muted text-graphite shadow-[inset_0_0_0_1px_hsl(210_9%_11%/0.08)]'
                        : 'text-graphite-muted hover:bg-surface-muted/70 hover:text-graphite',
                    ].join(' ')
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-[var(--header-icons-gap)]">
            {/* Mobile: city stays with actions (desktop city is by logo). */}
            <CityPicker
              cities={destinations}
              value={cityValue}
              onChange={onCityChange}
              allLabel="Город"
              variant="header"
              className="shrink-0 lg:hidden"
            />

            <HeaderSearch
              variant="overlay"
              cityFilter={searchCityFilter}
              initialQuery={searchInitialQuery}
            />

            <DayRouteBadge />
            <FavoritesHeaderButton onClick={() => setFavoritesOpen(true)} />

            <div className="hidden items-center gap-[var(--header-icons-gap)] lg:flex">
              <Link
                href="/help"
                title="Помощь и FAQ"
                aria-label="Помощь и FAQ"
                className="site-header-icon-link h-10 w-10"
              >
                <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
              </Link>

              <HeaderAuthControls
                ref={userMenuRef}
                auth={auth}
                isLoggedIn={isLoggedIn}
                userMenuOpen={userMenuOpen}
                onToggleUserMenu={() => setUserMenuOpen((value) => !value)}
                onCloseUserMenu={() => setUserMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="site-header-spacer" />

      {/* Outside header: fixed sheet must not sit under backdrop-filter containing block. */}
      <MobileNavLayer
        id={mobileNavId}
        navLinks={navLinks}
        cityLabel={cityLabel}
        cityValue={cityValue}
        destinations={destinations}
        isLoggedIn={isLoggedIn}
        auth={auth}
        searchCityFilter={searchCityFilter}
        searchInitialQuery={searchInitialQuery}
        onCityChange={onCityChange}
        onOpenFavorites={() => setFavoritesOpen(true)}
      />

      {favoritesOpen ? <FavoritesPanel onClose={() => setFavoritesOpen(false)} /> : null}
    </>
  );
}

function FavoritesHeaderButton({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readFavoriteIds().size + readPlaceFavorites().length);
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener(PLACE_FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener(PLACE_FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={count ? `Избранное, ${count}` : 'Избранное'}
      title="Избранное"
      data-favorites-count={count}
      onClick={onClick}
      className="site-header-icon-link relative h-10 w-10 shrink-0"
    >
      <Heart className="h-5 w-5" strokeWidth={1.75} />
      {count > 0 ? (
        <span
          data-favorites-badge
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white"
        >
          {count}
        </span>
      ) : null}
    </button>
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
