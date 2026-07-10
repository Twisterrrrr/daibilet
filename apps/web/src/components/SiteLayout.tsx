import '@/lib/env';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader.client';

export async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { destinations } = await buildPublicDestinationsDto();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter destinations={destinations} />
    </div>
  );
}
