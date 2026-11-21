import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CitiesIndexPreview } from '@/components/CitiesIndexPreview.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

export const metadata: Metadata = {
  title: 'Города России - превью нового дизайна',
  robots: { index: false, follow: false },
  alternates: { canonical: '/cities2' },
};

const DESTINATIONS_TIMEOUT_MS = 2500;

export default async function CitiesPreviewPage() {
  let destinations: Awaited<ReturnType<typeof getCachedDestinations>>['destinations'] = [];
  try {
    const payload = await withSoftTimeout(
      getCachedDestinations(),
      DESTINATIONS_TIMEOUT_MS,
      { generatedAt: new Date(0).toISOString(), destinations: [] },
      'cities2-preview-destinations',
    );
    destinations = payload.destinations ?? [];
  } catch {
    destinations = [];
  }

  return (
    <SiteLayout chromeVariant="v2">
      <Suspense fallback={null}>
        <CitiesIndexPreview destinations={destinations} />
      </Suspense>
    </SiteLayout>
  );
}