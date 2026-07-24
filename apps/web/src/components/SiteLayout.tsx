import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';
import { Suspense } from 'react';

import { ScrollToTopButton } from '@/components/ScrollToTop.client';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';
import { SelectedCityProvider } from '@/components/SelectedCityProvider.client';
import { SiteProviders } from '@/components/SiteProviders.client';

export async function SiteLayout({ children }: { children: React.ReactNode }) {
  let destinations: PublicDestinationDto[] = [];
  try {
    const payload = await buildPublicDestinationsDto();
    destinations = payload?.destinations ?? [];
  } catch {
    // SSR/build without DB — footer city links stay empty until runtime with DB.
  }

  // Suspense wraps SelectedCityProvider (useSearchParams). Fallback must NOT render
  // page children — HomeHero etc. call useSelectedCity and will throw outside the provider
  // during static generation / suspend.
  return (
    <SiteProviders>
      <Suspense fallback={<div aria-hidden="true" className="site-header-spacer" />}>
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
