import type { Metadata } from 'next';

import { CheckoutAdmissionPageView } from '@/components/CheckoutAdmissionPage.client';
import { SiteLayout } from '@/components/SiteLayout';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Оформление входного билета',
  description: 'Оформление входного билета через Daibilet checkout.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutAdmissionPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <SiteLayout>
      <CheckoutAdmissionPageView slug={slug} />
    </SiteLayout>
  );
}
