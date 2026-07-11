import type { Metadata } from 'next';

import { MyOrdersPageView } from '@/components/MyOrdersPage.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Проверить заказ | Дайбилет',
  description: 'Проверка статуса заказа и билета по номеру из письма-подтверждения. Регистрация не требуется.',
};

export default function MyOrdersPage() {
  return (
    <SiteLayout>
      <MyOrdersPageView />
    </SiteLayout>
  );
}
