/**
 * Пул full-bleed hero для главной.
 * Эталон файлов: apps/public/public/images/hero/ (sync → apps/web/public/images/hero).
 * Выбор кадра - на сервере (Math.random per request), без hydration flash.
 *
 * object-position: лица/глаза обычно в верхней трети кадра. При object-cover
 * дефолт center съедает головы на узких/низких viewport - держим focus ~20-30% по Y.
 * Ultrawide: тот же landscape, без отдельного *-uw кадра (owner: не увеличивать фото).
 */

export type HomeHeroImageSet = {
  id: string;
  landscape: string;
  portrait: string;
  alt: string;
  /** object-position для md+ (Tailwind, с префиксом md:/lg:…) */
  objectPositionDesktop?: string;
  /** object-position для mobile (Tailwind) */
  objectPositionMobile?: string;
};

/** Дефолт для CMS HeroBanner и кадров без явного focus. */
export const HOME_HERO_OBJECT_POSITION_DEFAULT = 'object-[50%_28%] md:object-[50%_22%]';

/** Собирает responsive object-position classes для HeroMedia. */
export function homeHeroObjectPositionClass(
  image: Pick<HomeHeroImageSet, 'objectPositionMobile' | 'objectPositionDesktop'>,
): string {
  const mobile = image.objectPositionMobile?.trim() || 'object-[50%_28%]';
  const desktop = image.objectPositionDesktop?.trim() || 'md:object-[50%_22%]';
  return `${mobile} ${desktop}`.replace(/\s+/g, ' ').trim();
}

export const HOME_HERO_IMAGES: readonly HomeHeroImageSet[] = [
  {
    id: 'friends-selfie',
    landscape: '/images/hero/home-hero-friends-selfie.jpg',
    portrait: '/images/hero/home-hero-friends-selfie-mobile.jpg',
    alt: 'Друзья улыбаются на городской экскурсии - групповое фото',
    objectPositionDesktop: 'md:object-[55%_28%] lg:object-[52%_24%] 2xl:object-[50%_22%]',
    objectPositionMobile: 'object-[50%_22%]',
  },
  {
    id: 'slavic-01',
    landscape: '/images/hero/hero-slavic-01.png',
    portrait: '/images/hero/hero-slavic-01.png',
    alt: 'Туристы с улыбкой гуляют по исторической улице города',
    objectPositionDesktop: 'md:object-[50%_26%]',
    objectPositionMobile: 'object-[50%_24%]',
  },
  {
    id: 'slavic-02',
    landscape: '/images/hero/hero-slavic-02.png',
    portrait: '/images/hero/hero-slavic-02.png',
    alt: 'Пара туристов радуется видам с набережной реки',
    objectPositionDesktop: 'md:object-[45%_26%]',
    objectPositionMobile: 'object-[42%_24%]',
  },
  {
    id: 'slavic-03',
    landscape: '/images/hero/hero-slavic-03.png',
    portrait: '/images/hero/hero-slavic-03.png',
    alt: 'Друзья с восхищением осматривают зал музея',
    objectPositionDesktop: 'md:object-[50%_28%]',
    objectPositionMobile: 'object-[50%_25%]',
  },
  {
    id: 'slavic-04',
    landscape: '/images/hero/hero-slavic-04.png',
    portrait: '/images/hero/hero-slavic-04.png',
    alt: 'Туристы любуются вечерними огнями города с набережной',
    objectPositionDesktop: 'md:object-[48%_28%]',
    objectPositionMobile: 'object-[45%_25%]',
  },
  {
    id: 'slavic-05',
    landscape: '/images/hero/hero-slavic-05.png',
    portrait: '/images/hero/hero-slavic-05.png',
    alt: 'Компания друзей весело гуляет у дворца в солнечный день',
    objectPositionDesktop: 'md:object-[50%_24%]',
    objectPositionMobile: 'object-[50%_22%]',
  },
  {
    id: 'slavic-06',
    landscape: '/images/hero/hero-slavic-06.png',
    portrait: '/images/hero/hero-slavic-06.png',
    alt: 'Семья туристов с радостью смотрит на речную прогулку',
    objectPositionDesktop: 'md:object-[52%_28%]',
    objectPositionMobile: 'object-[50%_25%]',
  },
] as const;

/** Focus по пути кадра из пула; иначе face-safe default (каталоги / CMS). */
export function objectPositionForHeroSrc(src: string | undefined | null): string {
  const path = src?.trim();
  if (!path) return HOME_HERO_OBJECT_POSITION_DEFAULT;
  const match = HOME_HERO_IMAGES.find(
    (image) => image.landscape === path || image.portrait === path,
  );
  if (match) return homeHeroObjectPositionClass(match);
  return HOME_HERO_OBJECT_POSITION_DEFAULT;
}

/** Случайный кадр на запрос (SSR). */
export function pickHomeHeroImage(): HomeHeroImageSet {
  const index = Math.floor(Math.random() * HOME_HERO_IMAGES.length);
  return HOME_HERO_IMAGES[index] ?? HOME_HERO_IMAGES[0]!;
}
