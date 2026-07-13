import type { Metadata } from 'next';

import { PrivacyPageContent } from '@/components/trust/PrivacyPageContent';
import { TrustPageShell } from '@/components/trust/TrustPageShell';

export const metadata: Metadata = {
  title: 'Конфиденциальность',
  description:
    'Пользовательское соглашение и политика конфиденциальности персональных данных на сайте Дайбилет',
};

export default function PrivacyPage() {
  return (
    <TrustPageShell>
      <PrivacyPageContent />
    </TrustPageShell>
  );
}
