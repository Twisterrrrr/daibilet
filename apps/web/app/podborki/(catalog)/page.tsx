import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import '@/lib/env';
import { PODBORKI_HUB_SEO, resolvePodborkiCityQueryRedirect } from '@/lib/podborki-city-seo';
import { buildShareMetadata, canonicalHref, ensureSeoDescription, pageTitle } from '@/lib/seo-meta';
import {
  PodborkiCatalogSurface,
  resolvePodborkiCatalogSurfaceSeo,
} from '@/server/podborki-catalog-surface';

export const revalidate = 600;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

/**
 * Hub `/podborki` and soft `?city=` for non-meta cities.
 * Meta-pilot soft query consolidates to `/podborki/c/{city}` (middleware 301 + page fallback).
 * Hub `/podborki` and `?city=all` stay indexable. Non-pilot city query → noindex.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const rawCity = firstQueryValue(params.city);
  const markerRedirect = resolvePodborkiCityQueryRedirect(rawCity);
  if (markerRedirect) {
    // Soft query should not stay self-canonical; middleware owns the 301.
    return {
      title: pageTitle(PODBORKI_HUB_SEO.title),
      alternates: { canonical: canonicalHref(markerRedirect) },
      robots: { index: false, follow: true },
    };
  }
  const seo = await resolvePodborkiCatalogSurfaceSeo({
    rawCity,
    rawLanding: firstQueryValue(params.landing),
  });
  const title = pageTitle(seo.title);
  const description = ensureSeoDescription(seo.description, PODBORKI_HUB_SEO.description);
  return {
    title,
    description,
    alternates: { canonical: canonicalHref(seo.canonicalPath) },
    robots: seo.robots,
    ...buildShareMetadata({
      title: `${title} | Дайбилет`,
      description,
      path: seo.canonicalPath,
    }),
  };
}

export default async function PodborkiCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawCity = firstQueryValue(params.city);
  const markerRedirect = resolvePodborkiCityQueryRedirect(rawCity);
  if (markerRedirect) permanentRedirect(markerRedirect);

  const seo = await resolvePodborkiCatalogSurfaceSeo({
    rawCity,
    rawLanding: firstQueryValue(params.landing),
  });

  return <PodborkiCatalogSurface seo={seo} />;
}
