import type { Metadata } from 'next';

import { DayRoutePanel } from '@/components/DayRoutePanel.client';
import { SiteLayout } from '@/components/SiteLayout';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

/** Core title without brand - layout template adds `| Дайбилет` (~60 chars with brand). */
const MY_DAY_TITLE = 'Собери маршрут на день: места, музеи и события';
const MY_DAY_DESCRIPTION =
  'Соберите свой маршрут на день в городе. Выберите музеи, места и события, сохраните готовый план прогулки и поделитесь ссылкой.';

export const metadata: Metadata = {
  title: pageTitle(MY_DAY_TITLE),
  description: MY_DAY_DESCRIPTION,
  // Keep closed until page has crawlable SEO content for guests (not empty city prompt).
  robots: { index: false, follow: false },
  alternates: { canonical: '/my-day' },
  ...buildShareMetadata({
    title: `${MY_DAY_TITLE} | Дайбилет`,
    description: MY_DAY_DESCRIPTION,
    path: '/my-day',
  }),
};

export default function MyDayPage() {
  return (
    <SiteLayout footerVariant="compact">
      <DayRoutePanel />
    </SiteLayout>
  );
}
