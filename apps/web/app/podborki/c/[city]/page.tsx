import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import '@/lib/env';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import {
  buildPodborkiCityCanonicalPath,
  PODBORKI_HUB_SEO,
  resolvePodborkiCityMetaPilot,
} from '@/lib/podborki-city-seo';
import { buildShareMetadata, canonicalHref, ensureSeoDescription, pageTitle } from '@/lib/seo-meta';
import {
  PodborkiCatalogSurface,
  resolvePodborkiCatalogSurfaceSeo,
} from '@/server/podborki-catalog-surface';

export const revalidate = 600;

type PageProps = {
  params: Promise<{ city: string }>;
};

async function resolveCityParam(raw: string) {
  let decoded = String(raw || '').trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    // keep raw
  }
  if (!decoded) return null;
  const canon = normalizeKnownCitySlug(decoded) || decoded;
  const meta = resolvePodborkiCityMetaPilot(canon);
  return { raw: decoded, canon, meta };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: raw } = await params;
  const resolved = await resolveCityParam(raw);
  if (!resolved?.meta) {
    return {
      title: pageTitle(PODBORKI_HUB_SEO.title),
      robots: { index: false, follow: true },
    };
  }
  const seo = await resolvePodborkiCatalogSurfaceSeo({ rawCity: resolved.meta.citySlug });
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

/**
 * Marker CHPU city hub: `/podborki/c/{city}`.
 * Soft `/podborki?city=` for meta-pilot consolidates here via middleware 301.
 */
export default async function PodborkiCityHubPage({ params }: PageProps) {
  const { city: raw } = await params;
  const resolved = await resolveCityParam(raw);
  if (!resolved) notFound();

  // Alias / DB translit → SEO path canon on the marker URL.
  if (resolved.meta && resolved.raw !== resolved.meta.citySlug) {
    permanentRedirect(buildPodborkiCityCanonicalPath(resolved.meta.citySlug));
  }

  if (!resolved.meta) {
    // Known non-meta city: keep soft query surface (noindex). Unknown → hub.
    if (normalizeKnownCitySlug(resolved.raw) || normalizeKnownCitySlug(resolved.canon)) {
      permanentRedirect(`/podborki?city=${encodeURIComponent(resolved.canon)}`);
    }
    permanentRedirect('/podborki');
  }

  const seo = await resolvePodborkiCatalogSurfaceSeo({ rawCity: resolved.meta.citySlug });
  return <PodborkiCatalogSurface seo={seo} />;
}
