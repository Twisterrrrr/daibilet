import type { Metadata } from 'next';

import { ContactsPageContent } from '@/components/trust/ContactsPageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Контакты - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/contacts2' },
};

export default function Page() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className={`trust-v2 ${fontUnbounded.variable}`}>
        <ContactsPageContent />
      </div>
    </SiteLayout>
  );
}