import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LandingPageView } from '@/components/LandingPageView.client';
import { SiteLayout } from '@/components/SiteLayout';
import { getSeasonalLanding } from '@/data/seasonal-landings';
import '@/lib/env';
import type { LandingProfileKind } from '@/lib/landing-copy';
import { hasSeoListingEditorial } from '@/data/seo-listing-texts';
import { resolveLandingCityName } from '@/lib/landing-city';
import { resolveCityCases } from '@/lib/city-declension';
import {
  canonicalLandingSlug,
  isBridgesNightLandingSlug,
  isRiverCruisesLandingSlug,
  isRiverPartyLandingSlug,
} from '@/lib/landing-constants';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { resolveLandingFaqItems } from '@/lib/landing-faq-items';
import {
  landingCategoryHref,
  resolveLandingBoundCitySlug,
  resolveLandingRouteFromLocation,
} from '@/lib/landing-routes';
import { resolveLandingSeo } from '@/lib/landing-seo';
import {
  appendRealPriceToDescription,
  buildCategoryCityListingMeta,
  robotsForListingIndexability,
} from '@/lib/seo-listing-meta';
import { isLandingRouteIndexable } from '@/lib/landing-indexability';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { getLandingSeo } from '@/lib/seo/get-landing-seo';
import { isPodborkiSeoPilotCitySlug } from '@/lib/podborki-city-seo';
import { buildFaqPageJsonLd, buildLandingPageJsonLd } from '@/lib/structured-data';
import { fetchLandingPageDto, finalizeLandingPayload } from '@/server/landing-page';
import { loadThinRelatedCardSessions } from '@/server/landing-thin-related';
import { findSeoOverride } from '@/server/seo-override';
import { NewYearLandingPage } from '../../app/new-year-ux-preview/landing-page';
import { loadNewYearLandingData } from '../../app/new-year-ux-preview/new-year-landing-data';
import { loadThematicLandingData } from '../../app/new-year-ux-preview/thematic-landing-data';
import { ThematicLandingPage } from '../../app/new-year-ux-preview/thematic-landing-page';

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
  if (slug === 'new-year') {
    const resolved = await loadNewYearLandingData(route.citySlug || null);
    if (!resolved) notFound();
    const geoName = resolved.geo.city || resolved.geo.region;
    const seo = resolveLandingSeo({
      slug,
      profile: 'seasonal',
      landingTitle: 'Новогодние мероприятия',
      cityName: geoName,
      stats: { events: resolved.data.total, priceFrom: resolved.data.priceFrom },
    });
    const title = geoName
      ? `Новый год 2027 в ${resolveCityCases(geoName).prepositional}: афиша и билеты | Дайбилет`
      : 'Новый год 2027 в России: афиша мероприятий и билеты | Дайбилет';
    const canonical = landingCategoryHref(slug, route.citySlug);
    const indexable = isLandingRouteIndexable({
      landingSlug: slug,
      citySlugForSeo: route.citySlug || null,
      offers: resolved.data.total,
      hasEditorialSeoText: Boolean(route.citySlug && hasSeoListingEditorial(slug, route.citySlug)),
    });
    const description = seo.description;
    return {
      title: { absolute: title },
      description,
      alternates: { canonical },
      robots: robotsForListingIndexability(indexable),
      ...buildShareMetadata({
        title,
        description,
        path: canonical,
        image: resolveLandingCardImage(slug),
      }),
    };
  }
  if (slug === 'concerts-genre' || slug === 'family-kids') {
    const theme = slug;
    const resolved = await loadThematicLandingData(theme, route.citySlug || null);
    if (!resolved) notFound();
    const geoName = resolved.geo.city || resolved.geo.region;
    const geoCase = geoName ? resolveCityCases(geoName).prepositional || geoName : null;
    const canonical = landingCategoryHref(slug, route.citySlug);
    const isConcerts = theme === 'concerts-genre';
    const title = isConcerts
      ? geoCase ? `Концерты в ${geoCase}: афиша, расписание и билеты | Дайбилет` : 'Концерты в России: афиша, расписание и билеты | Дайбилет'
      : geoCase ? `Куда сходить с детьми в ${geoCase}: афиша и билеты | Дайбилет` : 'Куда сходить с детьми: мероприятия, афиша и билеты | Дайбилет';
    const description = isConcerts
      ? `Афиша концертов${geoCase ? ` в ${geoCase}` : ' в России'}: рок, поп, джаз, классическая музыка и камерные выступления. Расписание и билеты онлайн.`
      : `Детские спектакли, цирк, интерактивные шоу, мастер-классы, музеи и развлечения для всей семьи${geoCase ? ` в ${geoCase}` : ' в городах России'}. Выбирайте город, возраст и дату.`;
    const indexable = isLandingRouteIndexable({
      landingSlug: slug,
      citySlugForSeo: route.citySlug || null,
      offers: resolved.data.total,
      hasEditorialSeoText: Boolean(route.citySlug && hasSeoListingEditorial(slug, route.citySlug)),
    });
    return {
      title: { absolute: title },
      description,
      alternates: { canonical },
      robots: robotsForListingIndexability(indexable),
      ...buildShareMetadata({ title, description, path: canonical, image: resolveLandingCardImage(slug) }),
    };
  }
  const seoCitySlug =
    route.citySlug || resolveLandingBoundCitySlug(slug) || null;
  const payload = await fetchLandingPageDto(slug, route.citySlug, { revalidateSeconds: 3600 });
  if (!payload?.landing) notFound();

  const finalized = finalizeLandingPayload(payload, slug, route.citySlug);
  const landing = finalized.landing;
  const canonical = landingCategoryHref(slug, route.citySlug);
  const cityName = resolveLandingCityName(route.citySlug || seoCitySlug);
  const offers = finalized.stats?.events ?? 0;
  const priceFrom = finalized.stats?.priceFrom ?? null;
  const dbOverride =
    seoCitySlug && isPodborkiSeoPilotCitySlug(seoCitySlug)
      ? await findSeoOverride(seoCitySlug, slug)
      : null;
  const matrixSeo =
    seoCitySlug && isPodborkiSeoPilotCitySlug(seoCitySlug)
      ? getLandingSeo({ citySlug: seoCitySlug, landingSlug: slug, dbOverride })
      : null;
  const hasOverrideSeo = Boolean(
    matrixSeo && (matrixSeo.source === 'override' || matrixSeo.source === 'template'),
  );
  const isIndexable = isLandingRouteIndexable({
    landingSlug: slug,
    citySlugForSeo: seoCitySlug,
    offers,
    hasEditorialSeoText: Boolean(dbOverride?.customText),
  });
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
    if (hasOverrideSeo && matrixSeo) {
      title = pageTitle(matrixSeo.title);
      shareTitle = matrixSeo.title.includes('Дайбилет')
        ? matrixSeo.title
        : `${title} | Дайбилет`;
      description = matrixSeo.description;
    } else {
      title = seo.title;
      description = listingMeta.description;
      shareTitle = seo.title;
    }
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
    robots: robotsForListingIndexability(isIndexable),
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
  if (slug === 'new-year') {
    const newYearPage = await NewYearLandingPage({ geoSlug: route.citySlug || null });
    if (newYearPage) return newYearPage;
    notFound();
  }
  if (slug === 'concerts-genre' || slug === 'family-kids') {
    const page = await ThematicLandingPage({ theme: slug, geoSlug: route.citySlug || null });
    if (page) return page;
    notFound();
  }
  const seoCitySlug =
    route.citySlug || resolveLandingBoundCitySlug(slug) || null;
  const payload = await fetchLandingPageDto(slug, route.citySlug, { revalidateSeconds: 3600 });
  if (!payload?.landing) notFound();

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
  const faq = buildFaqPageJsonLd(resolveLandingFaqItems({
    slug,
    profile: resolveLandingProfileKind(slug),
    citySlug: route.citySlug,
    blocks: finalized.blocks || [],
  }));
  if (faq) jsonLdBlocks.push(faq);

  const dbOverride =
    seoCitySlug && isPodborkiSeoPilotCitySlug(seoCitySlug)
      ? await findSeoOverride(seoCitySlug, slug)
      : null;
  const matrixSeo =
    seoCitySlug && isPodborkiSeoPilotCitySlug(seoCitySlug)
      ? getLandingSeo({ citySlug: seoCitySlug, landingSlug: slug, dbOverride })
      : null;

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
        seoOverrideHtml={matrixSeo?.seoText || null}
        seoOverrideHeading={matrixSeo?.h1 || null}
      />
    </SiteLayout>
  );
}
