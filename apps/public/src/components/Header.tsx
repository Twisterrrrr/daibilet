import * as React from 'react';
import { ChevronDown, CircleUser, Compass, HelpCircle, MapPin, Menu, Search, X } from 'lucide-react';

import { publicData } from '@/data';
import { useUserAuthOptional } from '@/hooks/useUserAuth';
import { HeaderSearch } from '@/components/HeaderSearch';

const navigation = [
  { label: 'Каталог', href: '/events' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Города', href: '/cities' },
  { label: 'Площадки', href: '/venues' },
];

type HeaderProps = {
  cityLabel: string;
  onSection: (section: string) => void;
  onDestination?: (value: string) => void;
  searchQuery?: string;
  searchCity?: string;
};

export function Header({ cityLabel, onSection, onDestination, searchQuery, searchCity }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
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

  const isLoggedIn = authMounted && Boolean(auth?.isLoggedIn);

  const go = (itemOrSection: string | { section?: string; href?: string }) => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    if (typeof itemOrSection !== 'string' && itemOrSection.href) {
      window.location.href = itemOrSection.href;
      return;
    }
    const section = typeof itemOrSection === 'string' ? itemOrSection : itemOrSection.section || 'top';
    onSection(section);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="container-page flex h-16 min-w-0 items-center justify-between gap-2">
        <button type="button" onClick={() => go('top')} className="flex flex-shrink-0 items-center gap-2">
          <Compass className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-slate-900">
            Дай<span className="text-primary-600">билет</span>
          </span>
        </button>

        <div className="hidden min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => go(item)}
              className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <HeaderCitySelect label={cityLabel} onDestination={onDestination} onOpenDestinations={() => go('destinations')} />

          <label className="hidden h-10 min-w-[200px] items-center rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-primary-300 xl:flex">
            <HeaderSearch className="min-w-0 flex-1 py-2" initialQuery={searchQuery} cityFilter={searchCity || (cityLabel !== 'Все города' ? cityLabel : undefined)} />
          </label>

          <a className="hidden items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:inline-flex" href="/help" title="Помощь">
            <HelpCircle className="h-5 w-5" />
          </a>

          <HeaderUserMenu
            ref={userMenuRef}
            auth={auth}
            isLoggedIn={isLoggedIn}
            open={userMenuOpen}
            onToggle={() => setUserMenuOpen((value) => !value)}
            onClose={() => setUserMenuOpen(false)}
          />

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Меню"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-page space-y-1 py-3">
            <label className="mb-3 flex h-11 items-center rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-primary-300">
              <HeaderSearch
                className="min-w-0 flex-1 py-2"
                placeholder="Поиск события, площадки или города"
                initialQuery={searchQuery}
                cityFilter={searchCity || (cityLabel !== 'Все города' ? cityLabel : undefined)}
              />
            </label>
            {navigation.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => go(item)}
                className="block w-full whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => go('destinations')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <MapPin className="h-5 w-5" />
              {cityLabel}
            </button>
            <HeaderUserMobile auth={auth} isLoggedIn={isLoggedIn} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </header>
  );
}

const HeaderUserMenu = React.forwardRef<
  HTMLDivElement,
  {
    auth: ReturnType<typeof useUserAuthOptional>;
    isLoggedIn: boolean;
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
  }
>(function HeaderUserMenu({ auth, isLoggedIn, open, onToggle, onClose }, ref) {
  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={onToggle}
        className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-600"
        title={isLoggedIn ? auth?.user?.name || 'Мои покупки' : 'Проверить заказ'}
        aria-label={isLoggedIn ? 'Личный кабинет' : 'Проверить заказ'}
      >
        <CircleUser className="h-5 w-5" />
        {isLoggedIn ? <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {isLoggedIn && auth?.user?.name ? (
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-900">{auth.user.name}</div>
          ) : null}
          <a href="/my-orders" onClick={onClose} className="block px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">
            Проверить заказ
          </a>
          {isLoggedIn ? (
            <>
              <a href="/account/purchases" onClick={onClose} className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Мои покупки
              </a>
              <button
                type="button"
                onClick={async () => {
                  await auth?.logout();
                  onClose();
                  window.location.href = '/';
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                Выйти
              </button>
            </>
          ) : (
            <div className="border-t border-slate-100 px-3 py-2">
              <a
                href="/login?returnUrl=/account/purchases"
                onClick={onClose}
                className="block text-xs leading-5 text-slate-500 hover:text-primary-700"
              >
                Войти — сохранить историю покупок на email
              </a>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
});

function HeaderUserMobile({
  auth,
  isLoggedIn,
  onNavigate,
}: {
  auth: ReturnType<typeof useUserAuthOptional>;
  isLoggedIn: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1 border-t border-slate-100 pt-3">
      <a
        href="/my-orders"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-slate-900 hover:bg-slate-100"
      >
        <CircleUser className="h-5 w-5 text-primary-600" />
        Проверить заказ
      </a>
      {isLoggedIn ? (
        <>
          {auth?.user?.name ? <div className="px-3 text-sm text-slate-500">{auth.user.name}</div> : null}
          <a href="/account/purchases" onClick={onNavigate} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Мои покупки
          </a>
          <button
            type="button"
            onClick={async () => {
              await auth?.logout();
              onNavigate();
              window.location.href = '/';
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Выйти
          </button>
        </>
      ) : (
        <a
          href="/login?returnUrl=/account/purchases"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-primary-700"
        >
          Войти — история покупок на email
        </a>
      )}
    </div>
  );
}

function HeaderCitySelect({
  label,
  onDestination,
  onOpenDestinations,
}: {
  label: string;
  onDestination?: (value: string) => void;
  onOpenDestinations: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const cities = React.useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const items = publicData.destinations.filter((item) => item.type === 'city');
    if (!normalized) return items.sort((a, b) => b.events - a.events).slice(0, 8);
    return items.filter((city) => city.name.toLowerCase().includes(normalized)).slice(0, 8);
  }, [search]);

  if (!onDestination) {
    return (
      <button
        type="button"
        onClick={onOpenDestinations}
        className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:flex"
      >
        <MapPin className="h-4 w-4 text-primary-500" />
        <span className="max-w-[120px] truncate">{label}</span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        <MapPin className="h-4 w-4 text-primary-500" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск города..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onDestination('all');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Все города
            </button>
            {cities.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => {
                  onDestination(city.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="truncate">{city.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{city.events}</span>
              </button>
            ))}
            {cities.length === 0 ? <p className="px-3 py-4 text-center text-sm text-slate-500">Ничего не найдено</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
