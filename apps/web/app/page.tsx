import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';

export const metadata: Metadata = {
  title: 'Дайбилет — экскурсии, музеи и билеты',
  description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
};

export const revalidate = PUBLIC_PAGE_REVALIDATE;

export default function HomePage() {
  return (
    <SiteLayout>
      <HomePageContent />
    </SiteLayout>
  );
}
