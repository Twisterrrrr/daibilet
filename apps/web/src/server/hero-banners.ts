import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db';
import { HOME_HERO_IMAGES, type HomeHeroImageSet } from '@/lib/home-hero-images';

export type PublicHeroBanner = {
  id: string;
  imageUrl: string;
  title: string;
  link: string | null;
  sortOrder: number;
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

/** Frames for HeroMedia: DB banners or static pool. */
export function heroFramesFromBanners(
  banners: PublicHeroBanner[],
  fallback: HomeHeroImageSet = HOME_HERO_IMAGES[0]!,
): Array<{ src: string; alt: string }> {
  if (banners.length) {
    return banners.map((banner) => ({
      src: banner.imageUrl,
      alt: banner.title || fallback.alt,
    }));
  }
  return HOME_HERO_IMAGES.map((image) => ({
    src: image.landscape,
    alt: image.alt,
  }));
}
