import type { Metadata } from 'next';

import { HelpPageView } from '@/components/HelpPage.client';
import { SiteLayout } from '@/components/SiteLayout';
import { helpFaqJsonLd } from '@/data/help-faq';

export const metadata: Metadata = {
  title: 'Помощь',
  description:
    'Ответы на частые вопросы: покупка билетов, возвраты, статусы заказов, как получить билет, льготы и другие вопросы.',
};

export default function HelpPage() {
  return (
    <SiteLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(helpFaqJsonLd()) }} />
      <HelpPageView />
    </SiteLayout>
  );
}
