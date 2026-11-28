import { SiteLayout } from '@/components/SiteLayout';
import { landingCategoryHref } from '@/lib/landing-routes';
import { buildBreadcrumbListJsonLd, buildLandingItemListJsonLd } from '@/lib/structured-data';
import { NewYearUxPreview } from './preview.client';
import { loadNewYearLandingData } from './new-year-landing-data';

/** Reuse the production event selector while resolving the existing geo URL. */
export async function NewYearLandingPage({ geoSlug }: { geoSlug?: string | null }) {
  const resolved = await loadNewYearLandingData(geoSlug);
  if (!resolved) return null;
  const canonicalPath = landingCategoryHref('new-year', geoSlug);
  const currentGeo = resolved.geo.city || resolved.geo.region;
  const structuredData = [
    buildBreadcrumbListJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Подборки', path: '/podborki' },
      { name: 'Новый год', path: '/novyj-god' },
      ...(currentGeo ? [{ name: currentGeo, path: canonicalPath }] : []),
    ]),
    buildLandingItemListJsonLd({
      sessions: resolved.data.items.map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug || event.id,
        sourceSlug: null,
        eventPageSlug: event.eventPageSlug || undefined,
      })),
      canonicalPath,
      name: currentGeo ? `Новогодние мероприятия: ${currentGeo}` : 'Новогодние мероприятия в России',
    }),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

  return (
    <SiteLayout hideHeader>
      {structuredData.map((item, index) => (
        <script key={`new-year-jsonld-${index}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
      <NewYearUxPreview
        initialData={resolved.data}
        initialCity={resolved.geo.city}
        initialRegion={resolved.geo.region}
        errorMessage={null}
      />
    </SiteLayout>
  );
}
