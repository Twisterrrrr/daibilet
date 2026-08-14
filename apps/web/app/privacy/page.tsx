import type { Metadata } from 'next';

import { PrivacyPageContent } from '@/components/trust/PrivacyPageContent';
import { TrustPageShell } from '@/components/trust/TrustPageShell';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

const TITLE = 'Конфиденциальность - политика и пользовательское соглашение';
const DESCRIPTION =
  'Пользовательское соглашение и политика конфиденциальности персональных данных на сайте Дайбилет.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/privacy',
  }),
};

export default function PrivacyPage() {
  return (
    <TrustPageShell>
      <PrivacyPageContent />
    </TrustPageShell>
  );
}
