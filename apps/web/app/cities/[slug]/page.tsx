import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CityPageView } from '@/components/CityPageView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { inCityPrepositional } from '@/lib/city-declension';
import { buildCityFaqItems, buildCitySeoText } from '@/lib/city-faq';
import { evaluateCityIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { pageTitle, routeOpenGraph } from '@/lib/seo-meta';
import { buildCityPageJsonLd } from '@/lib/structured-data';
import { buildPublicCityDto } from '@daibilet/backend/public-read';

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

  const cityIn = inCityPrepositional(city.name);
  const defaultTitle = `События ${cityIn} на сегодня`;

  return {
    title: pageTitle(city.seoTitle || defaultTitle),
    description: city.seoDescription || `События и экскурсии ${cityIn}`,
    alternates: { canonical: path },
    robots: robotsForIndexability(decision.indexable),
    openGraph: routeOpenGraph(path, {
      title: city.seoTitle || `${defaultTitle} | Дайбилет`,
    }),
  };
}

export default async function CityPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await buildPublicCityDto(decodeURIComponent(slug));
  if (!payload?.city) notFound();

  const faqItems = buildCityFaqItems(payload);
  const seoText = buildCitySeoText(payload);
  const jsonLdBlocks = buildCityPageJsonLd(payload);

  return (
    <SiteLayout>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`city-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <CityPageView
        slug={decodeURIComponent(slug)}
        initialPayload={payload}
        faqItems={faqItems}
        seoText={seoText}
      />
    </SiteLayout>
  );
}
