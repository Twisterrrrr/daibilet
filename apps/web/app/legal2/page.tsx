import type { Metadata } from 'next';

import { LegalPageContent } from '@/components/trust/LegalPageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Правовая информация - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/legal2' },
};

export default function Page() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className={`trust-v2 ${fontUnbounded.variable}`}>
        <LegalPageContent />
      </div>
    </SiteLayout>
  );
}