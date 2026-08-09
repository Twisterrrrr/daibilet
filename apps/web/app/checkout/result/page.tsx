import type { Metadata } from 'next';

import { CheckoutResultPageView } from '@/components/CheckoutResultPage.client';
import { SiteLayout } from '@/components/SiteLayout';

type PageProps = {
  searchParams: Promise<{ order?: string | string[] }>;
};

export const metadata: Metadata = {
  title: 'Статус заказа',
  description: 'Статус оплаты и билеты заказа Дайбилет.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawOrder = Array.isArray(params.order) ? params.order[0] : params.order;
  const orderCode = String(rawOrder || '').trim();

  return (
    <SiteLayout>
      <CheckoutResultPageView initialOrderCode={orderCode} />
    </SiteLayout>
  );
}
