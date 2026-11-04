import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CheckoutResultView } from '@/components/CheckoutResultPage.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Заказ оформлен',
  description: 'Статус оплаты и код заказа на Дайбилет.',
  robots: { index: false, follow: false },
};

export default function CheckoutResultPage() {
  return (
    <SiteLayout>
      <Suspense
        fallback={
          <div className="container-page flex min-h-[40vh] items-center justify-center text-slate-500">
            Загружаем статус заказа…
          </div>
        }
      >
        <CheckoutResultView />
      </Suspense>
    </SiteLayout>
  );
}
