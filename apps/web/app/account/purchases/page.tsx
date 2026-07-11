import type { Metadata } from 'next';

import { AccountPurchasesPageView } from '@/components/AccountPurchasesPage.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Мои покупки | Дайбилет',
  description: 'История покупок билетов на Дайбилет по email аккаунта.',
};

export default function AccountPurchasesPage() {
  return (
    <SiteLayout>
      <AccountPurchasesPageView />
    </SiteLayout>
  );
}
