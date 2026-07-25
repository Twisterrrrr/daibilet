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
  imageUrl: string;
  /** Soft fallback if image fails to load. */
  fallbackGradient: string;
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
    imageUrl: '/images/home/format-river.jpg',
    fallbackGradient: 'from-sky-700 to-slate-900',
  },
  {
    title: 'Обзорные экскурсии',
    subtitle: 'Для первого знакомства',
    href: '/events?category=Экскурсии&sort=popular',
    imageUrl: '/images/home/format-tours.jpg',
    fallbackGradient: 'from-emerald-700 to-slate-900',
  },
  {
    title: 'Музеи',
    subtitle: 'Выставки и экспозиции',
    href: '/events?category=Музеи+и+арт&sort=popular',
    imageUrl: '/images/home/format-museums.jpg',
    fallbackGradient: 'from-amber-700 to-stone-900',
  },
  {
    title: 'Ночная программа',
    subtitle: 'Вечер и огни города',
    href: '/events?date=evening&sort=time',
    imageUrl: '/images/home/format-night.jpg',
    fallbackGradient: 'from-slate-700 to-slate-950',
  },
];

/** Photo covers for home «Тематические подборки» by landing slug / keyword. */
export const HOME_PROMO_IMAGES: Array<{ match: RegExp; imageUrl: string }> = [
  { match: /yard|парадн|двор/i, imageUrl: '/images/home/promo-yards.jpg' },
  { match: /bridge|мост/i, imageUrl: '/images/home/promo-bridges.jpg' },
  { match: /dinner|ужин/i, imageUrl: '/images/home/promo-dinner.jpg' },
  { match: /museum|мастер|музе/i, imageUrl: '/images/home/promo-museums.jpg' },
  { match: /party|disco|вечер/i, imageUrl: '/images/home/promo-party.jpg' },
  { match: /concert|концерт/i, imageUrl: '/images/home/promo-concerts.jpg' },
  { match: /river|теплоход|progul/i, imageUrl: '/images/home/format-river.jpg' },
];

export function resolveHomePromoImage(slug: string, title?: string | null): string {
  const haystack = `${slug} ${title || ''}`;
  for (const item of HOME_PROMO_IMAGES) {
    if (item.match.test(haystack)) return item.imageUrl;
  }
  return '/images/home/format-tours.jpg';
}

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
    title: 'Более чем в 100 городах',
    text: 'Экскурсии, музеи и события по России в одном каталоге.',
  },
] as const;

export const HOME_HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Выберите событие и дату',
    text: 'Каталог, подборки и фильтры по городу - без прыжков по разным сайтам.',
  },
  {
    step: '2',
    title: 'Оплатите онлайн',
    text: 'Купите билет в пару кликов - без кассы и очереди.',
  },
  {
    step: '3',
    title: 'Билет на телефоне',
    text: 'Придёт на email и SMS. На входе покажите с экрана смартфона.',
  },
] as const;
