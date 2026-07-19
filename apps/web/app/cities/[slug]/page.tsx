import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CityPageView } from '@/components/CityPageView.client';
import { CityPageViewEditorial } from '@/components/CityPageViewEditorial.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { inCityPrepositional } from '@/lib/city-declension';
import { buildCityFaqItems, buildCitySeoText } from '@/lib/city-faq';
import { resolveCityHubTemplate } from '@/lib/city-hub-template';
import { buildCityHubSeoTitle, buildCityHubSeoTitleCore } from '@/lib/city-hub-seo';
import { evaluateCityIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { pageTitle, routeOpenGraph } from '@/lib/seo-meta';
import { buildCityPageJsonLd } from '@/lib/structured-data';
import { buildPublicCityDto } from '@daibilet/backend/public-read';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const cityIn = inCityPrepositional(city.name);
  // Живая дата в title (MSK); admin seoTitle без даты не перекрывает паттерн хаба.
  const hubTitle = buildCityHubSeoTitleCore(city.name);
  const hubTitleFull = buildCityHubSeoTitle(city.name);

  return {
    title: pageTitle(hubTitle),
    description: city.seoDescription || `События и экскурсии ${cityIn}`,
    alternates: { canonical: path },
    robots: robotsForIndexability(decision.indexable),
    openGraph: routeOpenGraph(path, {
      title: hubTitleFull,
    }),
  };
}

export default async function CityPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const decodedSlug = decodeURIComponent(slug);
  const payload = await buildPublicCityDto(decodedSlug);
  if (!payload?.city) notFound();

  const faqItems = buildCityFaqItems(payload);
  const seoText = buildCitySeoText(payload);
  const jsonLdBlocks = buildCityPageJsonLd(payload);
  const hubTemplate = resolveCityHubTemplate({
    slug: decodedSlug,
    hubQuery: query.hub,
  });
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
      <View slug={decodedSlug} initialPayload={payload} faqItems={faqItems} seoText={seoText} />
    </SiteLayout>
  );
}
