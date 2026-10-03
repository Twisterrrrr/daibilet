/**
 * Пул full-bleed hero для главной: tourist emotions (люди в городах РФ).
 * Эталон: apps/public/public/images/home/hero-emotion-*.jpg (sync → apps/web/public/images).
 * Ротатор / CMS HeroBanner берут этот пул; без hydration flash на сервере.
 *
 * object-position: лица/глаза обычно в верхней трети кадра. При object-cover
 * дефолт center съедает головы на узких/низких viewport - держим focus ~20-30% по Y.
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

/** Дефолт для CMS HeroBanner и кадров без явного focus (face-safe). */
export const HOME_HERO_OBJECT_POSITION_DEFAULT = 'object-[50%_28%] md:object-[50%_22%]';

/** Собирает responsive object-position classes для HeroMedia. */
export function homeHeroObjectPositionClass(
  image: Pick<HomeHeroImageSet, 'objectPositionMobile' | 'objectPositionDesktop'>,
): string {
  const mobile = image.objectPositionMobile?.trim() || 'object-[50%_28%]';
  const desktop = image.objectPositionDesktop?.trim() || 'md:object-[50%_22%]';
  return `${mobile} ${desktop}`.replace(/\s+/g, ' ').trim();
}

/** Цикл эмоций: друзья / музей / круиз / ночь / площадь / набережная. */
export const HOME_HERO_IMAGES: readonly HomeHeroImageSet[] = [
  {
    id: 'emotion-friends-embankment',
    landscape: '/images/home/hero-emotion-01.jpg',
    portrait: '/images/home/hero-emotion-01.jpg',
    alt: 'Друзья смеются на набережной во время городской поездки',
    objectPositionDesktop: 'md:object-[50%_26%]',
    objectPositionMobile: 'object-[50%_24%]',
  },
  {
    id: 'emotion-couple-museum',
    landscape: '/images/home/hero-emotion-02.jpg',
    portrait: '/images/home/hero-emotion-02.jpg',
    alt: 'Пара с интересом рассматривает экспозицию в музее',
    objectPositionDesktop: 'md:object-[48%_28%]',
    objectPositionMobile: 'object-[45%_26%]',
  },
  {
    id: 'emotion-family-cruise',
    landscape: '/images/home/hero-emotion-03.jpg',
    portrait: '/images/home/hero-emotion-03.jpg',
    alt: 'Семья радуется речной прогулке по городу',
    objectPositionDesktop: 'md:object-[52%_28%]',
    objectPositionMobile: 'object-[50%_26%]',
  },
  {
    id: 'emotion-night-walk',
    landscape: '/images/home/hero-emotion-04.jpg',
    portrait: '/images/home/hero-emotion-04.jpg',
    alt: 'Друзья в восторге от вечерней прогулки по городу',
    objectPositionDesktop: 'md:object-[50%_26%]',
    objectPositionMobile: 'object-[48%_24%]',
  },
  {
    id: 'emotion-square-laugh',
    landscape: '/images/home/hero-emotion-05.jpg',
    portrait: '/images/home/hero-emotion-05.jpg',
    alt: 'Подруги смеются на прогулке по исторической площади',
    objectPositionDesktop: 'md:object-[50%_24%]',
    objectPositionMobile: 'object-[50%_22%]',
  },
  {
    id: 'emotion-promenade-sunset',
    landscape: '/images/home/hero-emotion-06.jpg',
    portrait: '/images/home/hero-emotion-06.jpg',
    alt: 'Пара наслаждается закатом на современной набережной',
    objectPositionDesktop: 'md:object-[48%_28%]',
    objectPositionMobile: 'object-[45%_26%]',
  },
] as const;

/** Focus по пути кадра из пула; иначе face-safe default. */
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
