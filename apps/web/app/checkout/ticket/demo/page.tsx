import type { Metadata } from 'next';

import { CheckoutTicketView } from '@/components/CheckoutTicketPage.client';
import { SiteLayout } from '@/components/SiteLayout';
import { buildDemoBuyerTicketOrder } from '@/lib/buyer-checkout';

export const metadata: Metadata = {
  title: 'Демо: полный электронный билет',
  description: 'Превью карточки билета Дайбилет со всеми полями для визуальной проверки.',
  robots: { index: false, follow: false },
};

export default function CheckoutTicketDemoPage() {
  const demoOrder = buildDemoBuyerTicketOrder();

  return (
    <SiteLayout>
      <CheckoutTicketView
        publicCode={demoOrder.publicCode}
        demoOrder={demoOrder}
        demoBanner="Демо-превью полного билета: все поля заполнены фикстурой, без обращения к finance. Не является реальным заказом."
      />
    </SiteLayout>
  );
}
