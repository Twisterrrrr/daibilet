import type { Metadata } from 'next';

import { SiteLayout } from '@/components/SiteLayout';
import { ContactsPageContent } from '@/components/trust/ContactsPageContent';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

const TITLE = 'Контакты';
const DESCRIPTION =
  'Контакты Дайбилет: email поддержки, реквизиты ИП, адрес и форма обратной связи. Помощь по заказам и возвратам.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/contacts' },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/contacts',
  }),
};

export default function ContactsPage() {
  return (
    <SiteLayout>
      <ContactsPageContent />
    </SiteLayout>
  );
}
