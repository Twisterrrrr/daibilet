import type { Metadata } from 'next';

import { HelpPageView } from '@/components/HelpPage.client';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import { helpFaqJsonLd } from '@/data/help-faq';

export const metadata: Metadata = {
  title: 'Помощь',
  description:
    'Ответы на частые вопросы: покупка билетов, возвраты, статусы заказов, как получить билет, льготы и другие вопросы.',
};

export default function HelpPage() {
  return (
    <>
      <JsonLdScripts blocks={[helpFaqJsonLd()]} idPrefix="help-jsonld" />
      <SiteLayout>
        <HelpPageView />
      </SiteLayout>
    </>
  );
}
