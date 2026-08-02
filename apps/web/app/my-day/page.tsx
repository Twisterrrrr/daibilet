import type { Metadata } from 'next';

import { DayRoutePanel } from '@/components/DayRoutePanel.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Собери свой день',
  description: 'Соберите точки города и подберите экскурсии с лучшим покрытием маршрута.',
  robots: { index: false, follow: false },
};

export default function MyDayPage() {
  return (
    <SiteLayout>
      <DayRoutePanel />
    </SiteLayout>
  );
}
