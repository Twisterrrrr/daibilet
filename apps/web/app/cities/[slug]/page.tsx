import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CityPageView } from '@/components/CityPageView.client';
import { CityPageViewEditorial } from '@/components/CityPageViewEditorial.client';
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
import { evaluateCityIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { mergeBlogCards } from '@/lib/blog-utils';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { buildCityPageJsonLd } from '@/lib/structured-data';
import { buildPublicArticlesListDto, buildPublicCityDto } from '@daibilet/backend/public-read';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await buildPublicCityDto(decodeURIComponent(slug));
  if (!payload?.city) return { title: pageTitle('Город не найден') };

  const city = payload.city;
  const path = city.canonicalPath || `/cities/${city.slug}`;
  const decision = evaluateCityIndexability({
    events: payload.stats?.events ?? city.events ?? 0,
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    isIndexable: city.isIndexable,
  });

  // Живая дата в title (MSK) для Москвы/СПб; Казань/Екб - шаблон с годом.
  // admin seoTitle без даты не перекрывает паттерн хаба.
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
 * Do not await searchParams (?hub=) - forces dynamic no-store on every city hub.
 * Template comes from CITY_HUB_EDITORIAL_SLUGS allowlist; in-memory DTO cache is 5m.
 */
export default async function CityPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const [payload, articlesPayload] = await Promise.all([
    buildPublicCityDto(decodedSlug),
    buildPublicArticlesListDto({
      citySlug: decodedSlug,
      includeBroad: true,
      limit: 40,
    }).catch(() => null),
  ]);
  if (!payload?.city) notFound();

  const faqItems = buildCityFaqItems(payload);
  const seoText = buildCitySeoText(payload);
  const jsonLdBlocks = buildCityPageJsonLd(payload);
  const hubTemplate = resolveCityHubTemplate({ slug: decodedSlug });
  const blogCards = mergeBlogCards(articlesPayload?.articles || null);
  const hubArticles = pickCityHubArticles(
    {
      slug: payload.city.slug,
      sourceSlug: payload.city.sourceSlug,
      name: payload.city.name,
    },
    blogCards,
  );
  const View = hubTemplate === 'editorial' ? CityPageViewEditorial : CityPageView;

  return (
    <SiteLayout>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`city-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <View
        slug={decodedSlug}
        initialPayload={payload}
        faqItems={faqItems}
        seoText={seoText}
        hubArticles={hubArticles}
      />
    </SiteLayout>
  );
}
