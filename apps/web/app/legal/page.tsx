import type { Metadata } from 'next';

import { LegalPageContent } from '@/components/trust/LegalPageContent';
import { TrustPageShell } from '@/components/trust/TrustPageShell';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

const TITLE = 'Правовая информация - возврат, оплата и реквизиты';
const DESCRIPTION =
  'Возврат билетов, рассылка, персональные данные, cookie, правообладателям, способы оплаты, реквизиты и контакты Дайбилет.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/legal' },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/legal',
  }),
};

export default function LegalPage() {
  return (
    <TrustPageShell>
      <LegalPageContent />
    </TrustPageShell>
  );
}
