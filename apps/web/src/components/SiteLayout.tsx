import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { Suspense } from 'react';

import { ScrollToTopButton } from '@/components/ScrollToTop.client';
import { SiteChromeSkeleton } from '@/components/SiteChromeSkeleton';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';
import { SelectedCityProvider } from '@/components/SelectedCityProvider.client';
import { SiteProviders } from '@/components/SiteProviders.client';
import { slimDestinationsForLayout } from '@/lib/ssr-lean-payloads';
import { matchDestination } from '@/lib/selected-city';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

/** Global chrome must not block first byte on cold destinations rebuild. */
const LAYOUT_DESTINATIONS_TIMEOUT_MS = 900;

const EMPTY_DESTINATIONS = {
  generatedAt: new Date(0).toISOString(),
  destinations: [] as PublicDestinationDto[],
};

export async function SiteLayout({
  children,
  footerVariant = 'default',
  initialCity = null,
}: {
  children: React.ReactNode;
  footerVariant?: 'default' | 'compact';
  /**
   * Cookie/SSR city from pages that are already dynamic (home).
   * Do NOT read the request cookie store here: SiteLayout is inlined into ISR hubs/PDPs
   * (`revalidate` + notFound). Dynamic request APIs during static generation
   * become HTTP 500 (DYNAMIC_SERVER_USAGE) on /events/[slug], /cities/*, venues.
   */
  initialCity?: string | null;
}) {
  let destinations: PublicDestinationDto[] = [];
  try {
    // Next Data Cache (not raw buildPublicDestinationsDto): SiteLayout is inlined
    // into every page RSC, so soft nav used to rebuild destinations on cold workers.
    // Hard timeout: empty header/footer cities beat hung TTFB on every HTML page.
    const payload = await withSoftTimeout(
      getCachedDestinations(),
      LAYOUT_DESTINATIONS_TIMEOUT_MS,
      EMPTY_DESTINATIONS,
      'site-layout-destinations',
    );
    // Drop per-city category facet trees before they enter every page RSC flight
    // (SelectedCityProvider + header + footer). hubTags stay for chips/cards.
    destinations = slimDestinationsForLayout(payload?.destinations ?? []);
  } catch {
    // SSR/build without DB — footer city links stay empty until runtime with DB.
  }

  const resolvedInitialCity = matchDestination(destinations, initialCity)?.name || null;

  // SelectedCityProvider isolates useSearchParams in an inner Suspense hole so
  // header + page can SSR. Header stays outside the content Suspense so the
  // hamburger (checkbox disclosure) is never replaced by a dead skeleton span.
  return (
    <SiteProviders>
      <SelectedCityProvider destinations={destinations} initialCity={resolvedInitialCity}>
        <div className="flex min-h-screen flex-col bg-background">
          <div className="print:hidden">
            <SiteHeader destinations={destinations} />
          </div>
          <Suspense fallback={<SiteChromeSkeleton variant="page" omitHeader />}>
            <main className="flex-1">{children}</main>
          </Suspense>
          <div className="print:hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
            <SiteFooter destinations={destinations} variant={footerVariant} />
            <ScrollToTopButton />
          </div>
        </div>
      </SelectedCityProvider>
    </SiteProviders>
  );
}
