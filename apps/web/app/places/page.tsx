import type { Metadata } from 'next';

import { HeroLayout } from '@/components/HeroLayout';
import { PlacesHubView } from '@/components/PlacesHubView.client';
import { SiteLayout } from '@/components/SiteLayout';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

const TITLE = 'Места';
const DESCRIPTION =
  'Площадки с афишей и локации для маршрута: музеи, театры, парки, набережные и точки сбора на Дайбилет.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/places' },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/places',
  }),
};

export const revalidate = 3600;

/**
 * Umbrella IA entry «Места». Does not replace `/venues` or `/locations` entity URLs.
 */
export default function PlacesIndexPage() {
  return (
    <SiteLayout>
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Места' }]}
        title="Места"
        description="Куда сходить в городе: площадки с билетами и точки для прогулки. Выберите тип - карточки остаются на привычных адресах."
        tone="light"
        className="bg-white"
      />
      <PlacesHubView />
    </SiteLayout>
  );
}
