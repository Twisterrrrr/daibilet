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
  /** Только для корня: /admin не должен подсвечиваться на вложенных маршрутах. */
  end?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

/**
 * Группы отражают работу оператора (см. docs/admin-operations-bible-2026-10.md).
 * Показываем только работающие экраны: пустые будущие разделы
 * (Поставщики, Поддержка, Выплаты, SEO) в меню не добавляем.
 */

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Обзор',
    items: [{ href: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Заказы',
    items: [
      { href: '/admin/orders', label: 'Все заказы', icon: Receipt },
      { href: '/admin/buyers', label: 'Поиск покупателей', icon: Users },
    ],
  },
  {
    title: 'Каталог',
    items: [
      { href: '/admin/events', label: 'События', icon: CalendarDays },
      { href: '/admin/venues', label: 'Площадки', icon: Building2 },
      { href: '/admin/cities', label: 'Города', icon: MapPin },
    ],
  },
  {
    title: 'Входящие',
    items: [{ href: '/admin/change-requests', label: 'Заявки поставщиков', icon: ClipboardList }],
  },
  {
    title: 'Контент',
    items: [
      { href: '/admin/landings', label: 'Лендинги', icon: LayoutTemplate },
      { href: '/admin/articles', label: 'Статьи', icon: BookOpen },
      { href: '/admin/hero-banners', label: 'Главная страница', icon: ImageIcon },
      { href: '/admin/reviews', label: 'Отзывы', icon: MessageSquareQuote },
    ],
  },
  {
    title: 'Система',
    items: [{ href: '/admin/sources', label: 'Импорт', icon: Download }],
  },
];

/**
 * Маршруты вне основного меню. «Настройки» - техническая страница, убрана из
 * меню, но маршрут работает (подвал сайдбара). sync-health - alias на Импорт.
 */
const EXTRA_TITLES: Record<string, string> = {
  '/admin/settings': 'Настройки',
  '/admin/sync-health': 'Диагностика',
};

function isActivePath(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function findCurrent(pathname: string): { group?: NavGroup; item?: NavItem } {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isActivePath(pathname, item)) return { group, item };
    }
  }
  for (const [href, label] of Object.entries(EXTRA_TITLES)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return { item: { href, label, icon: Settings } };
    }
  }
  return {};
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
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="pb-1">
          <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {group.title}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item);
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
        </div>
      ))}
    </>
  );
}

type Props = {
  children: ReactNode;
};

export function AdminNextShell({ children }: Props) {
  const pathname = usePathname() || '/admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const { group, item } = findCurrent(pathname);
  const title = item?.label || 'Админка';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Daibilet</p>
          <p className="text-sm font-semibold text-slate-900">Админка</p>
        </div>
        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2"
          aria-label="Разделы админки"
        >
          <NavLinks pathname={pathname} />
        </nav>
        <div className="border-t border-slate-200 p-2">
          <Link
            href="/admin/settings"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Настройки
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">
                Daibilet · {group?.title || 'Админка'}
              </p>
              <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
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
              className="mt-2 max-h-[calc(100vh-7rem)] gap-0.5 overflow-y-auto border-t border-slate-100 pb-1 pt-2 md:hidden"
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
