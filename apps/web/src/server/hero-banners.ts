import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db';
import {
  HOME_HERO_IMAGES,
  HOME_HERO_OBJECT_POSITION_DEFAULT,
  homeHeroObjectPositionClass,
  ultrawideSrcForHeroSrc,
  type HomeHeroImageSet,
} from '@/lib/home-hero-images';

export type PublicHeroBanner = {
  id: string;
  imageUrl: string;
  title: string;
  link: string | null;
  sortOrder: number;
};

export type HomeHeroMediaFrame = {
  src: string;
  alt: string;
  /** Tailwind object-position classes (faces ~top-center). */
  objectPosition: string;
  /** 21:9 alternate for ultrawide viewports. */
  ultrawideSrc?: string;
};

async function loadHeroBannersFromDb(): Promise<PublicHeroBanner[]> {
  try {
    const rows = await prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, imageUrl: true, title: true, link: true, sortOrder: true },
    });
    return rows.filter((row) => Boolean(row.imageUrl?.trim()));
  } catch {
    return [];
  }
}

export const getActiveHeroBanners = unstable_cache(loadHeroBannersFromDb, ['home-hero-banners-v1'], {
  revalidate: 300,
  tags: ['hero-banners'],
});

/** Frames for HeroMedia: DB banners or static pool (with face-safe object-position). */
export function heroFramesFromBanners(
  banners: PublicHeroBanner[],
  fallback: HomeHeroImageSet = HOME_HERO_IMAGES[0]!,
): HomeHeroMediaFrame[] {
  if (banners.length) {
    // HeroBanner CMS пока без focusX/focusY - top-center default, чтобы не срезать головы.
    return banners.map((banner) => ({
      src: banner.imageUrl,
      alt: banner.title || fallback.alt,
      objectPosition: HOME_HERO_OBJECT_POSITION_DEFAULT,
      ultrawideSrc: ultrawideSrcForHeroSrc(banner.imageUrl),
    }));
  }
  return HOME_HERO_IMAGES.map((image) => ({
    src: image.landscape,
    alt: image.alt,
    objectPosition: homeHeroObjectPositionClass(image),
    ultrawideSrc: image.ultrawide,
  }));
}
