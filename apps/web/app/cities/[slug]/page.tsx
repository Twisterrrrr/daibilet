import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CityPageView } from '@/components/CityPageView.client';
import { CityPageViewEditorial } from '@/components/CityPageViewEditorial.client';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { RegionPageView } from '@/components/RegionPageView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildCityFaqItems, buildCitySeoText } from '@/lib/city-faq';
import { pickCityHubArticles } from '@/lib/city-hub-articles';
import { resolveCityHubTemplate } from '@/lib/city-hub-template';
import {
  buildCityHubSeoDescription,
  buildCityHubSeoTitle,
  buildCityHubSeoTitleCore,
} from '@/lib/city-hub-seo';
import { isSeoExpansionCity } from '@/lib/city-declension';
import { resolveCityImage } from '@/lib/city-images';
import {
  evaluateCityIndexability,
  evaluateRegionIndexability,
  robotsForIndexability,
  robotsForRegionIndexability,
} from '@/lib/hub-indexability';
import {
  buildRegionHubSeoDescription,
  buildRegionHubSeoTitle,
  buildRegionHubSeoTitleCore,
} from '@/lib/region-hub-seo';
import { hubBlogCardExcerpt, mergeBlogCards } from '@/lib/blog-utils';
import { safeNotFound } from '@/lib/safe-not-found';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { buildCityPageJsonLd } from '@/lib/structured-data';
import {
  getCachedCityHubArticles,
  listTopCitySlugsForSsg,
  loadCityDto,
} from '@/server/cached-city-data';
import { loadCityAdmissionBlock } from '@/server/finance-projection-client';

export const revalidate = 300;
/** Allow on-demand ISR for slugs not prebuilt. */
export const dynamicParams = true;

/** Secondary hub blocks must not hang HTML (articles/blog). */
const CITY_SECONDARY_TIMEOUT_MS = 3000;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function cityPerfEnabled() {
  return process.env.DAIBILET_PERF_LOG === '1';
}

function cityPerfMark(label: string, startedAt: number, extra?: Record<string, unknown>) {
  if (!cityPerfEnabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[perf:city] ${label}: ${Date.now() - startedAt}ms${payload}`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          if (cityPerfEnabled()) console.log(`[perf:city] ${label}: timeout ${ms}ms → fallback`);
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Prebuild top-N city hubs when CITY_SSG_TOP_N>0. Default 0 (MSK memory-safe).
 * Rest fill via ISR on first hit (unstable_cache + dynamicParams).
 */
export async function generateStaticParams() {
  const slugs = await listTopCitySlugsForSsg();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadCityDto(decodeURIComponent(slug));
  if (loaded.kind === 'miss') {
    safeNotFound();
  }
  if (loaded.kind === 'unavailable') {
    return {
      title: pageTitle('Город временно недоступен'),
      robots: { index: false, follow: false },
    };
  }

  const payload = loaded.payload;
  const city = payload.city;
  const path = city.canonicalPath || `/cities/${city.slug}`;

  if (city.type === 'region') {
    const childEventTotal = (payload.childCities || []).reduce(
      (sum, item) => sum + (Number(item.eventCount) || 0),
      0,
    );
    const decision = evaluateRegionIndexability({
      childEventTotal: childEventTotal || payload.stats?.events || city.events || 0,
      isIndexable: city.isIndexable,
    });
    const hubTitle = buildRegionHubSeoTitleCore(city.name);
    const hubTitleFull = buildRegionHubSeoTitle(city.name);
    const description = city.seoDescription || buildRegionHubSeoDescription(city.name);
    const imagePath = resolveCityImage({
      slug: city.slug,
      sourceSlug: city.sourceSlug,
      name: city.name,
      heroImageUrl: city.heroImageUrl,
    });

    return {
      title: pageTitle(hubTitle),
      description,
      alternates: { canonical: path },
      robots: robotsForRegionIndexability(decision.indexable),
      ...buildShareMetadata({
        title: hubTitleFull,
        description,
        path,
        image: imagePath,
      }),
    };
  }

  const decision = evaluateCityIndexability({
    events: payload.stats?.events ?? city.events ?? 0,
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    isIndexable: city.isIndexable,
  });

  // Date baked at cache build time (unstable_cache 300s) - do not call connection()/Date live.
  const hubTitle = buildCityHubSeoTitleCore(city.name);
  const hubTitleFull = buildCityHubSeoTitle(city.name);
  const description = city.seoDescription || buildCityHubSeoDescription(city.name);
  const imagePath = resolveCityImage({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
    heroImageUrl: city.heroImageUrl,
  });
  const expansionAbsolute = isSeoExpansionCity({
    name: city.name,
    slug: city.slug,
    sourceSlug: city.sourceSlug,
  });

  return {
    title: expansionAbsolute ? { absolute: hubTitle } : pageTitle(hubTitle),
    description,
    alternates: { canonical: path },
    robots: robotsForIndexability(decision.indexable),
    ...buildShareMetadata({
      title: hubTitleFull,
      description,
      path,
      image: imagePath,
    }),
  };
}

/**
 * Do not await searchParams (?hub= / ?city=) - forces dynamic no-store on every city hub.
 * Region child-city H1 (`?city=vyborg`) is client-side in RegionPageView (Suspense).
 * Template comes from CITY_HUB_EDITORIAL_SLUGS allowlist; Next Data Cache via getCached*.
 * Articles are secondary: timeout hides related, never blocks HTML for 60s.
 */
export default async function CityPage({ params }: PageProps) {
  const pageStartedAt = Date.now();
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const cityStartedAt = Date.now();
  const loaded = await loadCityDto(decodedSlug);
  cityPerfMark('city-dto', cityStartedAt, {
    kind: loaded.kind,
    sessions: loaded.kind === 'ok' ? loaded.payload.sessions?.length ?? 0 : 0,
    venues: loaded.kind === 'ok' ? loaded.payload.venues?.length ?? 0 : 0,
    landings: loaded.kind === 'ok' ? loaded.payload.landings?.length ?? 0 : 0,
  });
  if (loaded.kind === 'miss') {
    safeNotFound();
  }
  if (loaded.kind === 'unavailable') {
    return <CityUnavailablePage slug={decodedSlug} />;
  }

  const payload = loaded.payload;

  if (payload.city.type === 'region') {
    const jsonLdBlocks = buildCityPageJsonLd(payload);
    cityPerfMark('page-total', pageStartedAt, { slug: decodedSlug, region: true });
    return (
      <>
        <JsonLdScripts blocks={jsonLdBlocks} idPrefix="region-jsonld" />
        <SiteLayout>
          <Suspense fallback={<RegionPageFallback />}>
            <RegionPageView slug={decodedSlug} initialPayload={payload} />
          </Suspense>
        </SiteLayout>
      </>
    );
  }

  const articlesStartedAt = Date.now();
  const admissionStartedAt = Date.now();
  const [articlesResult, admissionResult] = await Promise.allSettled([
    withTimeout(
      getCachedCityHubArticles(decodedSlug).catch(() => null),
      CITY_SECONDARY_TIMEOUT_MS,
      null,
      'articles',
    ).then((value) => {
      cityPerfMark('articles', articlesStartedAt, { count: value?.articles?.length ?? 0 });
      return value;
    }),
    withTimeout(
      loadCityAdmissionBlock(decodedSlug).catch(() => null),
      CITY_SECONDARY_TIMEOUT_MS,
      null,
      'admission',
    ).then((value) => {
      cityPerfMark('admission', admissionStartedAt, { count: value?.items?.length ?? 0 });
      return value;
    }),
  ]);

  const articlesPayload = articlesResult.status === 'fulfilled' ? articlesResult.value : null;
  const admission = admissionResult.status === 'fulfilled' ? admissionResult.value : null;

  const faqStartedAt = Date.now();
  const faqItems = buildCityFaqItems(payload);
  const seoText = buildCitySeoText(payload);
  const jsonLdBlocks = buildCityPageJsonLd(payload);
  cityPerfMark('faq-seo-jsonld', faqStartedAt, { jsonLd: jsonLdBlocks.length });

  const hubTemplate = resolveCityHubTemplate({ slug: decodedSlug });
  const blogCards = mergeBlogCards(articlesPayload?.articles || null).map((post) => ({
    ...post,
    excerpt: hubBlogCardExcerpt(post.slug, post.excerpt),
  }));
  const hubArticles = pickCityHubArticles(
    {
      slug: payload.city.slug,
      sourceSlug: payload.city.sourceSlug,
      name: payload.city.name,
    },
    blogCards,
  );
  const View = hubTemplate === 'editorial' ? CityPageViewEditorial : CityPageView;
  cityPerfMark('page-total', pageStartedAt, {
    slug: decodedSlug,
    hubArticles: Object.values(hubArticles).reduce((sum, list) => sum + list.length, 0),
  });

  return (
    <>
      <JsonLdScripts blocks={jsonLdBlocks} idPrefix="city-jsonld" />
      <SiteLayout>
        <View
          slug={decodedSlug}
          initialPayload={payload}
          faqItems={faqItems}
          seoText={seoText}
          hubArticles={hubArticles}
          admission={admission}
        />
      </SiteLayout>
    </>
  );
}

function CityUnavailablePage({ slug }: { slug: string }) {
  return (
    <SiteLayout>
      <main className="container-page py-16">
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Город временно недоступен
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Не удалось загрузить афишу для <span className="font-medium text-slate-800">{slug}</span>.
          Обновите страницу через минуту — данные могли не успеть подгрузиться после перезапуска
          сервиса.
        </p>
      </main>
    </SiteLayout>
  );
}

function RegionPageFallback() {
  return (
    <div className="container-page py-16">
      <div className="h-10 w-64 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-24 max-w-2xl animate-pulse rounded bg-slate-50" />
    </div>
  );
}
