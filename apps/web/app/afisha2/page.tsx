import type { Metadata } from 'next';

import { EventsV2Preview } from '@/components/EventsV2Preview';
import { SiteLayout } from '@/components/SiteLayout';
import { mergeBlogCards, type BlogCardDto } from '@/lib/blog-utils';
import { getHomeArticles, getHomeCatalog, getHomeCatalogForCity, getHomeDestinations, getHomeLandings } from '@/server/cached-home-data';
import { matchDestination } from '@/lib/selected-city';
import { loadCityHubData } from '@/lib/city-hub-lazy';
import type { PublicCatalogDto, PublicDestinationDto } from '@daibilet/contracts/public';
import '@/lib/env';
import '@/styles/v2-events.css';

export const metadata: Metadata = {
  title: 'Афиша - превью нового дизайна',
  robots: { index: false, follow: false },
  alternates: { canonical: '/afisha2' },
};

const EMPTY: PublicCatalogDto = {
  items: [],
  total: 0,
  limit: 40,
  offset: 0,
  hasMore: false,
  facets: { cities: [], categories: [], subcategories: [], landings: [], priceSteps: [] },
};

export default async function Afisha2Page({ searchParams }: { searchParams: Promise<{ city?: string | string[] }> }) {
  const params = await searchParams;
  const requestedCity = Array.isArray(params.city) ? params.city[0] : params.city;
  const destinationsPayload = await getHomeDestinations().catch(() => ({ destinations: [] as PublicDestinationDto[] }));
  const selectedCity = matchDestination(destinationsPayload.destinations, requestedCity);
  const citySlug = selectedCity?.slug || selectedCity?.sourceSlug || null;
  const [catalog, cityGuide] = await Promise.all([
    (citySlug ? getHomeCatalogForCity(citySlug) : getHomeCatalog()).catch(() => EMPTY),
    citySlug ? loadCityHubData(citySlug).catch(() => null) : Promise.resolve(null),
  ]);
  const landings = (await getHomeLandings().catch(() => null))?.items ?? [];
  const rawArticles = (await getHomeArticles().catch(() => null))?.articles;
  const articles = mergeBlogCards((rawArticles as BlogCardDto[] | null) ?? null);
  return (
    <SiteLayout chromeVariant="v2">
      <EventsV2Preview catalog={catalog} landings={landings} articles={articles} destinations={destinationsPayload.destinations} citySlug={citySlug} cityName={selectedCity?.name ?? null} routes={(cityGuide?.dayRoutePresets ?? []).map(({ id, title }) => ({ id, title }))} />
    </SiteLayout>
  );
}
