import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginPageView } from '@/components/LoginPage.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Вход | Дайбилет',
  description: 'Вход в личный кабинет Дайбилет для просмотра истории покупок.',
};

export default function LoginPage() {
  return (
    <SiteLayout>
      <Suspense fallback={<div className="container-page py-16 text-sm text-slate-500">Загрузка…</div>}>
        <LoginPageView />
      </Suspense>
    </SiteLayout>
  );
}
