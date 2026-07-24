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

/** Популярно сейчас - реальные CHPU / фильтры каталога, без emoji. */
export const HERO_QUICK_CHIPS: HomeQuickChip[] = [
  { label: 'Речные прогулки', href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river) },
  { label: 'Музеи', href: '/events?category=Музеи+и+арт&sort=popular' },
  { label: 'Roof-туры', href: landingCategoryHref('rooftops') },
  { label: 'Стендап', href: '/events?q=стендап&sort=popular' },
  { label: 'Топ недели', href: '/events?sort=popular' },
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
  {
    title: 'Проверяем события и площадки',
    text: 'В каталог попадают только объекты с понятной афишей и адресом.',
  },
  {
    title: 'Всё в одном месте',
    text: 'Экскурсии, музеи и мероприятия - с фильтрами по городу, дате и формату.',
  },
  {
    title: 'Помогаем выбрать',
    text: 'Подборки и сценарии под компанию, сезон и настроение.',
  },
  {
    title: 'Покупка у организатора',
    text: 'Оплата - в официальном виджете Ticketscloud или Teplohod.info, не на daibilet.ru.',
  },
] as const;
