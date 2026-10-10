import type { Metadata } from 'next';

import { CheckoutTicketView } from '@/components/CheckoutTicketPage.client';
import { SiteLayout } from '@/components/SiteLayout';

type Props = {
  params: Promise<{ publicCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicCode } = await params;
  const code = decodeURIComponent(publicCode || '').trim();
  return {
    title: code ? `Билет №${code}` : 'Билет',
    description: 'Электронный билет Дайбилет - код заказа и QR для входа.',
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutTicketPage({ params }: Props) {
  const { publicCode } = await params;
  const code = decodeURIComponent(publicCode || '').trim();

  return (
    <SiteLayout>
      <CheckoutTicketView publicCode={code} />
    </SiteLayout>
  );
}
