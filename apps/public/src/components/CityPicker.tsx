import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MapPin } from 'lucide-react';

import { hydratePublicDestinations, publicData, PUBLIC_DESTINATIONS_UPDATED_EVENT } from '@/data';
import type { PublicDestination } from '@/types';

type CityPickerVariant = 'hero' | 'header' | 'compact';

type CityPickerProps = {
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  variant?: CityPickerVariant;
  className?: string;
};

const MENU_MAX_HEIGHT = 360;

function pickCityDestinations(): PublicDestination[] {
  return publicData.destinations
    .filter((item) => item.type === 'city')
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'));
}

export function CityPicker({
  value,
  onChange,
  allLabel = 'Все города',
  variant = 'hero',
  className = '',
}: CityPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({ visibility: 'hidden' });
  const [cities, setCities] = React.useState<PublicDestination[]>(pickCityDestinations);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const refreshCities = React.useCallback(() => {
    setCities(pickCityDestinations());
  }, []);

  React.useEffect(() => {
    refreshCities();
    const onUpdate = () => refreshCities();
    window.addEventListener(PUBLIC_DESTINATIONS_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(PUBLIC_DESTINATIONS_UPDATED_EVENT, onUpdate);
  }, [refreshCities]);

  React.useEffect(() => {
    if (!open) return;
    if (cities.length >= 8) return;
    void hydratePublicDestinations().then((updated) => {
      if (updated) refreshCities();
    });
  }, [open, cities.length, refreshCities]);

  const selectedLabel = value === 'all' ? allLabel : value;
  const isAllSelected = value === 'all';

  const updatePosition = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = variant === 'compact' ? rect.width : Math.max(rect.width, 256);
    const left = variant === 'compact' ? rect.left : rect.left;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    if (openUp) {
      const maxHeight = Math.min(MENU_MAX_HEIGHT, spaceAbove);
      setMenuStyle({
        position: 'fixed',
        left,
        width: menuWidth,
        bottom: window.innerHeight - rect.top + 4,
        maxHeight,
        visibility: 'visible',
      });
      return;
    }

    setMenuStyle({
      position: 'fixed',
      left,
      width: menuWidth,
      top: rect.bottom + 4,
      maxHeight: Math.min(MENU_MAX_HEIGHT, spaceBelow),
      visibility: 'visible',
    });
  }, [variant]);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectCity = (name: string) => {
    setOpen(false);
    onChange(name);
  };

  const toggleOpen = () => {
    setOpen((current) => {
      if (current) return false;
      refreshCities();
      setMenuStyle({ visibility: 'hidden' });
      return true;
    });
  };

  const buttonClassName =
    variant === 'hero'
      ? 'relative h-11 w-full rounded-xl bg-slate-50 pl-10 pr-8 text-left text-sm font-medium text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/25'
      : variant === 'compact'
        ? 'relative flex w-full items-center gap-2 rounded-lg px-4 py-3 pr-10 text-left text-base font-medium text-slate-700 hover:bg-slate-100'
        : 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100';

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="z-[120] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          role="listbox"
          aria-label="Города"
        >
          <ul>
            <li>
              <button
                type="button"
                role="option"
                aria-selected={isAllSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCity('all')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                  isAllSelected ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {allLabel}
                </span>
                {isAllSelected ? <Check className="h-4 w-4 text-primary-600" /> : null}
              </button>
            </li>
            {cities.map((city) => {
              const active = value === city.name;
              return (
                <li key={city.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCity(city.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                      active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{city.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">· {city.events}</span>
                    </span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-primary-600" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`relative ${className}`}>
      <MapPin
        className={`pointer-events-none absolute text-slate-400 ${
          variant === 'hero' ? 'left-3 top-1/2 h-4 w-4 -translate-y-1/2' : variant === 'compact' ? 'left-4 top-1/2 h-4 w-4 -translate-y-1/2' : 'hidden'
        }`}
      />
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Выбрать город: ${selectedLabel}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggleOpen}
        className={buttonClassName}
      >
        {variant === 'header' ? <MapPin className="h-4 w-4 shrink-0" /> : null}
        <span className={variant === 'header' ? 'truncate' : 'block truncate'}>{selectedLabel}</span>
        {variant === 'hero' || variant === 'compact' ? (
          <ChevronDown
            className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-slate-400 transition ${
              open ? 'rotate-180' : ''
            } ${variant === 'compact' ? 'right-4' : ''}`}
          />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {menu}
    </div>
  );
}
