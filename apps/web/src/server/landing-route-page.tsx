import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LandingPageView } from '@/components/LandingPageView';
import '@/lib/env';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import { landingCategoryHref, resolveLandingRouteFromLocation } from '@/lib/landing-routes';
import { fetchLandingPageDto, finalizeLandingPayload } from '@/server/landing-page';

export const revalidate = 3600;

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

export async function buildLandingMetadata(pathname: string): Promise<Metadata> {
  const route = resolveLandingRouteFromLocation(pathname);
  if (!route) return { title: 'Подборка | Дайбилет' };

  const slug = canonicalLandingSlug(route.landingSlug);
  const payload = await fetchLandingPageDto(slug);
  if (!payload?.landing) return { title: 'Подборка | Дайбилет' };

  const landing = payload.landing;
  return {
    title: landing.seoTitle || `${landing.title} | Дайбилет`,
    description: landing.seoDescription || landing.subtitle || undefined,
    alternates: {
      canonical: landingCategoryHref(slug, route.citySlug),
    },
    openGraph: {
      title: landing.seoTitle || landing.title,
      description: landing.seoDescription || landing.subtitle || undefined,
      images: landing.imageUrl ? [{ url: landing.imageUrl }] : undefined,
    },
  };
}

export async function LandingRoutePage({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: SearchParams;
}) {
  const route = resolveLandingRouteFromLocation(pathname);
  if (!route) notFound();

  const slug = canonicalLandingSlug(route.landingSlug);
  const payload = await fetchLandingPageDto(slug);
  if (!payload?.landing) notFound();

  const genre = readSearchParam(searchParams, 'genre') || readSearchParam(searchParams, 'tag');
  const finalized = finalizeLandingPayload(payload, slug, route.citySlug, genre);

  return <LandingPageView payload={finalized} />;
}
