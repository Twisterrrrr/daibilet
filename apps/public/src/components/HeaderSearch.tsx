import * as React from 'react';
import { Search } from 'lucide-react';

import { API_BASE_URL } from '@/lib/api-base';

type SearchItem = {
  type: 'event' | 'city' | 'landing';
  label: string;
  sublabel?: string | null;
  href: string;
  imageUrl?: string | null;
};

type HeaderSearchProps = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  initialQuery?: string;
  cityFilter?: string;
};

export function HeaderSearch({
  className = '',
  inputClassName = '',
  placeholder = 'Поиск',
  initialQuery = '',
  cityFilter,
}: HeaderSearchProps) {
  const [query, setQuery] = React.useState(initialQuery);
  const [items, setItems] = React.useState<SearchItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  React.useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setItems([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    window.clearTimeout(debounceRef.current ?? undefined);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: normalized });
        if (cityFilter && cityFilter !== 'all') params.set('city', cityFilter);
        const response = await fetch(`${API_BASE_URL}/api/public/search?${params.toString()}`);
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: SearchItem[] };
        setItems(payload.items || []);
        setOpen(Boolean(payload.items?.length));
        setActiveIndex(-1);
      } catch {
        setItems([]);
        setOpen(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [cityFilter, query]);

  const navigate = (href: string) => {
    setOpen(false);
    setActiveIndex(-1);
    window.location.href = href;
  };

  const submit = (value?: string) => {
    const normalized = (value ?? query).trim();
    navigate(normalized ? `/events?q=${encodeURIComponent(normalized)}` : '/events');
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) navigate(items[activeIndex].href);
      else submit();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!items.length) return;
      setOpen(true);
      setActiveIndex((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!items.length) return;
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full bg-transparent pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${inputClassName}`}
        aria-label="Поиск событий"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />
      {open && items.length ? (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {items.map((item, index) => (
            <li key={`${item.type}:${item.href}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigate(item.href)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  index === activeIndex ? 'bg-primary-50' : 'hover:bg-slate-50'
                }`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold uppercase text-slate-500">
                    {item.type === 'city' ? 'Г' : item.type === 'landing' ? 'П' : 'E'}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{item.label}</span>
                  {item.sublabel ? <span className="block truncate text-xs text-slate-500">{item.sublabel}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
