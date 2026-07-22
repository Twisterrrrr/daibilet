import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  MessageSquareQuote,
  Receipt,
  Settings,
  UserRound,
  GitPullRequest,
  Handshake,
} from 'lucide-react';

export type NavZoneId = 'work' | 'hubs' | 'system';

export type NavItem = {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
};

export type NavZone = { id: NavZoneId; title: string; items: NavItem[] };

export const NAV_ZONES: NavZone[] = [
  {
    id: 'work',
    title: 'Операции',
    items: [
      { id: 'dashboard', title: 'Дашборд', path: '/', icon: LayoutDashboard, end: true },
      { id: 'events', title: 'События', path: '/events', icon: CalendarDays },
      ...(import.meta.env.VITE_DAIBILET_EVENT_CHANGE_REQUESTS === '1'
        ? [{ id: 'change-requests', title: 'Заявки на изменения', path: '/change-requests', icon: GitPullRequest }]
        : []),
      { id: 'orders', title: 'Заказы', path: '/orders', icon: Receipt },
      { id: 'suppliers', title: 'Поставщики', path: '/suppliers', icon: Handshake },
      { id: 'reviews', title: 'Отзывы', path: '/reviews', icon: MessageSquareQuote },
      { id: 'buyers', title: 'Покупатели', path: '/buyers', icon: UserRound },
    ],
  },
  {
    id: 'hubs',
    title: 'Каталог и рост',
    items: [
      { id: 'venues', title: 'Площадки', path: '/venues', icon: Building2 },
      { id: 'cities', title: 'Города', path: '/cities', icon: MapPin },
      { id: 'landings', title: 'Лендинги', path: '/landings', icon: LayoutTemplate },
      { id: 'articles', title: 'Блог', path: '/articles', icon: BookOpen },
    ],
  },
  {
    id: 'system',
    title: 'Импорт и система',
    items: [
      { id: 'sources', title: 'Источники', path: '/sources', icon: Download },
      { id: 'sync', title: 'Здоровье синхронизации', path: '/sync-health', icon: BarChart3 },
      { id: 'settings', title: 'Настройки', path: '/settings', icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_ZONES.flatMap((zone) => zone.items);
