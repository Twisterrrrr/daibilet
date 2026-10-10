import { prisma } from '@/lib/db';
import type { SeoOverrideLike } from '@/lib/seo/get-landing-seo';

/**
 * Lookup optional SeoOverride row. Returns null when missing or table not ready.
 * Never seeds fake texts - empty DB is the expected launch state.
 */
export async function findSeoOverride(
  citySlug: string,
  landingSlug: string,
): Promise<SeoOverrideLike> {
  const city = String(citySlug || '').trim();
  const landing = String(landingSlug || '').trim();
  if (!city || !landing) return null;
  try {
    return await prisma.seoOverride.findUnique({
      where: {
        citySlug_landingSlug: { citySlug: city, landingSlug: landing },
      },
      select: {
        customTitle: true,
        customDescription: true,
        customH1: true,
        customText: true,
      },
    });
  } catch {
    return null;
  }
}
