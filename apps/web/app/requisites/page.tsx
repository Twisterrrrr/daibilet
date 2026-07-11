import type { Metadata } from 'next';

import { RequisitesPageContent } from '@/components/trust/RequisitesPageContent';
import { TrustPageShell } from '@/components/trust/TrustPageShell';

export const metadata: Metadata = {
  title: 'Реквизиты | Дайбилет',
  description: 'Реквизиты Дайбилет для заключения договоров и бухгалтерских документов',
};

export default function RequisitesPage() {
  return (
    <TrustPageShell>
      <RequisitesPageContent />
    </TrustPageShell>
  );
}
