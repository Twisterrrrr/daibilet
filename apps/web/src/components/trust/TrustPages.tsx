import { TrustPageShell } from '@/components/trust/TrustPageShell';
import { LegalPageContent } from '@/components/trust/LegalPageContent';
import { OfferPageContent } from '@/components/trust/OfferPageContent';
import { PrivacyPageContent } from '@/components/trust/PrivacyPageContent';
import { RequisitesPageContent } from '@/components/trust/RequisitesPageContent';

export function LegalTrustPage() {
  return (
    <TrustPageShell
      title="Правовая информация"
      description="Возврат билетов, рассылка, персональные данные, cookie, правообладателям, способы оплаты, реквизиты и контакты"
    >
      <LegalPageContent />
    </TrustPageShell>
  );
}

export function PrivacyTrustPage() {
  return (
    <TrustPageShell
      title="Конфиденциальность"
      description="Пользовательское соглашение и политика конфиденциальности персональных данных на сайте Дайбилет"
    >
      <PrivacyPageContent />
    </TrustPageShell>
  );
}

export function OfferTrustPage() {
  return (
    <TrustPageShell
      title="Оферта"
      description="Договор-оферта на оказание услуг по размещению и реализации билетов через платформу «Дайбилет»"
    >
      <OfferPageContent />
    </TrustPageShell>
  );
}

export function RequisitesTrustPage() {
  return (
    <TrustPageShell
      title="Реквизиты"
      description="Реквизиты Дайбилет для заключения договоров и бухгалтерских документов"
    >
      <RequisitesPageContent />
    </TrustPageShell>
  );
}
