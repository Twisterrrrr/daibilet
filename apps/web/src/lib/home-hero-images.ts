/**
 * Пул full-bleed hero для главной: узнаваемые кадры разных городов РФ.
 * Эталон: apps/public/public/images/cities/top/ (sync → apps/web/public/images).
 * Ротатор / CMS HeroBanner берут этот пул; без hydration flash на сервере.
 *
 * object-position: для landmark-кадров без лиц держим фокус ближе к центру
 * (~40-45% Y), чтобы не срезать купола/набережные при object-cover.
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
export const HOME_HERO_OBJECT_POSITION_DEFAULT = 'object-[50%_42%] md:object-[50%_40%]';

/** Собирает responsive object-position classes для HeroMedia. */
export function homeHeroObjectPositionClass(
  image: Pick<HomeHeroImageSet, 'objectPositionMobile' | 'objectPositionDesktop'>,
): string {
  const mobile = image.objectPositionMobile?.trim() || 'object-[50%_42%]';
  const desktop = image.objectPositionDesktop?.trim() || 'md:object-[50%_40%]';
  return `${mobile} ${desktop}`.replace(/\s+/g, ' ').trim();
}

/** Цикл городов: Москва → СПб → Казань → Екатеринбург → Нижний → Самара. */
export const HOME_HERO_IMAGES: readonly HomeHeroImageSet[] = [
  {
    id: 'moscow-red-square',
    landscape: '/images/cities/top/moscow.jpg',
    portrait: '/images/cities/top/moscow.jpg',
    alt: 'Красная площадь и собор Василия Блаженного в Москве',
    objectPositionDesktop: 'md:object-[50%_42%]',
    objectPositionMobile: 'object-[48%_40%]',
  },
  {
    id: 'spb-hermitage',
    landscape: '/images/cities/top/saint-petersburg.jpg',
    portrait: '/images/cities/top/saint-petersburg.jpg',
    alt: 'Зимний дворец и набережная Невы в Санкт-Петербурге',
    objectPositionDesktop: 'md:object-[50%_40%]',
    objectPositionMobile: 'object-[50%_38%]',
  },
  {
    id: 'kazan-kul-sharif',
    landscape: '/images/cities/top/kazan.jpg',
    portrait: '/images/cities/top/kazan.jpg',
    alt: 'Мечеть Кул-Шариф в Казанском кремле',
    objectPositionDesktop: 'md:object-[48%_42%]',
    objectPositionMobile: 'object-[45%_40%]',
  },
  {
    id: 'ekaterinburg-pond',
    landscape: '/images/cities/top/ekaterinburg.jpg',
    portrait: '/images/cities/top/ekaterinburg.jpg',
    alt: 'Набережная городского пруда и небоскрёбы Екатеринбурга',
    objectPositionDesktop: 'md:object-[52%_44%]',
    objectPositionMobile: 'object-[50%_42%]',
  },
  {
    id: 'nizhny-kremlin',
    landscape: '/images/cities/top/nizhny-novgorod.jpg',
    portrait: '/images/cities/top/nizhny-novgorod.jpg',
    alt: 'Нижегородский кремль и вид на Волгу',
    objectPositionDesktop: 'md:object-[42%_40%]',
    objectPositionMobile: 'object-[40%_38%]',
  },
  {
    id: 'samara-embankment',
    landscape: '/images/cities/top/samara.jpg',
    portrait: '/images/cities/top/samara.jpg',
    alt: 'Набережная Волги и памятник Ладья в Самаре',
    objectPositionDesktop: 'md:object-[40%_42%]',
    objectPositionMobile: 'object-[38%_40%]',
  },
] as const;

/** Focus по пути кадра из пула; иначе landmark-safe default. */
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
