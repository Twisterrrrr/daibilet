import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordPageView } from '@/components/ResetPasswordPage.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = { title: 'Восстановление пароля' };

export default function ResetPasswordPage() {
  return <SiteLayout><Suspense fallback={<div className="container-page py-16">Загрузка...</div>}><ResetPasswordPageView /></Suspense></SiteLayout>;
}
