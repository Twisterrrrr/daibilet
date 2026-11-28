import type { Metadata } from 'next';

import { RequisitesPageContent } from '@/components/trust/RequisitesPageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Реквизиты - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/requisites2' },
};

export default function Page() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className={`trust-v2 ${fontUnbounded.variable}`}>
        <RequisitesPageContent />
      </div>
    </SiteLayout>
  );
}