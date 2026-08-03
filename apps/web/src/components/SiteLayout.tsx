import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { Suspense } from 'react';

import { ScrollToTopButton } from '@/components/ScrollToTop.client';
import { SiteChromeSkeleton } from '@/components/SiteChromeSkeleton';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';
import { SelectedCityProvider } from '@/components/SelectedCityProvider.client';
import { SiteProviders } from '@/components/SiteProviders.client';
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
}: {
  children: React.ReactNode;
  footerVariant?: 'default' | 'compact';
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
    destinations = payload?.destinations ?? [];
  } catch {
    // SSR/build without DB — footer city links stay empty until runtime with DB.
  }

  // SelectedCityProvider isolates useSearchParams in an inner Suspense hole so
  // header + page can SSR. Fallback keeps brand chrome if anything still suspends
  // (never empty spacer — that caused the 2-3s blank open on daibilet.ru).
  return (
    <SiteProviders>
      <Suspense fallback={<SiteChromeSkeleton variant="page" />}>
        <SelectedCityProvider destinations={destinations}>
          <div className="flex min-h-screen flex-col bg-background">
            <div className="print:hidden">
              <SiteHeader destinations={destinations} />
            </div>
            <main className="flex-1">{children}</main>
            <div className="print:hidden">
              <SiteFooter destinations={destinations} variant={footerVariant} />
              <ScrollToTopButton />
            </div>
          </div>
        </SelectedCityProvider>
      </Suspense>
    </SiteProviders>
  );
}
