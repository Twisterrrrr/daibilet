import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';
import { Suspense } from 'react';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';
import { SiteProviders } from '@/components/SiteProviders.client';

export async function SiteLayout({ children }: { children: React.ReactNode }) {
  let destinations: PublicDestinationDto[] = [];
  try {
    const payload = await buildPublicDestinationsDto();
    destinations = payload?.destinations ?? [];
  } catch {
    // SSR/build without DB — footer city links stay empty until runtime with DB.
  }

  return (
    <SiteProviders>
      <div className="flex min-h-screen flex-col bg-background">
        <Suspense fallback={<div aria-hidden="true" className="site-header-spacer" />}>
          <SiteHeader destinations={destinations} />
        </Suspense>
        <main className="flex-1">{children}</main>
        <SiteFooter destinations={destinations} />
      </div>
    </SiteProviders>
  );
}
