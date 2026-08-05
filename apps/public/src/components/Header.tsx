import * as React from 'react';
import { Heart, HelpCircle, LogIn, Menu, User, X } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker';
import { DaibiletLogo } from '@/components/Logo';
import { publicData } from '@/data';
import { useUserAuthOptional } from '@/hooks/useUserAuth';
import {
  FAVORITES_CHANGED_EVENT,
  readFavoriteIds,
  resolveFavoriteSessions,
  toggleFavoriteId,
} from '@/lib/favorites';
import { formatPriceRub } from '@/lib/event-card-meta';
import { persistDestination } from '@/lib/selected-city';
import { cityHref, eventHref } from '@/routes';
import type { PublicSession } from '@/types';

const NAV_LINKS = [
  { label: 'События', href: '/events' },
  { label: 'Города', href: '/cities' },
  { label: 'Площадки', href: '/venues' },
  { label: 'Локации', href: '/locations' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Блог', href: '/blog' },
] as const;

function isNavActive(href: string): boolean {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const normalized = href.replace(/\/$/, '') || '/';
  if (normalized === '/') return path === '/';
  return path === normalized || path.startsWith(`${normalized}/`);
}

type HeaderProps = {
  cityLabel: string;
  onSection: (section: string) => void;
  onDestination?: (value: string) => void;
  searchQuery?: string;
  searchCity?: string;
};

export function Header({ cityLabel, onSection, onDestination }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [favoritesOpen, setFavoritesOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const auth = useUserAuthOptional();
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const [authMounted, setAuthMounted] = React.useState(false);

  React.useEffect(() => {
    setAuthMounted(true);
  }, []);

  React.useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenuOpen]);

  React.useEffect(() => {
    if (!mobileOpen && !favoritesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [favoritesOpen, mobileOpen]);

  const isLoggedIn = authMounted && Boolean(auth?.isLoggedIn);

  const goHome = () => {
    setMobileOpen(false);
    onSection('top');
  };

  const navigate = (href: string) => {
    setMobileOpen(false);
    setFavoritesOpen(false);
    setUserMenuOpen(false);
    window.location.href = href;
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
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

            <button type="button" onClick={goHome} className="shrink-0 -translate-y-[3px]">
              <DaibiletLogo />
            </button>

            <HeaderCitySelector cityLabel={cityLabel} onDestination={onDestination} onNavigate={navigate} />
          </div>

          <nav aria-label="Основная навигация" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={
                  isNavActive(item.href)
                    ? 'rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary-600'
                    : 'rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100'
                }
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <HeaderAuthControls
              ref={userMenuRef}
              auth={auth}
              isLoggedIn={isLoggedIn}
              userMenuOpen={userMenuOpen}
              onToggleUserMenu={() => setUserMenuOpen((value) => !value)}
              onCloseUserMenu={() => setUserMenuOpen(false)}
              onNavigate={navigate}
            />

            <a
              href="/help"
              title="Помощь и FAQ"
              aria-label="Помощь и FAQ"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              <HelpCircle className="h-5 w-5" />
            </a>

            <button
              type="button"
              aria-label="Избранное"
              onClick={() => setFavoritesOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 lg:hidden"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              className="hidden items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 lg:inline-flex"
            >
              <Heart className="h-4 w-4" />
              Избранное
            </button>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="site-header-spacer" />

      {mobileOpen ? <MobileNavSheet cityLabel={cityLabel} isLoggedIn={isLoggedIn} auth={auth} onClose={() => setMobileOpen(false)} onNavigate={navigate} onDestination={onDestination} /> : null}
      {favoritesOpen ? <FavoritesPanel onClose={() => setFavoritesOpen(false)} onNavigate={navigate} /> : null}
    </>
  );
}

function HeaderCitySelector({
  cityLabel,
  onDestination,
  onNavigate,
  compact = false,
}: {
  cityLabel: string;
  onDestination?: (value: string) => void;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) {
  const value = cityLabel === 'Все города' ? 'all' : cityLabel;

  const selectCity = (name: string) => {
    if (onDestination) {
      onDestination(name);
      return;
    }
    if (name === 'all') {
      persistDestination('all');
      return;
    }
    persistDestination(name);
    const city = publicData.destinations.find((item) => item.name === name);
    if (city) onNavigate(cityHref(city));
  };

  return (
    <CityPicker
      value={value}
      onChange={selectCity}
      allLabel="Фильтр по городу"
      variant={compact ? 'compact' : 'header'}
      className={compact ? 'w-full' : 'hidden lg:block'}
    />
  );
}

const HeaderAuthControls = React.forwardRef<
  HTMLDivElement,
  {
    auth: ReturnType<typeof useUserAuthOptional>;
    isLoggedIn: boolean;
    userMenuOpen: boolean;
    onToggleUserMenu: () => void;
    onCloseUserMenu: () => void;
    onNavigate: (href: string) => void;
  }
>(function HeaderAuthControls({ auth, isLoggedIn, userMenuOpen, onToggleUserMenu, onCloseUserMenu, onNavigate }, ref) {
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
            {auth?.user?.name ? <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-900">{auth.user.name}</div> : null}
            <button type="button" onClick={() => onNavigate('/account/purchases')} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              Мои покупки
            </button>
            <button type="button" onClick={() => onNavigate('/my-orders')} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              Проверить заказ
            </button>
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
      <button
        type="button"
        aria-label="Войти"
        onClick={() => onNavigate('/login?returnUrl=/account/purchases')}
        className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 md:inline-flex lg:hidden"
      >
        <User className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onNavigate('/login?returnUrl=/account/purchases')}
        className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 lg:inline-flex"
      >
        <LogIn className="h-4 w-4" />
        Войти
      </button>
    </>
  );
});

function MobileNavSheet({
  cityLabel,
  isLoggedIn,
  auth,
  onClose,
  onNavigate,
  onDestination,
}: {
  cityLabel: string;
  isLoggedIn: boolean;
  auth: ReturnType<typeof useUserAuthOptional>;
  onClose: () => void;
  onNavigate: (href: string) => void;
  onDestination?: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button type="button" aria-label="Закрыть меню" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <DaibiletLogo iconClassName="h-7 w-7 shrink-0" textClassName="text-xl" />
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Мобильная навигация" className="flex-1 overflow-y-auto p-2">
          {NAV_LINKS.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => onNavigate(item.href)}
              className={`block w-full rounded-lg px-4 py-3 text-left text-base font-medium ${
                isNavActive(item.href) ? 'bg-primary/10 font-semibold text-primary-600' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onNavigate('/help')}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            <HelpCircle className="h-4 w-4" />
            Помощь и FAQ
          </button>
          <div className="my-2 border-t border-slate-200" />
          <HeaderCitySelector cityLabel={cityLabel} onDestination={onDestination} onNavigate={onNavigate} compact />
          <div className="my-2 border-t border-slate-200" />
          {isLoggedIn ? (
            <>
              {auth?.user?.name ? <div className="px-4 py-2 text-sm text-slate-500">{auth.user.name}</div> : null}
              <button type="button" onClick={() => onNavigate('/account/purchases')} className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100">
                <User className="h-4 w-4" />
                Мои покупки
              </button>
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
            <button
              type="button"
              onClick={() => onNavigate('/login?returnUrl=/account/purchases')}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
              Войти
            </button>
          )}
        </nav>
      </aside>
    </div>
  );
}

function FavoritesPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const [favoriteIds, setFavoriteIds] = React.useState(() => readFavoriteIds());
  const [sessions, setSessions] = React.useState<PublicSession[]>(() =>
    resolveFavoriteSessions(readFavoriteIds(), publicData.sessions),
  );

  React.useEffect(() => {
    const sync = () => {
      const ids = readFavoriteIds();
      setFavoriteIds(ids);
      setSessions(resolveFavoriteSessions(ids, publicData.sessions));
    };
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const removeFavorite = (id: string) => {
    toggleFavoriteId(id);
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label="Закрыть избранное" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute right-0 flex h-full w-80 max-w-[90vw] flex-col bg-white p-6 shadow-xl sm:w-96">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-slate-900">
            <Heart className="h-4 w-4 text-rose-500" />
            Избранное
            {favoriteIds.size ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">{favoriteIds.size}</span>
            ) : null}
          </h2>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sessions.length ? (
          <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <li key={session.groupKey || session.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <a href={eventHref(session)} onClick={() => onClose()} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {session.imageUrl ? (
                    <img src={session.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-lg">🎫</div>
                  )}
                </a>
                <div className="min-w-0 flex-1">
                  <a
                    href={eventHref(session)}
                    onClick={() => onClose()}
                    className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-primary-700"
                  >
                    {session.title}
                  </a>
                  <p className="mt-1 truncate text-xs text-slate-500">{session.city || 'Город не указан'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    {session.priceFrom ? `от ${formatPriceRub(session.priceFrom)} ₽` : 'Цена уточняется'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Убрать из избранного"
                  onClick={() => removeFavorite(session.id)}
                  className="shrink-0 self-start rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            <Heart className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="font-medium text-slate-700">Пока пусто</p>
            <p className="mt-1">Отмечайте события сердечком на карточках — они появятся здесь. Список хранится в браузере на этом устройстве.</p>
            <button
              type="button"
              onClick={() => onNavigate('/events')}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
            >
              Перейти к событиям
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
