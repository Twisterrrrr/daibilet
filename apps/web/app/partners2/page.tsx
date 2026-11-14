import type { Metadata } from 'next';

import { PartnershipPageContent } from '@/components/trust/PartnershipPageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';
import { catalogSocialStats } from '@/lib/catalog-social-stats';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

export const metadata: Metadata = {
  title: 'Реклама и сотрудничество - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/partners2' },
};

export default async function Partners2Page() {
  let cities = 0;
  let events = 0;
  let venues = 0;

  try {
    const payload = await withSoftTimeout(
      getCachedDestinations(),
      900,
      { generatedAt: new Date(0).toISOString(), destinations: [] },
      'partners2-destinations',
    );
    const stats = catalogSocialStats(payload?.destinations ?? []);
    cities = stats.places;
    events = stats.events;
    venues = stats.venues;
  } catch {
    // Floors from PartnershipPageContent remain.
  }

  return (
    <SiteLayout chromeVariant="v2">
      <div className={`trust-v2 ${fontUnbounded.variable}`}>
        <PartnershipPageContent cities={cities} events={events} venues={venues} />
      </div>
    </SiteLayout>
  );
}