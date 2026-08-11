import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LandingPageView } from '@/components/LandingPageView.client';
import { SiteLayout } from '@/components/SiteLayout';
import { getSeasonalLanding } from '@/data/seasonal-landings';
import '@/lib/env';
import type { LandingProfileKind } from '@/lib/landing-copy';
import { resolveLandingCityName } from '@/lib/landing-city';
import {
  canonicalLandingSlug,
  isBridgesNightLandingSlug,
  isRiverCruisesLandingSlug,
  isRiverPartyLandingSlug,
} from '@/lib/landing-constants';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { landingCategoryHref, resolveLandingRouteFromLocation } from '@/lib/landing-routes';
import { resolveLandingSeo } from '@/lib/landing-seo';
import { hasSeoListingEditorial } from '@/data/seo-listing-texts';
import {
  appendRealPriceToDescription,
  buildCategoryCityListingMeta,
  evaluateListingIndexability,
  robotsForListingIndexability,
} from '@/lib/seo-listing-meta';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { buildLandingPageJsonLd } from '@/lib/structured-data';
import { fetchLandingPageDto, finalizeLandingPayload } from '@/server/landing-page';
import { loadThinRelatedCardSessions } from '@/server/landing-thin-related';

export const revalidate = 3600;

/** Профиль SEO/UI для лендинга - зеркало LandingPageView.getLandingProfile. */
function resolveLandingProfileKind(slug: string): LandingProfileKind {
  const key = canonicalLandingSlug(slug);
  if (isBridgesNightLandingSlug(key)) return 'bridges';
  if (getSeasonalLanding(key)) return 'seasonal';
  if (isRiverPartyLandingSlug(key)) return 'default';
  if (key.includes('bus')) return 'bus';
  if (key.includes('dinner') || key.includes('ужин')) return 'dinner';
  if (isRiverCruisesLandingSlug(key)) return 'river';
  return 'default';
}

export async function buildLandingMetadata(pathname: string): Promise<Metadata> {
  const route = resolveLandingRouteFromLocation(pathname);
  // Call notFound() here too so crawlers get HTTP 404 (not soft-404 title with 200).
  if (!route) notFound();

  const slug = canonicalLandingSlug(route.landingSlug);
  const payload = await fetchLandingPageDto(slug, route.citySlug);
  if (!payload?.landing) notFound();

  // Genre/tag live only on client (?genre=) so generateMetadata stays ISR-safe.
  const finalized = finalizeLandingPayload(payload, slug, route.citySlug);
  const landing = finalized.landing;
  const canonical = landingCategoryHref(slug, route.citySlug);
  const cityName = resolveLandingCityName(route.citySlug);
  const offers = finalized.stats?.events ?? 0;
  const priceFrom = finalized.stats?.priceFrom ?? null;
  const hasEditorialSeoText = Boolean(
    route.citySlug && hasSeoListingEditorial(slug, route.citySlug),
  );
  const indexDecision = evaluateListingIndexability({ offers, hasEditorialSeoText });
  const profile = resolveLandingProfileKind(slug);

  let title: string;
  let description: string | undefined;
  let shareTitle: string;

  if (cityName) {
    const seo = resolveLandingSeo({
      slug,
      profile,
      landingTitle: landing.title,
      cityName,
      stats: finalized.stats,
      landingEvents: landing.events,
    });
    const listingMeta = buildCategoryCityListingMeta({
      landingSlug: slug,
      cityName,
      fallbackTitle: landing.title,
      priceFrom,
    });
    title = seo.title;
    description = listingMeta.description;
    shareTitle = seo.title;
  } else {
    const seo = resolveLandingSeo({
      slug,
      profile,
      landingTitle: landing.title,
      stats: finalized.stats,
      landingEvents: landing.events,
    });
    // CMS overrides when present; иначе шаблон resolveLandingSeo (с реальной ценой).
    const cmsTitle = String(landing.seoTitle || '').trim();
    const cmsDescription = String(landing.seoDescription || '').trim();
    title = pageTitle(cmsTitle || seo.title);
    shareTitle = cmsTitle.includes('Дайбилет')
      ? cmsTitle
      : seo.title.includes('Дайбилет')
        ? seo.title
        : `${title} | Дайбилет`;
    description = appendRealPriceToDescription(
      cmsDescription || seo.description || landing.subtitle || '',
      cmsDescription ? priceFrom : null,
    );
  }

  const image = landing.imageUrl || resolveLandingCardImage(slug);

  return {
    title: cityName ? { absolute: title } : title,
    description: description || undefined,
    alternates: {
      canonical,
    },
    robots: robotsForListingIndexability(indexDecision.indexable),
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path: canonical,
      image,
    }),
  };
}

export async function LandingRoutePage({ pathname }: { pathname: string }) {
  const route = resolveLandingRouteFromLocation(pathname);
  if (!route) notFound();

  const slug = canonicalLandingSlug(route.landingSlug);
  const payload = await fetchLandingPageDto(slug, route.citySlug);
  if (!payload?.landing) notFound();

  // No searchParams on server: keeps revalidate/ISR (s-maxage). Genre from URL on client.
  const finalized = finalizeLandingPayload(payload, slug, route.citySlug);
  const canonical = landingCategoryHref(slug, route.citySlug);
  const offerCount = finalized.stats?.events ?? finalized.sessions?.length ?? 0;
  const thinRelatedSessions = route.citySlug
    ? await loadThinRelatedCardSessions({
        landingSlug: slug,
        citySlug: route.citySlug,
        offerCount,
        excludeSessions: finalized.sessions,
      })
    : [];
  const jsonLdBlocks = buildLandingPageJsonLd({
    landingSlug: slug,
    citySlug: route.citySlug,
    landingTitle: finalized.landing.title,
    canonicalPath: canonical,
    sessions: finalized.sessions,
  });

  return (
    <SiteLayout>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`landing-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <LandingPageView
        slug={slug}
        citySlug={route.citySlug}
        initialPayload={finalized}
        thinRelatedSessions={thinRelatedSessions}
      />
    </SiteLayout>
  );
}
