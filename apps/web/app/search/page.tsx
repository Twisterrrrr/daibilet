import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteLayout } from '@/components/SiteLayout';
import { GlobalSearchPage } from '@/components/GlobalSearchPage.client';

export const metadata: Metadata = {
  title: 'Поиск событий, мест и статей | Дайбилет',
  description: 'Найдите событие, площадку, статью или город на Дайбилете.',
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <SiteLayout>
      <Suspense fallback={<div className="container-page min-h-[60vh] py-10" aria-busy="true" />}>
        <GlobalSearchPage />
      </Suspense>
    </SiteLayout>
  );
}
