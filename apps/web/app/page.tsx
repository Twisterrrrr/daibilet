import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: {
    absolute: 'Дайбилет — экскурсии, музеи и билеты',
  },
  description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
  openGraph: {
    url: 'https://daibilet.ru/',
  },
};

export const revalidate = 300;

export default function HomePage() {
  return (
    <SiteLayout>
      <HomePageContent />
    </SiteLayout>
  );
}
