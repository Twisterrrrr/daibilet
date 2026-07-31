import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { Suspense } from 'react';

import { ScrollToTopButton } from '@/components/ScrollToTop.client';
import { SiteChromeSkeleton } from '@/components/SiteChromeSkeleton';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';
import { SelectedCityProvider } from '@/components/SelectedCityProvider.client';
import { SiteProviders } from '@/components/SiteProviders.client';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

export async function SiteLayout({ children }: { children: React.ReactNode }) {
  let destinations: PublicDestinationDto[] = [];
  try {
    // Next Data Cache (not raw buildPublicDestinationsDto): SiteLayout is inlined
    // into every page RSC, so soft nav used to rebuild destinations on cold workers.
    const payload = await getCachedDestinations();
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
            <SiteHeader destinations={destinations} />
            <main className="flex-1">{children}</main>
            <SiteFooter destinations={destinations} />
            <ScrollToTopButton />
          </div>
        </SelectedCityProvider>
      </Suspense>
    </SiteProviders>
  );
}
