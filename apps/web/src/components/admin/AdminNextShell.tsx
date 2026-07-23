'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  MessageSquareQuote,
  Receipt,
  Settings,
  Users,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  ready?: boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, ready: true },
  { href: '/admin/events', label: 'События', icon: CalendarDays, ready: true },
  { href: '/admin/orders', label: 'Заказы', icon: Receipt, ready: true },
  { href: '/admin/buyers', label: 'Покупатели', icon: Users, ready: true },
  { href: '/admin/venues', label: 'Площадки', icon: Building2, ready: true },
  { href: '/admin/cities', label: 'Города', icon: MapPin, ready: true },
  { href: '/admin/landings', label: 'Лендинги', icon: LayoutTemplate, ready: true },
  { href: '/admin/reviews', label: 'Отзывы', icon: MessageSquareQuote, ready: true },
  { href: '/admin/change-requests', label: 'ECR', icon: ClipboardList, ready: true },
  { href: '/admin/articles', label: 'Блог', icon: BookOpen, ready: true },
  { href: '/admin/sources', label: 'Источники', icon: Download, ready: true },
  { href: '/admin/settings', label: 'Настройки', icon: Settings, ready: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  children: ReactNode;
};

export function AdminNextShell({ children }: Props) {
  const pathname = usePathname() || '/admin';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Daibilet</p>
          <p className="text-sm font-semibold text-slate-900">Admin Next (F4)</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Админка">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.ready ? item.href : '/admin'}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                } ${item.ready ? '' : 'opacity-60'}`}
                aria-current={active ? 'page' : undefined}
                title={item.ready ? undefined : 'Экран ещё не готов'}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {!item.ready ? (
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">soon</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          F4.6: Vite `/legacy` retired. Ops в Next.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 md:hidden">Daibilet Admin Next</p>
              <h1 className="text-base font-semibold text-slate-900">Операторская оболочка</h1>
            </div>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
              F4.6 hard-retire
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
