import { SiteLayout } from '@/components/SiteLayout';
import { landingCategoryHref } from '@/lib/landing-routes';
import { buildBreadcrumbListJsonLd, buildLandingItemListJsonLd } from '@/lib/structured-data';
import type { PreviewTheme } from './preview-format';
import { NewYearUxPreview } from './preview.client';
import { loadThematicLandingData } from './thematic-landing-data';

export async function ThematicLandingPage({ theme, geoSlug }: { theme: Exclude<PreviewTheme, 'new-year'>; geoSlug?: string | null }) {
  const resolved = await loadThematicLandingData(theme, geoSlug);
  if (!resolved) return null;
  const canonicalPath = landingCategoryHref(theme, geoSlug);
  const landingName = theme === 'concerts-genre' ? 'Концерты' : 'Куда сходить с детьми';
  const currentGeo = resolved.geo.city || resolved.geo.region;
  const structuredData = [
    buildBreadcrumbListJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Подборки', path: '/podborki' },
      { name: landingName, path: landingCategoryHref(theme) },
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
      name: currentGeo ? `${landingName}: ${currentGeo}` : `${landingName} в России`,
    }),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

  return (
    <SiteLayout hideHeader>
      {structuredData.map((item, index) => <script key={`thematic-landing-jsonld-${index}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />)}
      <NewYearUxPreview initialData={resolved.data} initialCity={resolved.geo.city} initialRegion={resolved.geo.region} errorMessage={null} theme={theme} />
    </SiteLayout>
  );
}
