import type { Metadata } from 'next';

import { DayRoutePanel } from '@/components/DayRoutePanel.client';
import { SiteLayout } from '@/components/SiteLayout';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

/** Core title without brand - layout template adds `| Дайбилет` (~60 chars with brand). */
const MY_DAY_TITLE = 'Мой день - собери маршрут из мест, музеев и событий';
const MY_DAY_DESCRIPTION =
  'Соберите маршрут дня в городе: места, музеи и события с билетами. Сохраните план прогулки и поделитесь ссылкой с друзьями.';
const MY_DAY_OG_IMAGE = '/images/og/my-day.jpg';

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
    image: MY_DAY_OG_IMAGE,
    imageWidth: 1200,
    imageHeight: 630,
  }),
};

export default function MyDayPage() {
  return (
    <SiteLayout footerVariant="compact">
      <div className="min-h-[calc(100vh-var(--site-header-height))] bg-[#E6E8EC]">
        <DayRoutePanel />
      </div>
    </SiteLayout>
  );
}
