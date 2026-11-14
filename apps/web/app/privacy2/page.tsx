import type { Metadata } from 'next';

import { PrivacyPageContent } from '@/components/trust/PrivacyPageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Конфиденциальность - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/privacy2' },
};

export default function Page() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className={`trust-v2 ${fontUnbounded.variable}`}>
        <PrivacyPageContent />
      </div>
    </SiteLayout>
  );
}