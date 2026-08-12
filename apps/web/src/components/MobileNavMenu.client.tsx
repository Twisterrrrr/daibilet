'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, HelpCircle, LogIn, Menu, Route, User, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { CityPicker } from '@/components/CityPicker.client';
import { DaibiletLogo } from '@/components/DaibiletLogo';
import { HeaderSearch } from '@/components/HeaderSearch.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import type { useUserAuthOptional } from '@/hooks/useUserAuth';

type MobileNavMenuProps = {
  navLinks: Array<{ label: string; href: string }>;
  cityLabel: string;
  cityValue: string;
  destinations: PublicDestinationDto[];
  isLoggedIn: boolean;
  auth: ReturnType<typeof useUserAuthOptional>;
  searchCityFilter?: string;
  searchInitialQuery?: string;
  onCityChange: (name: string) => void;
  onOpenFavorites: () => void;
};

/**
 * Thin mobile-nav island split into trigger (in header) + layer (sibling of
 * header, outside backdrop-blur). Opens via native checkbox from SSR HTML
 * before React hydrates.
 */
export function useMobileNavId() {
  const reactId = useId();
  return `mobile-nav-${reactId.replace(/:/g, '')}`;
}

export function MobileNavTrigger({ id }: { id: string }) {
  return (
    <label
      htmlFor={id}
      aria-label="Открыть меню"
      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-graphite transition hover:bg-surface-muted lg:hidden"
    >
      <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </label>
  );
}

export function MobileNavLayer({
  id,
  navLinks,
  cityLabel,
  cityValue,
  destinations,
  isLoggedIn,
  auth,
  searchCityFilter,
  searchInitialQuery,
  onCityChange,
  onOpenFavorites,
}: MobileNavMenuProps & { id: string }) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const syncOverflow = () => {
      document.body.style.overflow = input.checked ? 'hidden' : '';
    };
    syncOverflow();
    input.addEventListener('change', syncOverflow);
    return () => {
      input.removeEventListener('change', syncOverflow);
      document.body.style.overflow = '';
    };
  }, []);

  const close = () => {
    if (inputRef.current) inputRef.current.checked = false;
    document.body.style.overflow = '';
  };

  return (
    <div className="lg:hidden">
      <input ref={inputRef} id={id} type="checkbox" className="peer sr-only" />
      <div
        className="pointer-events-none invisible fixed inset-0 z-[60] opacity-0 transition-opacity duration-150 peer-checked:pointer-events-auto peer-checked:visible peer-checked:opacity-100"
        role="dialog"
        aria-modal="true"
        aria-label="Мобильная навигация"
      >
        <label
          htmlFor={id}
          aria-label="Закрыть меню"
          className="absolute inset-0 cursor-pointer bg-slate-900/45 backdrop-blur-[2px]"
        />
        <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-card-hover">
          <div className="flex items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="inline-flex items-center overflow-visible"
              aria-label="Дайбилет"
              onClick={close}
            >
              <DaibiletLogo textClassName="text-xl" />
            </Link>
            <label
              htmlFor={id}
              aria-label="Закрыть"
              className="cursor-pointer rounded-lg p-2 text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </label>
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
            <div className="px-2 py-1">
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-graphite-muted">
                Фильтр по городу
              </p>
              <CityPicker
                cities={destinations}
                value={cityValue}
                onChange={(name) => {
                  onCityChange(name);
                  close();
                }}
                allLabel={
                  cityLabel === 'Все города' || cityLabel === 'Фильтр по городу'
                    ? 'Фильтр по городу'
                    : cityLabel
                }
                variant="compact"
                className="w-full"
              />
            </div>
            <div className="my-3 h-px bg-slate-100" />
            <div>
              {navLinks.map((item) => (
                <NavLink
                  key={item.label}
                  href={item.href}
                  active={isNavActive(pathname, item.href.split('?')[0] || item.href)}
                  onClick={close}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="my-3 h-px bg-slate-100" />
            <Link
              href="/my-day"
              onClick={close}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <Route className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Мой день
            </Link>
            <button
              type="button"
              onClick={() => {
                close();
                onOpenFavorites();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <Heart className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Избранное
            </button>
            <Link
              href="/help"
              onClick={close}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Помощь и FAQ
            </Link>
            <div className="my-3 h-px bg-slate-100" />
            {isLoggedIn ? (
              <>
                {auth?.user?.name ? (
                  <div className="px-4 py-2 text-sm text-graphite-muted">{auth.user.name}</div>
                ) : null}
                <Link
                  href="/account/purchases"
                  onClick={close}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
                >
                  <User className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Мои покупки
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await auth?.logout();
                    close();
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
                onClick={close}
                className="mx-2 mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-primary-700"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Войти
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </div>
  );
}

function isNavActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const normalized = href.replace(/\/$/, '') || '/';
  if (normalized === '/') return path === '/';
  return path === normalized || path.startsWith(`${normalized}/`);
}

function NavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block w-full rounded-lg px-4 py-3 text-left text-base transition ${
        active
          ? 'bg-surface-muted font-semibold text-graphite'
          : 'font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite'
      }`}
    >
      {children}
    </Link>
  );
}
