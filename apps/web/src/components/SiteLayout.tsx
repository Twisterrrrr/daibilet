import '@/lib/env';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';

export async function SiteLayout({ children }: { children: React.ReactNode }) {
  let destinations: PublicDestinationDto[] = [];
  try {
    const payload = await buildPublicDestinationsDto();
    destinations = payload?.destinations ?? [];
  } catch {
    // SSR/build without DB — footer city links stay empty until runtime with DB.
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter destinations={destinations} />
    </div>
  );
}
