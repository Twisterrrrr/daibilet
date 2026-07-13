import type { Metadata } from 'next';

import { LegalPageContent } from '@/components/trust/LegalPageContent';
import { TrustPageShell } from '@/components/trust/TrustPageShell';

export const metadata: Metadata = {
  title: 'Правовая информация',
  description:
    'Возврат билетов, рассылка, персональные данные, cookie, правообладателям, способы оплаты, реквизиты и контакты',
};

export default function LegalPage() {
  return (
    <TrustPageShell>
      <LegalPageContent />
    </TrustPageShell>
  );
}
