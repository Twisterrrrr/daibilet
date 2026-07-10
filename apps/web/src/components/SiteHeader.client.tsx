'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DaibiletLogo } from '@/components/DaibiletLogo';

const NAV_LINKS = [
  { label: 'События', href: '/events' },
  { label: 'Города', href: '/cities' },
  { label: 'Площадки', href: '/venues' },
  { label: 'Локации', href: '/locations' },
  { label: 'Подборки', href: '/podborki' },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const normalized = href.replace(/\/$/, '') || '/';
  if (normalized === '/') return path === '/';
  return path === normalized || path.startsWith(`${normalized}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

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

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/events"
              title="Каталог событий"
              className="hidden items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 sm:inline-flex"
            >
              Каталог
            </Link>
            <Link
              href="/podborki"
              title="Подборки"
              aria-label="Подборки"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 sm:hidden"
            >
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="site-header-spacer" />

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <DaibiletLogo textClassName="text-xl" />
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Мобильная навигация" className="flex-1 overflow-y-auto p-2">
              {NAV_LINKS.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block w-full rounded-lg px-4 py-3 text-left text-base font-medium ${
                      active
                        ? 'bg-primary/10 font-semibold text-primary-600'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/events"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block w-full rounded-lg bg-primary-600 px-4 py-3 text-center text-base font-semibold text-white hover:bg-primary-700"
              >
                Открыть каталог
              </Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
