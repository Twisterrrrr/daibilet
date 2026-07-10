import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';

export type HomeQuickChip = {
  label: string;
  href: string;
};

export type HomeFormatTile = {
  title: string;
  subtitle: string;
  href: string;
  gradient: string;
};

export const HERO_QUICK_CHIPS: HomeQuickChip[] = [
  { label: 'Сегодня', href: '/events?date=today&sort=time' },
  { label: 'На выходные', href: '/events?date=weekend&sort=popular' },
  { label: 'С детьми', href: '/events?q=детям&sort=popular' },
  { label: 'На воде', href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river) },
  { label: 'Музеи', href: '/events?category=Музеи+и+арт&sort=popular' },
];

export const HOME_FORMAT_TILES: HomeFormatTile[] = [
  {
    title: 'Речные прогулки',
    subtitle: 'Теплоходы и каналы',
    href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river),
    gradient: 'from-sky-600 to-indigo-900',
  },
  {
    title: 'Обзорные экскурсии',
    subtitle: 'Для первого знакомства',
    href: '/events?category=Экскурсии&sort=popular',
    gradient: 'from-emerald-600 to-slate-900',
  },
  {
    title: 'Музеи',
    subtitle: 'Выставки и экспозиции',
    href: '/events?category=Музеи+и+арт&sort=popular',
    gradient: 'from-amber-500 to-orange-800',
  },
  {
    title: 'Ночная программа',
    subtitle: 'Вечер и огни города',
    href: '/events?date=evening&sort=time',
    gradient: 'from-slate-700 to-slate-950',
  },
];

export const HOME_TRUST_ITEMS = [
  'Билеты онлайн без очереди',
  'Актуальные даты и цены',
  'Экскурсии, музеи и мероприятия',
];
