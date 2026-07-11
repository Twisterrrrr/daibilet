import type { Metadata } from 'next';

import { OfferPageContent } from '@/components/trust/OfferPageContent';
import { TrustPageShell } from '@/components/trust/TrustPageShell';

export const metadata: Metadata = {
  title: 'Оферта | Дайбилет',
  description:
    'Договор-оферта на оказание услуг по размещению и реализации билетов через платформу «Дайбилет»',
};

export default function OfferPage() {
  return (
    <TrustPageShell>
      <OfferPageContent />
    </TrustPageShell>
  );
}
