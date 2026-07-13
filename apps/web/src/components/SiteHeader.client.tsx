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

const NAV_LINKS = [
  { label: 'События', href: '/events' },
  { label: 'Города', href: '/cities' },
  { label: 'Площадки', href: '/venues' },
  { label: 'Локации', href: '/locations' },
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
  const onCityChange = selectedCity?.setCity ?? (() => undefined);

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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="container-page flex items-center justify-between gap-3 py-3 md:py-4">
          <div className="flex min-w-0 items-center gap-3 lg:gap-6">
            <button
              type="button"
              aria-label="Открыть меню"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="shrink-0">
              <DaibiletLogo />
            </Link>

            <CityPicker
              cities={destinations}
              value={cityValue}
              onChange={onCityChange}
              allLabel="Все города"
              variant="header"
              className="hidden shrink-0 lg:block"
            />
          </div>

          <nav aria-label="Основная навигация" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? 'rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary-600'
                      : 'rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100'
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <HeaderSearch
            variant="overlay"
            cityFilter={searchCityFilter}
            initialQuery={searchInitialQuery}
            className="hidden lg:inline-flex"
          />

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
              className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              <HelpCircle className="h-5 w-5" />
            </Link>

            <button
              type="button"
              aria-label="Избранное"
              title="Избранное"
              onClick={() => setFavoritesOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="site-header-spacer" />

      {mobileOpen ? (
        <MobileNavSheet
          pathname={pathname}
          cityLabel={cityLabel}
          cityValue={cityValue}
          destinations={destinations}
          isLoggedIn={isLoggedIn}
          auth={auth}
          searchCityFilter={searchCityFilter}
          searchInitialQuery={searchInitialQuery}
          onClose={() => setMobileOpen(false)}
          onCityChange={onCityChange}
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
          className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 md:inline-flex lg:hidden"
        >
          <User className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleUserMenu}
          className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 lg:inline-flex"
        >
          <User className="h-4 w-4" />
          {auth?.user?.name || 'Кабинет'}
        </button>
        {userMenuOpen ? (
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {auth?.user?.name ? (
              <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-900">{auth.user.name}</div>
            ) : null}
            <Link href="/account/purchases" onClick={onCloseUserMenu} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Мои покупки
            </Link>
            <Link href="/my-orders" onClick={onCloseUserMenu} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Проверить заказ
            </Link>
            <button
              type="button"
              onClick={async () => {
                await auth?.logout();
                onCloseUserMenu();
                window.location.href = '/';
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              Выйти
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login?returnUrl=/account/purchases"
        aria-label="Войти"
        className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 md:inline-flex lg:hidden"
      >
        <User className="h-5 w-5" />
      </Link>
      <Link
        href="/login?returnUrl=/account/purchases"
        className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 lg:inline-flex"
      >
        <LogIn className="h-4 w-4" />
        Войти
      </Link>
    </>
  );
});

function MobileNavSheet({
  pathname,
  cityLabel,
  cityValue,
  destinations,
  isLoggedIn,
  auth,
  searchCityFilter,
  searchInitialQuery,
  onClose,
  onCityChange,
}: {
  pathname: string;
  cityLabel: string;
  cityValue: string;
  destinations: PublicDestinationDto[];
  isLoggedIn: boolean;
  auth: ReturnType<typeof useUserAuthOptional>;
  searchCityFilter?: string;
  searchInitialQuery?: string;
  onClose: () => void;
  onCityChange: (name: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button type="button" aria-label="Закрыть меню" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <DaibiletLogo textClassName="text-xl" />
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-slate-200 px-4 py-3">
          <HeaderSearch
            variant="inline"
            cityFilter={searchCityFilter}
            initialQuery={searchInitialQuery}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5"
          />
        </div>
        <nav aria-label="Мобильная навигация" className="flex-1 overflow-y-auto p-2">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`block w-full rounded-lg px-4 py-3 text-left text-base font-medium ${
                isNavActive(pathname, item.href) ? 'bg-primary/10 font-semibold text-primary-600' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/help"
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            <HelpCircle className="h-4 w-4" />
            Помощь и FAQ
          </Link>
          <div className="my-2 border-t border-slate-200" />
          <div className="px-2 py-2">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Город</p>
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
          <div className="my-2 border-t border-slate-200" />
          {isLoggedIn ? (
            <>
              {auth?.user?.name ? <div className="px-4 py-2 text-sm text-slate-500">{auth.user.name}</div> : null}
              <Link href="/account/purchases" onClick={onClose} className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100">
                <User className="h-4 w-4" />
                Мои покупки
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await auth?.logout();
                  onClose();
                  window.location.href = '/';
                }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-rose-600 hover:bg-rose-50"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href="/login?returnUrl=/account/purchases"
              onClick={onClose}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
              Войти
            </Link>
          )}
        </nav>
      </aside>
    </div>
  );
}
