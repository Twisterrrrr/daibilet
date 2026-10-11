'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  Menu,
  MessageSquareQuote,
  Receipt,
  Settings,
  Users,
  X,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/admin/events', label: 'События', icon: CalendarDays },
  { href: '/admin/orders', label: 'Заказы', icon: Receipt },
  { href: '/admin/buyers', label: 'Покупатели', icon: Users },
  { href: '/admin/venues', label: 'Площадки', icon: Building2 },
  { href: '/admin/cities', label: 'Города', icon: MapPin },
  { href: '/admin/landings', label: 'Лендинги', icon: LayoutTemplate },
  { href: '/admin/reviews', label: 'Отзывы', icon: MessageSquareQuote },
  { href: '/admin/change-requests', label: 'ECR', icon: ClipboardList },
  { href: '/admin/articles', label: 'Блог', icon: BookOpen },
  { href: '/admin/hero-banners', label: 'Hero', icon: ImageIcon },
  { href: '/admin/sources', label: 'Источники', icon: Download },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
  itemClassName,
}: {
  pathname: string;
  onNavigate?: () => void;
  itemClassName?: string;
}) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            } ${itemClassName || ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

type Props = {
  children: ReactNode;
};

export function AdminNextShell({ children }: Props) {
  const pathname = usePathname() || '/admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const current = NAV.find((item) => isActivePath(pathname, item.href));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Daibilet</p>
          <p className="text-sm font-semibold text-slate-900">Админка</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Разделы админки">
          <NavLinks pathname={pathname} />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500 md:hidden">Daibilet · Админка</p>
              <h1 className="truncate text-base font-semibold text-slate-900">
                {current?.label || 'Админка'}
              </h1>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 md:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {menuOpen ? (
            <nav
              className="mt-2 flex flex-col gap-0.5 border-t border-slate-100 pt-2 md:hidden"
              aria-label="Разделы админки"
            >
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </nav>
          ) : null}
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
