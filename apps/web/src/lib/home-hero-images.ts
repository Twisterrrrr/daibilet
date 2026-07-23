/**
 * Пул full-bleed hero для главной.
 * Эталон файлов: apps/public/public/images/hero/ (sync → apps/web/public/images/hero).
 * Выбор кадра - на сервере (Math.random per request), без hydration flash.
 */

export type HomeHeroImageSet = {
  id: string;
  landscape: string;
  portrait: string;
  alt: string;
  /** object-position для md+ */
  objectPositionDesktop?: string;
  /** object-position для mobile */
  objectPositionMobile?: string;
};

export const HOME_HERO_IMAGES: readonly HomeHeroImageSet[] = [
  {
    id: 'friends-selfie',
    landscape: '/images/hero/home-hero-friends-selfie.jpg',
    portrait: '/images/hero/home-hero-friends-selfie-mobile.jpg',
    alt: 'Друзья улыбаются на городской экскурсии - групповое фото',
    objectPositionDesktop: 'md:object-[58%_42%] lg:object-[52%_40%] 2xl:object-[48%_38%]',
    objectPositionMobile: 'object-cover',
  },
  {
    id: 'slavic-01',
    landscape: '/images/hero/hero-slavic-01.png',
    portrait: '/images/hero/hero-slavic-01.png',
    alt: 'Туристы с улыбкой гуляют по исторической улице города',
    objectPositionDesktop: 'md:object-[50%_40%]',
    objectPositionMobile: 'object-[50%_35%]',
  },
  {
    id: 'slavic-02',
    landscape: '/images/hero/hero-slavic-02.png',
    portrait: '/images/hero/hero-slavic-02.png',
    alt: 'Пара туристов радуется видам с набережной реки',
    objectPositionDesktop: 'md:object-[45%_40%]',
    objectPositionMobile: 'object-[42%_35%]',
  },
  {
    id: 'slavic-03',
    landscape: '/images/hero/hero-slavic-03.png',
    portrait: '/images/hero/hero-slavic-03.png',
    alt: 'Друзья с восхищением осматривают зал музея',
    objectPositionDesktop: 'md:object-[50%_42%]',
    objectPositionMobile: 'object-[50%_38%]',
  },
  {
    id: 'slavic-04',
    landscape: '/images/hero/hero-slavic-04.png',
    portrait: '/images/hero/hero-slavic-04.png',
    alt: 'Туристы любуются вечерними огнями города с набережной',
    objectPositionDesktop: 'md:object-[48%_45%]',
    objectPositionMobile: 'object-[45%_40%]',
  },
  {
    id: 'slavic-05',
    landscape: '/images/hero/hero-slavic-05.png',
    portrait: '/images/hero/hero-slavic-05.png',
    alt: 'Компания друзей весело гуляет у дворца в солнечный день',
    objectPositionDesktop: 'md:object-[50%_38%]',
    objectPositionMobile: 'object-[50%_32%]',
  },
  {
    id: 'slavic-06',
    landscape: '/images/hero/hero-slavic-06.png',
    portrait: '/images/hero/hero-slavic-06.png',
    alt: 'Семья туристов с радостью смотрит на речную прогулку',
    objectPositionDesktop: 'md:object-[52%_42%]',
    objectPositionMobile: 'object-[50%_38%]',
  },
] as const;

/** Случайный кадр на запрос (SSR). */
export function pickHomeHeroImage(): HomeHeroImageSet {
  const index = Math.floor(Math.random() * HOME_HERO_IMAGES.length);
  return HOME_HERO_IMAGES[index] ?? HOME_HERO_IMAGES[0]!;
}
