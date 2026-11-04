import { landingPageHref } from '@/lib/landing-slugs';

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

/** Быстрые сценарии под поиском в hero. */
export const HERO_QUICK_CHIPS: HomeQuickChip[] = [
  { label: 'Сегодня', href: '/events?date=today&sort=time' },
  { label: 'На выходные', href: '/events?date=weekend&sort=popular' },
  { label: 'С детьми', href: '/events?q=детям&sort=popular' },
  { label: 'На воде', href: landingPageHref('river-cruises') },
  { label: 'Музеи', href: '/events?category=Музеи+и+арт&sort=popular' },
  { label: 'Романтика', href: '/events?q=романт&sort=popular' },
  { label: 'Ночная программа', href: '/events?date=evening&sort=time' },
];

/** Плитки «Выберите формат отдыха». */
export const HOME_FORMAT_TILES: HomeFormatTile[] = [
  {
    title: 'Речные прогулки',
    subtitle: 'Теплоходы и каналы',
    href: landingPageHref('river-cruises'),
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
    title: 'Концерты',
    subtitle: 'Живая музыка и шоу',
    href: '/events?category=Мероприятия&q=концерт&sort=popular',
    gradient: 'from-violet-600 to-slate-950',
  },
  {
    title: 'Детям',
    subtitle: 'Семейный досуг',
    href: '/events?q=детям&sort=popular',
    gradient: 'from-rose-500 to-pink-800',
  },
  {
    title: 'Романтика',
    subtitle: 'Для пары',
    href: '/events?q=романт&sort=popular',
    gradient: 'from-fuchsia-600 to-purple-950',
  },
  {
    title: 'Ночная программа',
    subtitle: 'Вечер и огни города',
    href: '/events?date=evening&sort=time',
    gradient: 'from-slate-700 to-slate-950',
  },
  {
    title: 'С гидом',
    subtitle: 'Авторские маршруты',
    href: '/events?q=гид&sort=popular',
    gradient: 'from-teal-600 to-cyan-900',
  },
];

export const POPULAR_CITY_NAMES = [
  'Санкт-Петербург',
  'Москва',
  'Казань',
  'Сочи',
  'Калининград',
  'Нижний Новгород',
  'Ярославль',
  'Владивосток',
] as const;

export const HOME_TRUST_ITEMS = [
  {
    title: 'Проверяем события и площадки',
    text: 'В каталог попадают только объекты с понятной афишей и адресом.',
  },
  {
    title: 'Всё в одном месте',
    text: 'Экскурсии, музеи и мероприятия — с фильтрами по городу, дате и формату.',
  },
  {
    title: 'Помогаем выбрать',
    text: 'Подборки и сценарии под компанию, сезон и настроение.',
  },
  {
    title: 'Более чем в 100 городах',
    text: 'Экскурсии, музеи и события по России в одном каталоге.',
  },
] as const;
