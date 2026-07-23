import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import {
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  Settings,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  ready?: boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, ready: true },
  { href: '/admin/events', label: 'События', icon: CalendarDays },
  { href: '/admin/venues', label: 'Площадки', icon: Building2 },
  { href: '/admin/cities', label: 'Города', icon: MapPin },
  { href: '/admin/landings', label: 'Лендинги', icon: LayoutTemplate },
  { href: '/admin/articles', label: 'Блог', icon: BookOpen },
  { href: '/admin/sources', label: 'Источники', icon: Download },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
];

type Props = {
  children: ReactNode;
  activePath?: string;
};

export function AdminNextShell({ children, activePath = '/admin' }: Props) {
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
            const active = item.href === activePath;
            return (
              <Link
                key={item.href}
                href={item.ready ? item.href : '/admin'}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                } ${item.ready ? '' : 'opacity-60'}`}
                aria-current={active ? 'page' : undefined}
                title={item.ready ? undefined : 'Экран ещё на Vite admin - заглушка F4'}
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
          Vite admin остаётся каноном на admin.daibilet.ru до полного переноса.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 md:hidden">Daibilet Admin Next</p>
              <h1 className="text-base font-semibold text-slate-900">Операторская оболочка</h1>
            </div>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
              F4 kickoff - shell only
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
