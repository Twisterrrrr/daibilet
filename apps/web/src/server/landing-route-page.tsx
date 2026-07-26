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

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

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
  if (!route) return { title: pageTitle('Подборка') };

  const slug = canonicalLandingSlug(route.landingSlug);
  const payload = await fetchLandingPageDto(slug);
  if (!payload?.landing) return { title: pageTitle('Подборка') };

  const genre = undefined;
  const finalized = finalizeLandingPayload(payload, slug, route.citySlug, genre);
  const landing = finalized.landing;
  const canonical = landingCategoryHref(slug, route.citySlug);
  const cityName = resolveLandingCityName(route.citySlug);
  const offers = finalized.stats?.events ?? 0;
  const priceFrom = finalized.stats?.priceFrom ?? null;
  const indexDecision = evaluateListingIndexability({ offers });
  const profile = resolveLandingProfileKind(slug);

  let title: string;
  let description: string | undefined;
  let shareTitle: string;

  if (cityName) {
    const listingMeta = buildCategoryCityListingMeta({
      landingSlug: slug,
      cityName,
      fallbackTitle: landing.title,
      priceFrom,
    });
    title = listingMeta.title;
    description = listingMeta.description;
    shareTitle = listingMeta.title;
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
        genre={genre}
        thinRelatedSessions={thinRelatedSessions}
      />
    </SiteLayout>
  );
}
