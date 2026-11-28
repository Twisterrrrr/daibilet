import type { Metadata } from 'next';

import { PlacesV2Preview } from '@/components/PlacesV2Preview';
import { SiteLayout } from '@/components/SiteLayout';
import { getCachedVenuesCatalog } from '@/server/cached-public-surfaces';
import '@/lib/env';
import '@/styles/v2-places.css';

export const metadata: Metadata = {
  title: 'Площадки - превью нового дизайна',
  robots: { index: false, follow: false },
  alternates: { canonical: '/places2' },
};

export default async function Places2Page() {
  const raw = await getCachedVenuesCatalog('all', { limit: 30, counts: false }).catch(() => null);
  const venues = raw?.venues ?? [];
  const total = raw?.total ?? venues.length;
  return (
    <SiteLayout chromeVariant="v2">
      <PlacesV2Preview venues={venues} total={total} />
    </SiteLayout>
  );
}