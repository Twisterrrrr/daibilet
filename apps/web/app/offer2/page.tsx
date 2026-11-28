import type { Metadata } from 'next';

import { OfferPageContent } from '@/components/trust/OfferPageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Оферта - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/offer2' },
};

export default function Page() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className={`trust-v2 ${fontUnbounded.variable}`}>
        <OfferPageContent />
      </div>
    </SiteLayout>
  );
}