import * as React from 'react';
import { ChevronDown, Compass, Heart, HelpCircle, MapPin, Menu, Search, X } from 'lucide-react';

import { publicData } from '@/data';

const navigation = [
  { label: 'Экскурсии', href: '/events?category=Экскурсии' },
  { label: 'Музеи и арт', href: '/events?category=Музеи+и+арт' },
  { label: 'Мероприятия', href: '/events?category=Мероприятия' },
  { label: 'Активный отдых', href: '/events?category=Активный+отдых' },
  { label: 'Подборки', section: 'landings' },
  { label: 'Города', section: 'cities' },
  { label: 'Мои заказы', section: 'orders' },
];

type HeaderProps = {
  cityLabel: string;
  search: string;
  onSearch: (value: string) => void;
  onSection: (section: string) => void;
  onDestination?: (value: string) => void;
};

export function Header({ cityLabel, search, onSearch, onSection, onDestination }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const go = (itemOrSection: string | { section?: string; href?: string }) => {
    setMobileOpen(false);
    if (typeof itemOrSection !== 'string' && itemOrSection.href) {
      window.location.href = itemOrSection.href;
      return;
    }
    const section = typeof itemOrSection === 'string' ? itemOrSection : itemOrSection.section || 'top';
    if (section === 'orders') {
      window.location.href = '/my-orders';
      return;
    }
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

          <label className="hidden h-10 min-w-[200px] items-center gap-2 rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-primary-300 xl:flex">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Поиск"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>

          <button className="relative hidden items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-500 sm:inline-flex" type="button" title="Избранное">
            <Heart className="h-5 w-5" />
          </button>
          <a className="hidden items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:inline-flex" href="mailto:hello@daibilet.ru" title="Помощь">
            <HelpCircle className="h-5 w-5" />
          </a>

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
            <label className="mb-3 flex h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-primary-300">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Поиск события, площадки или города"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
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
          </div>
        </div>
      ) : null}
    </header>
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
