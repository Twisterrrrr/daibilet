import type { Metadata } from 'next';

import { SiteLayout } from '@/components/SiteLayout';
import { PartnershipPageContent } from '@/components/trust/PartnershipPageContent';
import { catalogSocialStats } from '@/lib/catalog-social-stats';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

const TITLE = 'Реклама и сотрудничество';
const DESCRIPTION =
  'Реклама и партнёрство с Дайбилет: подключение площадок к афише, «Мой день», спонсорство подборок, спецпроекты в блоге и форма заявки.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/partners' },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/partners',
  }),
};

export default async function PartnersPage() {
  let cities = 0;
  let events = 0;
  let venues = 0;

  try {
    const payload = await withSoftTimeout(
      getCachedDestinations(),
      900,
      { generatedAt: new Date(0).toISOString(), destinations: [] },
      'partners-destinations',
    );
    const stats = catalogSocialStats(payload?.destinations ?? []);
    cities = stats.places;
    events = stats.events;
    venues = stats.venues;
  } catch {
    // Keep marketing floors from PartnershipPageContent.
  }

  return (
    <SiteLayout>
      <PartnershipPageContent cities={cities} events={events} venues={venues} />
    </SiteLayout>
  );
}
