import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';
import { Suspense } from 'react';

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

  // Keep page body in Suspense fallback — SelectedCityProvider uses useSearchParams and
  // would otherwise replace the whole shell (including home/catalog) with an empty spacer.
  const shell = (header: React.ReactNode) => (
    <div className="flex min-h-screen flex-col bg-background">
      {header}
      <main className="flex-1">{children}</main>
      <SiteFooter destinations={destinations} />
    </div>
  );

  return (
    <SiteProviders>
      <Suspense fallback={shell(<div aria-hidden="true" className="site-header-spacer" />)}>
        <SelectedCityProvider destinations={destinations}>
          {shell(<SiteHeader destinations={destinations} />)}
        </SelectedCityProvider>
      </Suspense>
    </SiteProviders>
  );
}
